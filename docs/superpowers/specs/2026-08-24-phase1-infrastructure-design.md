# Phase 1: Infrastructure Replication — Design Spec

## 1. Overview

Replicate the `pc` repo's home-server infrastructure for library-system: Docker containerization, GitHub Actions CI/CD deploying to the home server, HashiCorp Vault secrets, two deployed environments (UAT + prod), containerized React frontend.

**Approach:** Fully Separate Stacks (Approach A). Library gets its own compose files deploying API + Frontend only. No Postgres container — connects to existing pc Postgres instances (prod on port 15432, UAT on port 25432) with a `library` database added to each. Clean separation: library deploy/restart doesn't affect pc.

### Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| P1-1 | Replicate pc patterns exactly | Proven, working infrastructure |
| P1-2 | Ports incremented by 100 from pc | Avoids conflicts, predictable naming |
| P1-3 | Share existing Postgres instances | No extra container; `library` database per environment |
| P1-4 | Subdomains: library.nanobyte.ca / uatlibrary.nanobyte.ca | Matches pc's `uat*` prefix pattern |
| P1-5 | Vault reuses existing server | No new Vault instance needed |

## 2. Repository Layout

```
library-system/
├── .github/workflows/
│   ├── build.yml              # PRs: test api + frontend · push→main: Buildx → ghcr.io
│   └── deploy.yml             # workflow_dispatch(uat|prod, tag) → Vault → render .env → scp → health gate → Slack
├── api/Dockerfile             # 2-stage: gradle dep-warm → temurin JRE 17, non-root, curl healthcheck
├── frontend/Dockerfile        # 3-stage: development / build (VITE_* args) / production (nginx SPA)
├── frontend/nginx.conf        # gzip, security headers, SPA try_files, proxy /api → api:8082
├── docker-compose.yml         # local dev: source builds
└── deploy/
    ├── prod/
    │   └── docker-compose.yml    # prebuilt images, connects to existing prod Postgres (localhost:15432)
    ├── uat/
    │   └── docker-compose.yml    # prebuilt images, connects to existing UAT Postgres (localhost:25432)
    └── scripts/
        ├── create-library-db.sh  # creates `library` database in existing Postgres instances
        ├── vault-init-library.sh # policy library-deploy + AppRole on existing Vault
        └── backup.sh             # nightly pg_dump of `library` db from existing Postgres
```

## 3. Port Allocation

| Service | PC Prod | Library Prod | PC UAT | Library UAT |
|---------|---------|-------------|--------|-------------|
| Frontend (Nginx) | 10000 | **10100** | 20000 | **20100** |
| Backend/API | 10080 | **10180** | 20080 | **20180** |
| PostgreSQL | 15432 | *shared (15432)* | 25432 | *shared (25432)* |
| Vault | 18200 | *shared (18200)* | 18200 | *shared (18200)* |

## 4. Cloudflared Routes

Additions to existing `portfolio-tunnel`:

| Hostname | Target | Purpose |
|----------|--------|---------|
| `library.nanobyte.ca` | `http://localhost:10100` | Library prod frontend |
| `uatlibrary.nanobyte.ca` | `http://localhost:20100` | Library UAT frontend |

API is not exposed directly — frontend Nginx proxies `/api/` requests to the API container internally.

## 5. Dockerfiles

### 5.1 API (`api/Dockerfile`)

2-stage build:

- **Stage 1 (build):** `eclipse-temurin:17-jdk`. Copies Gradle wrapper + build files, warms dependency cache, compiles + builds bootJar, skips tests.
- **Stage 2 (runtime):** `eclipse-temurin:17-jre`. Creates non-root `app` user, copies fat JAR, exposes 8082, curl healthcheck on `/actuator/health`.

### 5.2 Frontend (`frontend/Dockerfile`)

3-stage build:

- **Stage 1 (development):** `node:20-alpine`, `npm ci`, runs `npm run dev` for local hot-reload.
- **Stage 2 (build):** `node:20-alpine`, accepts `VITE_API_BASE_URL` build arg, `npm ci` + `npm run build`.
- **Stage 3 (production):** `nginx:alpine`, copies built assets + custom `nginx.conf`.

### 5.3 Frontend Nginx (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:8082/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 6. Docker Compose Files

