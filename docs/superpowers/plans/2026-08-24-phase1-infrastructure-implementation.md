# Phase 1: Infrastructure Replication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker containerization, GitHub Actions CI/CD, Vault secrets, and deploy infrastructure mirroring the pc repo's home-server pattern.

**Architecture:** Library-system gets its own Dockerfiles (api 2-stage, frontend 3-stage), compose files (local dev, prod, UAT deploy), GitHub Actions workflows (build + deploy), and deploy scripts (vault-init, backup, db-setup). Shares existing pc Postgres instances — no new Postgres container in deploy stacks.

**Tech Stack:** Docker, GitHub Actions, HashiCorp Vault, Gradle 8.10.2, Kotlin 1.9.25/Spring Boot 3.3.5/JDK 17, Node 20/React 19/Vite, nginx:alpine, postgres:16-alpine

**Spec:** `docs/superpowers/specs/2026-08-24-phase1-infrastructure-design.md`

## Global Constraints

- API uses JDK 17 (`jvmTarget = JVM_17` in `build.gradle.kts`)
- API internal port: 8082 (Spring Boot default)
- Frontend internal port: 80 (nginx)
- GHCR registry: `ghcr.io/nanobyte-canada/library-{api,frontend}`
- Prod ports: Frontend 10100, API 10180
- UAT ports: Frontend 20100, API 20180
- Postgres: shared (prod 15432, UAT 25432) — no container in deploy stacks
- Subdomains: `library.nanobyte.ca` (prod), `uatlibrary.nanobyte.ca` (UAT)
- pc repo patterns used as reference: `/home/sbilakhia/Documents/dev/repos/pc`

---

## Task 1: API Dockerfile

**Files:**
- Create: `api/Dockerfile`

**Interfaces:**
- Produces: Docker image `library-api` with Spring Boot fat JAR on JDK 17

- [ ] **Step 1: Create API Dockerfile**

