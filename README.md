# Library System

A REST API for managing a library: **books**, **users**, **book issues/returns**, and **QR code generation**.

## Stack

| Layer | Stack |
|-------|-------|
| Backend | Kotlin 1.9.25, Spring Boot 3.3.5, JDK 17, JPA/Hibernate |
| Build | Gradle 8.10.2 (Kotlin DSL) |
| Database | PostgreSQL 16 — centralized shared instance from `nanobyte-services` infra |
| Auth | Spring Security + JWT (Auth0 java-jwt) |
| QR Code | External API (api.qrserver.com) |
| Frontend | TypeScript SPA (Vite), served by nginx |
| E2E | Playwright 1.62 (TypeScript), run against deployed UAT |
| CI/CD | GitHub Actions → GHCR → Docker Compose on shared host, secrets via Vault |

## Architecture Overview

Two services per environment, deployed with Docker Compose on a shared host:

```
                    ┌────────────────────────────────────────────┐
  https://…nanobyte.ca/           shared host                     │
        │           │  ┌──────────────────┐   ┌────────────────┐ │
        ▼           │  │ library-frontend │   │  library-api   │ │
   edge/ingress ────┼─▶│ (nginx :80)      ├──▶│ (Spring :8082) │ │
                    │  └──────────────────┘   └───────┬────────┘ │
                    │   proxies /api/, /health,       │          │
                    │   /ready, /actuator/            ▼          │
                    │                     shared Postgres        │
                    │                     {uat,prod}-postgres:5432
                    └────────────────────────────────────────────┘
```

- **api** — Spring Boot application (internal port 8082) exposing the REST API and a dedicated `/health` endpoint.
- **frontend** — nginx serving the built SPA and reverse-proxying `/api/`, `/health`, `/ready`, and `/actuator/` to the api.
- **Database** — the centralized shared PostgreSQL managed by the [nanobyte-services](https://github.com/nanobyte-canada) infra repo (DB name `library`, reached via external Docker networks). No database is embedded in this repo's compose files.
- Container names follow `{env}-library-{service}`: e.g. `uat-library-api`, `prod-library-frontend`.

Deployment isolation, port allocation, secrets, and pipeline details are recorded in the [ADR log](docs/adr.md).

## Services & Ports

| Environment | Service | Host port | Container port |
|-------------|-----------|-----------|----------------|
| UAT | frontend | 20100 | 80 |
| UAT | api | 20180 | 8082 |
| Prod | frontend | 10100 | 80 |
| Prod | api | 10180 | 8082 |

Port scheme: `1xxxx` = prod, `2xxxx` = uat, 100 gap between apps.

## Environments & URLs

| Environment | URL | Deploy trigger |
|-------------|-----|----------------|
| Prod | https://library.nanobyte.ca | Manual only (`deploy-prod.yml`, `environment: prod` protection) |
| UAT | https://uatlibrary.nanobyte.ca | Auto on Build success (push to master) or manual |

Health endpoints (used by CI health gates): `https://library.nanobyte.ca/health` and `https://uatlibrary.nanobyte.ca/health`.

## CI/CD Usage

Images are published to GHCR as `ghcr.io/nanobyte-canada/library-api` and `ghcr.io/nanobyte-canada/library-frontend`, tagged `main-<short-sha>` and `latest`.

**UAT** deploys automatically when the `Build` workflow succeeds on `master`. To deploy manually:

```bash
gh workflow run deploy.yml -f environment=uat -f tag=main-a1b2c3d   # or tag=latest
```

**Prod** is manual-only:

```bash
gh workflow run deploy-prod.yml -f tag=main-a1b2c3d                 # or tag=latest
```

**UAT E2E** runs the Playwright suite against UAT on demand:

```bash
gh workflow run uat-e2e.yml -f suite=all        # or: auth | admin-books | admin-settings | librarian | member | roles
```

Dispatch after the latest Deploy run for master has completed.

Deploys scp the compose file + Vault-generated `.env` to `/opt/library/{uat,prod}` on the server, run `docker compose pull && docker compose up -d`, then gate on the public health URL.

## Local Development

### API (from `api/`)

```bash
./gradlew compileKotlin   # compile
./gradlew test            # run tests (uses Testcontainers — requires a running Docker daemon)
./gradlew bootRun         # run the API locally
```

### Frontend (from `frontend/`)

```bash
npm ci          # install dependencies
npm run dev     # dev server (Vite)
npm run lint    # lint (oxlint)
npm run build   # type check (tsc -b) + production build
```

### E2E (from `e2e/`)

```bash
npm ci                              # install dependencies
npx playwright install chromium     # one-time browser install
npx playwright test                 # full suite against https://uatlibrary.nanobyte.ca
```

## Documentation

- [docs/adr.md](docs/adr.md) — append-only architecture decision records (update on every architectural change)
- [docs/business-context.html](docs/business-context.html) — business context and module documentation
- [docs/reference/INDEX.md](docs/reference/INDEX.md) — reference docs index
- [AGENTS.md](AGENTS.md) — context and rules for AI coding agents working in this repo