### 6.1 Local Dev (`docker-compose.yml`)

Root compose for local development with source builds:

- **api:** Builds from `api/Dockerfile` target `build`, port 8082, connects to local Postgres (port 5432).
- **frontend:** Builds from `frontend/Dockerfile` target `development`, port 3000 (Vite hot-reload).
- **postgres:** `postgres:16-alpine`, port 5432, `library` database, `root/root` credentials.
- Single `library-network` bridge network.

### 6.2 Prod (`deploy/prod/docker-compose.yml`)

Prebuilt image deployment:

- **api:** `ghcr.io/nanobyte-canada/library-api:${IMAGE_TAG}`, host port `10180` → container 8082. `SPRING_PROFILES_ACTIVE=prod`. DB connects to `host.docker.internal:15432/library`.
- **frontend:** `ghcr.io/nanobyte-canada/library-frontend:${IMAGE_TAG}`, host port `10100` → container 80.
- **No Postgres container** — shares existing pc prod Postgres.
- All secrets via environment variables (rendered by deploy workflow from Vault).
- Health checks on both services.
- `restart: unless-stopped`.

### 6.3 UAT (`deploy/uat/docker-compose.yml`)

Same structure as prod with:

| Setting | Prod | UAT |
|---------|------|-----|
| API host port | 10180 | 20180 |
| Frontend host port | 10100 | 20100 |
| DB port | 15432 | 25432 |

## 7. CI/CD Workflows

### 7.1 Build (`build.yml`)

Triggers: PRs to main, pushes to main.

**PR pipeline:**
1. `test-api` job: Ubuntu runner, `postgres:16-alpine` service container (port 5432, `library_test` DB), Java 17 Temurin, Gradle, runs `:api:test :api:compileTestKotlin`.
2. `test-frontend` job: Node 20, `npm ci`, `npm run lint`, `npm run build`.

**Main push pipeline (after tests pass):**
3. `build-images` job: Docker Buildx, pushes to `ghcr.io/nanobyte-canada/library-{api,frontend}` with tags `main-<sha>` + `latest`. GHA layer caching.

### 7.2 Deploy (`deploy.yml`)

Manual dispatch only. Inputs: `environment` (uat|prod), `tag` (image tag).

**Steps:**
1. Checkout code.
2. Vault AppRole login (using `VAULT_ROLE_ID` + `VAULT_SECRET_ID` from GitHub secrets).
3. Render `.env` from Vault: common secrets from `secret/library/common/*`, environment overrides from `secret/library/{env}/*`.
4. Deploy via SSH tunnel: `ssh -o ProxyCommand="cloudflared access ssh --hostname ssh.nanobyte.ca" deploy@ssh.nanobyte.ca` → `docker compose pull && up -d`.
5. Health gate: poll `/actuator/health` for up to 5 minutes.
6. Slack notification (success/failure).

**Rollback:** Re-dispatch with previous tag.

## 8. Vault Integration

### 8.1 Secret Paths

```
secret/library/
├── common/
│   ├── POSTGRES_USER
│   ├── POSTGRES_PASSWORD
│   ├── JWT_SIGNING_KEY
│   ├── SMTP_HOST
│   ├── SMTP_PORT
│   ├── SMTP_USER
│   ├── SMTP_PASS
│   └── MAIL_FROM
└── {env}/
    └── PUBLIC_URL
```

### 8.2 Init Script (`deploy/scripts/vault-init-library.sh`)

Creates `library-deploy` policy (read-only on `secret/data/library/*`) + AppRole on existing Vault server. Outputs `VAULT_ROLE_ID` + `VAULT_SECRET_ID` for GitHub secrets.

### 8.3 Runtime Model

Nothing reads Vault at runtime. Secrets land as compose environment variables during deploy. GitHub Actions holds only `VAULT_ROLE_ID`, `VAULT_SECRET_ID`, `SSH_KNOWN_HOSTS`.

## 9. Database Setup

### 9.1 Create Library DB (`deploy/scripts/create-library-db.sh`)

One-time script. Runs `docker exec {prod|uat}-postgres psql -U postgres -c "CREATE DATABASE library;"` against existing Postgres containers. Flyway migrations run on first API startup.