```dockerfile
# api/Dockerfile
# Build stage — Gradle dependency cache warm + compile
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Copy Gradle wrapper and build files first (cached layer)
COPY gradle ./gradle
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon || true

# Copy API source
COPY api/ ./api/

# Build fat JAR, skip tests
RUN ./gradlew :api:bootJar --no-daemon -x test

# Runtime stage
FROM eclipse-temurin:17-jre

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash appuser

WORKDIR /app
COPY --from=build /app/api/build/libs/*.jar app.jar

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 2: Validate Dockerfile syntax**

Review manually for syntax correctness — no missing FROM, COPY, or RUN directives.

- [ ] **Step 3: Commit**

```bash
git add api/Dockerfile
git commit -m "Add API Dockerfile — 2-stage Gradle build → Temurin JRE 17"
```

---

## Task 2: Frontend Dockerfile + nginx.conf

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Produces: Docker image `library-frontend` with nginx serving SPA, proxying `/api/` to `api:8082`

- [ ] **Step 1: Create nginx.conf**

```nginx
# frontend/nginx.conf
server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://api:8082/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health / actuator
    location /actuator/ {
        proxy_pass http://api:8082;
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Nginx health endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

- [ ] **Step 2: Create Frontend Dockerfile**

```dockerfile
# frontend/Dockerfile
# Development stage — hot-reload
FROM node:20-alpine AS development
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage — Vite production build
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production stage — nginx SPA
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf
git commit -m "Add frontend Dockerfile + nginx config — 3-stage dev/build/prod"
```

---

## Task 3: Add Micrometer Prometheus Dependency

**Files:**
- Modify: `api/build.gradle.kts`

**Interfaces:**
- Produces: `/actuator/prometheus` endpoint for Prometheus scraping

- [ ] **Step 1: Add micrometer-registry-prometheus dependency**

In `api/build.gradle.kts`, add inside the `dependencies` block:

```kotlin
    implementation("io.micrometer:micrometer-registry-prometheus")
```

- [ ] **Step 2: Verify compilation**

Run: `./gradlew :api:compileKotlin` (with JDK at `/tmp/opencode/jdk21` if system JDK unavailable)
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add api/build.gradle.kts
git commit -m "Add micrometer-registry-prometheus for /actuator/prometheus"
```

---

## Task 4: Vault Init Script

**Files:**
- Create: `deploy/scripts/vault-init-library.sh`

**Interfaces:**
- Produces: `library-deploy` Vault policy + AppRole, prints `VAULT_ROLE_ID` + `VAULT_SECRET_ID`

- [ ] **Step 1: Create vault-init-library.sh**

```bash
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
```

- [ ] **Step 2: Make executable and validate syntax**

Run: `chmod +x deploy/scripts/vault-init-library.sh && bash -n deploy/scripts/vault-init-library.sh`
Expected: no output (syntax valid)

- [ ] **Step 3: Commit**

```bash
git add deploy/scripts/vault-init-library.sh
git commit -m "Add vault-init-library.sh — policy + AppRole setup"
```

---

## Task 5: Create Library DB Script

**Files:**
- Create: `deploy/scripts/create-library-db.sh`

**Interfaces:**
- Produces: `library` database in existing prod + UAT Postgres instances

- [ ] **Step 1: Create create-library-db.sh**

```bash
#!/usr/bin/env bash
# deploy/scripts/create-library-db.sh
# One-time: creates `library` database in existing Postgres instances.
# Run on home server before first deploy.
# Usage: bash deploy/scripts/create-library-db.sh
set -euo pipefail

echo "=== Creating library databases ==="

echo "Creating 'library' database in prod Postgres (port 15432)..."
if docker exec prod-postgres psql -U postgres -c "CREATE DATABASE library;" 2>/dev/null; then
    echo "  Database 'library' created in prod."
else
    echo "  Database 'library' already exists in prod (or container not running)."
fi

echo ""
echo "Creating 'library' database in UAT Postgres (port 25432)..."
if docker exec uat-postgres psql -U postgres -c "CREATE DATABASE library;" 2>/dev/null; then
    echo "  Database 'library' created in UAT."
else
    echo "  Database 'library' already exists in UAT (or container not running)."
fi

echo ""
echo "=== Done. Flyway migrations will run on first API startup. ==="
```

- [ ] **Step 2: Make executable and validate syntax**

Run: `chmod +x deploy/scripts/create-library-db.sh && bash -n deploy/scripts/create-library-db.sh`
Expected: no output (syntax valid)

- [ ] **Step 3: Commit**

```bash
git add deploy/scripts/create-library-db.sh
git commit -m "Add create-library-db.sh — one-time DB creation script"
```

---

## Task 6: Backup Script

**Files:**
- Create: `deploy/scripts/backup.sh`

**Interfaces:**
- Produces: Nightly pg_dump of `library` database from existing Postgres containers

- [ ] **Step 1: Create backup.sh**

```bash
#!/usr/bin/env bash
# deploy/scripts/backup.sh
# Nightly backup of library database from existing Postgres containers.
# Cron: 0 3 * * * /opt/library/scripts/backup.sh >> /opt/library/backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="/opt/library/backups"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAILY_RETENTION=7
WEEKLY_RETENTION=30

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

backup_db() {
    local env="$1"
    local container="${env}-postgres"

    mkdir -p "${BACKUP_DIR}/${env}/daily" "${BACKUP_DIR}/${env}/weekly"

    local daily_file="${BACKUP_DIR}/${env}/daily/library-${DATE}.sql.gz"

    log "Backing up ${env} library database..."

    docker exec "${container}" pg_dump -U postgres library | gzip > "${daily_file}"

    local size
    size=$(du -h "${daily_file}" | cut -f1)
    log "  Created: ${daily_file} (${size})"

    # Weekly backup on Sundays
    if [ "${DAY_OF_WEEK}" -eq 7 ]; then
        local weekly_file="${BACKUP_DIR}/${env}/weekly/library-${DATE}.sql.gz"
        cp "${daily_file}" "${weekly_file}"
        log "  Weekly backup: ${weekly_file}"
    fi

    # Cleanup
    find "${BACKUP_DIR}/${env}/daily" -name "*.sql.gz" -mtime +${DAILY_RETENTION} -delete
    find "${BACKUP_DIR}/${env}/weekly" -name "*.sql.gz" -mtime +${WEEKLY_RETENTION} -delete
}

log "=== Starting library database backups ==="

backup_db "prod"
backup_db "uat"

log "=== Library backups complete ==="
```

- [ ] **Step 2: Make executable and validate syntax**

Run: `chmod +x deploy/scripts/backup.sh && bash -n deploy/scripts/backup.sh`
Expected: no output (syntax valid)

- [ ] **Step 3: Commit**

```bash
git add deploy/scripts/backup.sh
git commit -m "Add backup.sh — nightly pg_dump for library databases"
```

---

## Task 7: Local Dev docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: api/Dockerfile (build target `build`), frontend/Dockerfile (target `development`)
- Produces: Local dev stack on ports 8082 (API), 3000 (frontend), 5432 (Postgres)

- [ ] **Step 1: Create root docker-compose.yml**

```yaml
# docker-compose.yml — Local development
services:
  api:
    build:
      context: .
      dockerfile: api/Dockerfile
      target: build
    container_name: library-api
    environment:
      SPRING_PROFILES_ACTIVE: dev
      DB_URL: jdbc:postgresql://postgres:5432/library
      DB_USERNAME: root
      DB_PASSWORD: root
      JWT_SIGNING_KEY: dev-secret-key-change-in-prod
    ports:
      - "8082:8082"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    restart: unless-stopped
    networks:
      - library-network

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      target: development
    container_name: library-frontend
    environment:
      VITE_API_BASE_URL: http://localhost:8082
    ports:
      - "3000:3000"
    depends_on:
      - api
    networks:
      - library-network

  postgres:
    image: postgres:16-alpine
    container_name: library-postgres
    environment:
      POSTGRES_DB: library
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - library-network

volumes:
  postgres_data:

networks:
  library-network:
    driver: bridge
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))"`
Expected: no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "Add root docker-compose.yml — local dev stack"
```

---

## Task 8: Prod Deploy docker-compose.yml

**Files:**
- Create: `deploy/prod/docker-compose.yml`

**Interfaces:**
- Consumes: Prebuilt images from `ghcr.io/nanobyte-canada/library-{api,frontend}:${IMAGE_TAG}`
- Produces: Prod stack on ports 10100 (frontend), 10180 (API), connecting to existing Postgres on 15432

- [ ] **Step 1: Create prod compose file**

```yaml
# deploy/prod/docker-compose.yml — Production deploy
services:
  api:
    image: ghcr.io/nanobyte-canada/library-api:${IMAGE_TAG}
    container_name: prod-library-api
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://host.docker.internal:15432/library
      DB_USERNAME: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SIGNING_KEY: ${JWT_SIGNING_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      MAIL_FROM: ${MAIL_FROM}
    ports:
      - "10180:8082"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: 50m
        max-file: "5"
    networks:
      - prod-library-network

  frontend:
    image: ghcr.io/nanobyte-canada/library-frontend:${IMAGE_TAG}
    container_name: prod-library-frontend
    ports:
      - "10100:80"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: 50m
        max-file: "5"
    networks:
      - prod-library-network

networks:
  prod-library-network:
    driver: bridge
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('deploy/prod/docker-compose.yml'))"`
Expected: no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add deploy/prod/docker-compose.yml
git commit -m "Add prod docker-compose.yml — prebuilt images, shared Postgres"
```

---

## Task 9: UAT Deploy docker-compose.yml

**Files:**
- Create: `deploy/uat/docker-compose.yml`

**Interfaces:**
- Consumes: Prebuilt images from `ghcr.io/nanobyte-canada/library-{api,frontend}:${IMAGE_TAG}`
- Produces: UAT stack on ports 20100 (frontend), 20180 (API), connecting to existing Postgres on 25432

- [ ] **Step 1: Create UAT compose file**

```yaml
# deploy/uat/docker-compose.yml — UAT deploy
services:
  api:
    image: ghcr.io/nanobyte-canada/library-api:${IMAGE_TAG}
    container_name: uat-library-api
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://host.docker.internal:25432/library
      DB_USERNAME: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SIGNING_KEY: ${JWT_SIGNING_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      MAIL_FROM: ${MAIL_FROM}
    ports:
      - "20180:8082"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: 50m
        max-file: "5"
    networks:
      - uat-library-network

  frontend:
    image: ghcr.io/nanobyte-canada/library-frontend:${IMAGE_TAG}
    container_name: uat-library-frontend
    ports:
      - "20100:80"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: 50m
        max-file: "5"
    networks:
      - uat-library-network

networks:
  uat-library-network:
    driver: bridge
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('deploy/uat/docker-compose.yml'))"`
Expected: no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add deploy/uat/docker-compose.yml
git commit -m "Add UAT docker-compose.yml — prebuilt images, shared Postgres"
```

---

## Task 10: Build Workflow (build.yml)

**Files:**
- Create: `.github/workflows/build.yml`

**Interfaces:**
- Consumes: api/Dockerfile, frontend/Dockerfile, all source code
- Produces: CI test gates + ghcr.io image builds on main push

- [ ] **Step 1: Create build.yml**

```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/nanobyte-canada

