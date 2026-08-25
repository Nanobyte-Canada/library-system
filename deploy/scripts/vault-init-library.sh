#!/usr/bin/env bash
# deploy/scripts/vault-init-library.sh
# One-time setup: creates library-deploy policy + AppRole on existing Vault server.
# Usage: bash deploy/scripts/vault-init-library.sh
set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.nanobyte.ca}"

echo "=== Library Vault Initialization ==="
echo "Vault: ${VAULT_ADDR}"
echo ""

# --- 1. Create library-deploy policy ---
echo "[1/4] Creating 'library-deploy' policy..."
cat <<EOF | vault policy write library-deploy -
path "secret/data/library/*" {
  capabilities = ["read"]
}

path "secret/metadata/library/*" {
  capabilities = ["read", "list"]
}
EOF
echo "  Policy 'library-deploy' created."

# --- 2. Create AppRole role ---
echo ""
echo "[2/4] Creating AppRole role 'library-deploy'..."
vault write auth/approle/role/library-deploy \
    token_policies="library-deploy" \
    token_ttl=10m \
    token_max_ttl=30m \
    secret_id_ttl=0
echo "  AppRole role created (TTL=10m, Max TTL=30m)."

# --- 3. Fetch role_id and generate secret_id ---
echo ""
echo "[3/4] Fetching role_id and generating secret_id..."
ROLE_ID=$(vault read -field=role_id auth/approle/role/library-deploy/role-id)
SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/library-deploy/secret-id)

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
echo "  3. Populate secrets:"
echo ""
echo "     vault kv put secret/library/common/POSTGRES_USER=library_user"
echo "     vault kv put secret/library/common/POSTGRES_PASSWORD='<password>'"
echo "     vault kv put secret/library/common/JWT_SIGNING_KEY='<key>'"
echo "     vault kv put secret/library/common/SMTP_HOST=smtp.gmail.com"
echo "     vault kv put secret/library/common/SMTP_PORT=587"
echo "     vault kv put secret/library/common/SMTP_USER='<email>'"
echo "     vault kv put secret/library/common/SMTP_PASS='<app-password>'"
echo "     vault kv put secret/library/common/MAIL_FROM='<email>'"
echo "     vault kv put secret/library/prod/PUBLIC_URL=https://library.nanobyte.ca"
echo "     vault kv put secret/library/uat/PUBLIC_URL=https://uatlibrary.nanobyte.ca"
echo ""
echo "=== Vault Initialization Complete ==="