### 9.2 Backup (`deploy/scripts/backup.sh`)

Nightly cron (3:00 AM). Runs `docker exec {prod|uat}-postgres pg_dump -U postgres library | gzip` to `/opt/library/backups/{env}/daily/library-{date}.sql.gz`. Weekly snapshots on Sundays retained for 30 days. Daily backups retained for 7 days.

## 10. Monitoring Integration

Reuses pc's existing Prometheus/Grafana/Loki/Uptime-Kuma stack.

### 10.1 Prometheus

Add scrape targets to pc's `prometheus.yml`:
- `library-api-prod` → `host.docker.internal:10180/actuator/prometheus`
- `library-api-uat` → `host.docker.internal:20180/actuator/prometheus`

Requires adding `micrometer-registry-prometheus` to `api/build.gradle.kts`.

### 10.2 Uptime-Kuma

Two HTTP monitors:
- `Library Prod` → `https://library.nanobyte.ca/api/actuator/health` (60s)
- `Library UAT` → `https://uatlibrary.nanobyte.ca/api/actuator/health` (60s)

### 10.3 Loki

Library API logs go to stdout (Docker default). Existing Promtail/Fluentd picks them up automatically.

## 11. Deployment Flow (Full Lifecycle)

```
1. Developer pushes to main → build.yml runs tests → builds + pushes images to ghcr.io
2. Operator triggers deploy.yml (environment: uat, tag: main-abc1234)
3. Workflow logs into Vault via AppRole → reads secrets → renders .env
4. Workflow SSHs to home server via Cloudflare Tunnel
5. docker compose pull && up -d → pulls new images, recreates containers
6. Health gate polls /actuator/health for up to 5 min
7. Slack notification sent
8. Library live at https://uatlibrary.nanobyte.ca
```

**To promote to prod:** Re-trigger deploy.yml with `environment: prod` and same tag.

**Rollback:** Re-trigger deploy.yml with previous tag.

## 12. Prerequisites (Manual, One-Time on Home Server)

These must be completed before the first CI/CD deploy:

1. Add `library` database to existing prod Postgres: `docker exec prod-postgres psql -U postgres -c "CREATE DATABASE library;"`
2. Add `library` database to existing UAT Postgres: `docker exec uat-postgres psql -U postgres -c "CREATE DATABASE library;"`
3. Run `vault-init-library.sh` on home server → add `VAULT_ROLE_ID` + `VAULT_SECRET_ID` to GitHub repo secrets.
4. Populate Vault secrets: `vault kv put secret/library/common/...` and `secret/library/{uat,prod}/...`
5. Add Cloudflare Tunnel routes for `library.nanobyte.ca` and `uatlibrary.nanobyte.ca`.
6. Add `deploy/library/backup.sh` to crontab (stagger from pc's 3 AM — suggest 3:15 AM).
7. Add Prometheus scrape targets + Uptime-Kuma monitors (after first deploy with micrometer).

## 13. New Dependencies

| Artifact | Where | Purpose |
|----------|-------|---------|
| `micrometer-registry-prometheus` | `api/build.gradle.kts` | Expose `/actuator/prometheus` metrics for Prometheus scraping |

## 14. File Creation Summary

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `.github/workflows/build.yml` | New | PR tests + main image build |
| 2 | `.github/workflows/deploy.yml` | New | Manual dispatch deploy |
| 3 | `api/Dockerfile` | New | 2-stage JDK→JRE |
| 4 | `frontend/Dockerfile` | New | 3-stage dev/build/prod |
| 5 | `frontend/nginx.conf` | New | SPA + API proxy |
| 6 | `docker-compose.yml` | New | Local dev stack |
| 7 | `deploy/prod/docker-compose.yml` | New | Prod prebuilt deploy |
| 8 | `deploy/uat/docker-compose.yml` | New | UAT prebuilt deploy |
| 9 | `deploy/scripts/create-library-db.sh` | New | One-time DB creation |
| 10 | `deploy/scripts/vault-init-library.sh` | New | Vault AppRole setup |
| 11 | `deploy/scripts/backup.sh` | New | Nightly pg_dump |
| 12 | `api/build.gradle.kts` | Modify | Add micrometer-registry-prometheus |