jobs:
  test-api:
    name: API Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: library_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - uses: gradle/actions/setup-gradle@v4
        with:
          cache-read-only: false

      - name: Run API tests
        run: ./gradlew :api:test :api:compileTestKotlin
        env:
          DB_URL: jdbc:postgresql://localhost:5432/library_test
          DB_USERNAME: test
          DB_PASSWORD: test

  test-frontend:
    name: Frontend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Lint
        run: npm run lint
        working-directory: frontend

      - name: Type check and build
        run: npm run build
        working-directory: frontend

  build-images:
    name: Build & Push Docker Images
    if: github.event_name == 'push'
    needs: [test-api, test-frontend]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set image tag
        id: tag
        run: echo "tag=main-$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push library-api
        uses: docker/build-push-action@v6
        with:
          context: .
          file: api/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}/library-api:${{ steps.tag.outputs.tag }}
            ${{ env.IMAGE_PREFIX }}/library-api:latest
          cache-from: type=gha,scope=library-api
          cache-to: type=gha,mode=max,scope=library-api

      - name: Build and push library-frontend
        uses: docker/build-push-action@v6
        with:
          context: .
          file: frontend/Dockerfile
          target: production
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}/library-frontend:${{ steps.tag.outputs.tag }}
            ${{ env.IMAGE_PREFIX }}/library-frontend:latest
          cache-from: type=gha,scope=library-frontend
          cache-to: type=gha,mode=max,scope=library-frontend

      - name: Post build summary
        run: |
          echo "### Build Complete :white_check_mark:" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "**Tag:** \`${{ steps.tag.outputs.tag }}\`" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "| Image | Tag |" >> "$GITHUB_STEP_SUMMARY"
          echo "|-------|-----|" >> "$GITHUB_STEP_SUMMARY"
          echo "| library-api | ${{ steps.tag.outputs.tag }} |" >> "$GITHUB_STEP_SUMMARY"
          echo "| library-frontend | ${{ steps.tag.outputs.tag }} |" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "Deploy with: \`gh workflow run deploy.yml -f environment=uat -f tag=${{ steps.tag.outputs.tag }}\`" >> "$GITHUB_STEP_SUMMARY"

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "${{ job.status == 'success' && ':white_check_mark:' || ':x:' }} Library build *${{ steps.tag.outputs.tag }}* ${{ job.status }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))"`
Expected: no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "Add build.yml — PR tests + main image build workflow"
```

