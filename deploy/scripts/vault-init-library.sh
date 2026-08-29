#!/usr/bin/env bash
# deploy/scripts/vault-init-library.sh
# One-time setup: creates library-deploy policy + AppRole on existing Vault server.
# Runs vault commands inside the portfolio-vault container via docker exec.
# Usage: bash deploy/scripts/vault-init-library.sh
set -euo pipefail

VAULT_CONTAINER="${VAULT_CONTAINER:-portfolio-vault}"
VAULT_CMD="docker exec -e VAULT_TOKEN=${VAULT_TOKEN} ${VAULT_CONTAINER}"

echo "=== Library Vault Initialization ==="
echo "Vault container: ${VAULT_CONTAINER}"
echo ""

# --- 0. Verify prerequisites ---
echo "[0/4] Checking prerequisites..."

if ! docker inspect --format='{{.State.Running}}' "${VAULT_CONTAINER}" 2>/dev/null | grep -q "true"; then
    echo "ERROR: Container '${VAULT_CONTAINER}' is not running."
    echo "Start it first: docker compose up -d portfolio-vault"
    exit 1
fi
echo "  Container is running."

if [ -z "${VAULT_TOKEN:-}" ]; then
    echo "ERROR: VAULT_TOKEN not set."
    echo "Usage: VAULT_TOKEN=<root_token> bash deploy/scripts/vault-init-library.sh"
    echo ""
    echo "If you just initialized Vault, use the root token from the init output."
    echo "If Vault was already initialized, use your admin token."
    exit 1
fi
echo "  VAULT_TOKEN is set."

# --- 1. Create library-deploy policy ---
echo ""
echo "[1/4] Creating 'library-deploy' policy..."
${VAULT_CMD} sh -c 'cat <<POLICY | vault policy write library-deploy -
path "secret/data/library/*" {
  capabilities = ["read"]
}

path "secret/metadata/library/*" {
  capabilities = ["read", "list"]
}
POLICY'
echo "  Policy 'library-deploy' created."

# --- 2. Create AppRole role ---
echo ""
echo "[2/4] Creating AppRole role 'library-deploy'..."
${VAULT_CMD} vault write auth/approle/role/library-deploy \
    token_policies="library-deploy" \
    token_ttl=10m \
    token_max_ttl=30m \
    secret_id_ttl=0
echo "  AppRole role created (TTL=10m, Max TTL=30m)."

# --- 3. Fetch role_id and generate secret_id ---
echo ""
echo "[3/4] Fetching role_id and generating secret_id..."
ROLE_ID=$(${VAULT_CMD} vault read -field=role_id auth/approle/role/library-deploy/role-id)
SECRET_ID=$(${VAULT_CMD} vault write -field=secret_id -f auth/approle/role/library-deploy/secret-id)

echo ""
echo "=========================================="
echo "  APPROLE CREDENTIALS"
echo "  SAVE THESE SECURELY!"
echo "=========================================="
echo "  Role ID:   ${ROLE_ID}"
echo "  Secret ID: ${SECRET_ID}"
echo "=========================================="
echo ""

# --- 4. Instructions ---
echo "[4/4] Next steps:"
echo "  1. Add VAULT_ROLE_ID=${ROLE_ID} to GitHub repo secrets"
echo "  2. Add VAULT_SECRET_ID=${SECRET_ID} to GitHub repo secrets"
echo "  3. Populate secrets (run inside vault container):"
echo ""
echo "     docker exec -e VAULT_TOKEN=<root_token> ${VAULT_CONTAINER} \\"
echo "       vault kv put secret/library/common/POSTGRES_USER=library_user \\"
echo "       POSTGRES_PASSWORD='<password>' \\"
echo "       JWT_SIGNING_KEY='<key>' \\"
echo "       SMTP_HOST=smtp.gmail.com \\"
echo "       SMTP_PORT=587 \\"
echo "       SMTP_USER='<email>' \\"
echo "       SMTP_PASS='<app-password>' \\"
echo "       MAIL_FROM='<email>'"
echo ""
echo "     docker exec -e VAULT_TOKEN=<root_token> ${VAULT_CONTAINER} \\"
echo "       vault kv put secret/library/prod/PUBLIC_URL=https://library.nanobyte.ca"
echo ""
echo "     docker exec -e VAULT_TOKEN=<root_token> ${VAULT_CONTAINER} \\"
echo "       vault kv put secret/library/uat/PUBLIC_URL=https://uatlibrary.nanobyte.ca"
echo ""
echo "=== Vault Initialization Complete ==="