---

## Task 11: Deploy Workflow (deploy.yml)

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Vault secrets, deploy/prod + deploy/uat docker-compose.yml, GHCR images
- Produces: Deployed library stack on home server with health gate

- [ ] **Step 1: Create deploy.yml**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - uat
          - prod
      tag:
        description: "Image tag to deploy (e.g., main-a1b2c3d or latest)"
        required: true
        type: string

env:
  DEPLOY_PATH: /opt/library
  VAULT_ADDR: https://vault.nanobyte.ca

jobs:
  deploy:
    name: Deploy to ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    steps:
      - name: Validate tag format
        run: |
          if [[ ! "${{ github.event.inputs.tag }}" =~ ^(main-[a-f0-9]{7,}|latest)$ ]]; then
            echo "::error::Invalid tag format. Expected: main-<short-sha> or latest"
            exit 1
          fi

      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Fetch secrets from Vault
        run: |
          ENV="${{ github.event.inputs.environment }}"
          TAG="${{ github.event.inputs.tag }}"

          echo "Authenticating to Vault..."
          VAULT_TOKEN=$(curl -sf \
            --request POST \
            --data "{\"role_id\": \"${{ secrets.VAULT_ROLE_ID }}\", \"secret_id\": \"${{ secrets.VAULT_SECRET_ID }}\"}" \
            "${VAULT_ADDR}/v1/auth/approle/login" | jq -r '.auth.client_token')

          if [ -z "$VAULT_TOKEN" ] || [ "$VAULT_TOKEN" = "null" ]; then
            echo "::error::Failed to authenticate to Vault — received null token"
            exit 1
          fi
          echo "Vault authentication successful"

          # Generate .env from two Vault tiers
          > /tmp/deploy.env

          # Tier 1: Common secrets
          echo "Fetching common secrets..."
          COMMON_JSON=$(curl -sf \
            --header "X-Vault-Token: ${VAULT_TOKEN}" \
            "${VAULT_ADDR}/v1/secret/data/library/common" | jq -r '.data.data // "{}"')
          if [ "$COMMON_JSON" != "{}" ]; then
            echo "$COMMON_JSON" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> /tmp/deploy.env
            echo "Exported $(echo "$COMMON_JSON" | jq -r 'keys | length') keys from library/common"
          fi

          # Tier 2: Environment-specific secrets
          echo "Fetching secrets for environment: ${ENV}..."
          ENV_JSON=$(curl -sf \
            --header "X-Vault-Token: ${VAULT_TOKEN}" \
            "${VAULT_ADDR}/v1/secret/data/library/${ENV}" | jq -r '.data.data // "{}"')
          if [ "$ENV_JSON" != "{}" ]; then
            echo "$ENV_JSON" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> /tmp/deploy.env
            echo "Exported $(echo "$ENV_JSON" | jq -r 'keys | length') keys from library/${ENV}"
          fi

          # Append IMAGE_TAG
          echo "IMAGE_TAG=${TAG}" >> /tmp/deploy.env

          # Validate
          KEY_COUNT=$(wc -l < /tmp/deploy.env)
          echo "Generated .env with ${KEY_COUNT} keys"

          if [ "$KEY_COUNT" -lt 2 ]; then
            echo "::error::Secrets validation failed — expected multiple keys, got ${KEY_COUNT}"
            exit 1
          fi

          echo "Secrets fetched successfully"

      - name: Install cloudflared
        run: |
          curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
          sudo dpkg -i cloudflared.deb

      - name: Configure SSH via Cloudflare Tunnel
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          echo "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts

          cat >> ~/.ssh/config << EOF
          Host library-server
            HostName ${{ secrets.SERVER_HOSTNAME }}
            User deploy
            IdentityFile ~/.ssh/deploy_key
            ProxyCommand cloudflared access ssh --hostname %h
          EOF

      - name: Deploy to ${{ github.event.inputs.environment }}
        run: |
          ENV="${{ github.event.inputs.environment }}"
          TAG="${{ github.event.inputs.tag }}"

          # Copy compose file and .env to server
          echo "Uploading docker-compose.yml and .env to server..."
          scp deploy/${ENV}/docker-compose.yml library-server:${DEPLOY_PATH}/${ENV}/docker-compose.yml
          scp /tmp/deploy.env library-server:${DEPLOY_PATH}/${ENV}/.env

          ssh library-server << REMOTE_SCRIPT
            set -euo pipefail
            cd ${DEPLOY_PATH}/${ENV}

            echo "=== Deploying ${TAG} to ${ENV} ==="

            # Authenticate to GHCR
            GH_PROJECT_TOKEN=\$(grep '^GHCR_TOKEN=' .env | cut -d= -f2- || echo "${{ secrets.GITHUB_TOKEN }}")
            echo "Logging in to GHCR..."
            echo "\$GH_PROJECT_TOKEN" | docker login ghcr.io -u nanobyte-canada --password-stdin

            # Pull new images
            echo "Pulling images..."
            docker compose pull

            # Restart services
            echo "Starting services..."
            docker compose up -d

            # Wait for health checks
            echo "Waiting for health checks..."
            sleep 15

            # Check container status
            echo "Container status:"
            docker compose ps

            # Health gate
            UNHEALTHY=\$(docker compose ps --format json | jq -r 'select(.Health != "healthy" and .Health != "" and .State != "running") | .Name' 2>/dev/null || true)
            if [ -n "\$UNHEALTHY" ]; then
              echo "WARNING: Unhealthy containers: \$UNHEALTHY"
              docker compose logs --tail=50 \$UNHEALTHY
              exit 1
            fi

            echo "=== Deploy complete ==="
          REMOTE_SCRIPT

      - name: Health gate
        run: |
          ENV="${{ github.event.inputs.environment }}"
          PORT=${{ env.ENV == 'prod' && '10180' || '20180' }}
          echo "Checking health on port ${PORT}..."
          for i in $(seq 1 30); do
            STATUS=$(curl -sf "http://localhost:${PORT}/actuator/health" | jq -r '.status' 2>/dev/null || echo "DOWN")
            if [ "$STATUS" = "UP" ]; then
              echo "Health check passed"
              exit 0
            fi
            sleep 10
          done
          echo "Health check failed after 5 minutes"
          exit 1

      - name: Cleanup
        if: always()
        run: rm -f /tmp/deploy.env

      - name: Post deploy summary
        if: success()
        run: |
          echo "### Deploy Successful :rocket:" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Environment:** ${{ github.event.inputs.environment }}" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Tag:** \`${{ github.event.inputs.tag }}\`" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Secrets:** Fetched from Vault" >> "$GITHUB_STEP_SUMMARY"
          echo "- **Triggered by:** ${{ github.actor }}" >> "$GITHUB_STEP_SUMMARY"

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "${{ job.status == 'success' && ':rocket:' || ':x:' }} Library deploy *${{ github.event.inputs.tag }}* to *${{ github.event.inputs.environment }}* ${{ job.status }}\nTriggered by: ${{ github.actor }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
Expected: no output (valid YAML)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add deploy.yml — manual dispatch deploy via Vault + SSH tunnel"
```

---

## Task Summary

| Task | Files | Independent? |
|------|-------|-------------|
| 1. API Dockerfile | `api/Dockerfile` | ✅ |
| 2. Frontend Dockerfile + nginx | `frontend/Dockerfile`, `frontend/nginx.conf` | ✅ |
| 3. Micrometer dependency | `api/build.gradle.kts` | ✅ |
| 4. Vault init script | `deploy/scripts/vault-init-library.sh` | ✅ |
| 5. Create library DB script | `deploy/scripts/create-library-db.sh` | ✅ |
| 6. Backup script | `deploy/scripts/backup.sh` | ✅ |
| 7. Local dev compose | `docker-compose.yml` | Depends on Tasks 1-2 |
| 8. Prod deploy compose | `deploy/prod/docker-compose.yml` | Depends on Tasks 1-2 |
| 9. UAT deploy compose | `deploy/uat/docker-compose.yml` | Depends on Tasks 1-2 |
| 10. Build workflow | `.github/workflows/build.yml` | Depends on Tasks 1-3 |
| 11. Deploy workflow | `.github/workflows/deploy.yml` | Depends on Tasks 7-9 |

**Parallelizable groups:**
- Group A (no deps): Tasks 1, 2, 3, 4, 5, 6 — all can run in parallel
- Group B (after Group A): Tasks 7, 8, 9 — can run in parallel
- Group C (after Group B): Tasks 10, 11 — can run in parallel

## Prerequisites (Manual, One-Time on Home Server)

These are NOT part of this implementation plan — they are manual steps the user runs on the home server:

1. `docker exec prod-postgres psql -U postgres -c "CREATE DATABASE library;"`
2. `docker exec uat-postgres psql -U postgres -c "CREATE DATABASE library;"`
3. Run `vault-init-library.sh` → add `VAULT_ROLE_ID` + `VAULT_SECRET_ID` to GitHub repo secrets
4. Populate Vault: `vault kv put secret/library/common/POSTGRES_USER=...` etc.
5. Add Cloudflare Tunnel routes for `library.nanobyte.ca` and `uatlibrary.nanobyte.ca`
6. Add `deploy/scripts/backup.sh` to crontab (stagger to 3:15 AM)
7. Add Prometheus scrape targets + Uptime-Kuma monitors (after first deploy)
