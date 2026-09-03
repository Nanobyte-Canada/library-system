# Architecture Decision Records

This is the append-only log of Architecture Decision Records (ADRs) for the Library System.

Each entry records the context, decision, and consequences of a significant architectural choice. Entries are never deleted or rewritten. If a decision is reversed, add a **new** ADR that references (supersedes) the old one.

## ADR-0001: Kotlin / Spring Boot technology stack
**Status:** Accepted | **Date:** 2026-07-26

**Context:** The library system needed a backend stack for a REST API covering books, users, book issues/returns, and QR code generation. The team is productive on the JVM and wants strong typing with Spring's ecosystem.

**Decision:** Build the API with **Kotlin 1.9.25** on **Spring Boot 3.3.5** running on **JDK 17**, built with **Gradle 8.10.2 (Kotlin DSL)**. Persistence uses **JPA/Hibernate** (PostgreSQL driver). Security uses **Spring Security + JWT** (Auth0 `java-jwt`). QR codes are generated via the external service **api.qrserver.com** rather than a local library.

**Consequences:** Modern, type-safe stack with broad Spring ecosystem support. External QR service removes a dependency from the build but adds a runtime external call. JDK 17 and Spring Boot 3.x bring stricter defaults (e.g., Hibernate 6 naming strategy — see ADR-0005) that must be respected when upgrading.

## ADR-0002: Database on centralized shared Postgres
**Status:** Accepted | **Date:** 2026-09-02 (supersedes the original standalone-DB setup; commit `df5049a`)

**Context:** The app originally ran against a standalone MySQL database (older AGENTS.md docs claimed "MySQL (4 tables)" — this is **outdated**). Standing up and backing up a per-app database duplicated effort already solved by the shared `nanobyte-services` infrastructure.

**Decision:** Migrate to **PostgreSQL 16** managed by the `nanobyte-services` infra repo. The database name is `library`. The app connects via **container hostname on external Docker networks** — no database service is embedded in this repo's compose files:

- UAT: `DB_URL=jdbc:postgresql://uat-postgres:5432/library` (host `uat-postgres` reachable via the `infra-uat-network` external network)
- Prod: `DB_URL=jdbc:postgresql://prod-postgres:5432/library` (host `prod-postgres` reachable via the `infra-prod-network` external network)

Credentials are injected as `DB_USERNAME` / `DB_PASSWORD` from Vault at deploy time (see ADR-0007). Tests use Testcontainers with the PostgreSQL image.

**Consequences:** Database lifecycle (backups, upgrades, monitoring) is owned by the shared infra repo, not this one. The compose files depend on the external infra networks existing. A schema change here must be coordinated with the shared instance's other tenants — schema is per-database, `library` is dedicated to this app.

## ADR-0003: Two-service topology with naming convention
**Status:** Accepted | **Date:** 2026-08-29

**Context:** The deployment consists of a backend API and a static SPA frontend. Containers needed predictable names for logging, monitoring, and cross-repo automation.

**Decision:** Run exactly two services per environment:

1. **`api`** — Spring Boot application, listening internally on port **8082**.
2. **`frontend`** — nginx serving the built SPA and reverse-proxying `/api/`, `/health`, `/ready`, and `/actuator/` to the api service.

Container names follow the convention **`{env}-library-{service}`**:

- UAT: `uat-library-api`, `uat-library-frontend`
- Prod: `prod-library-api`, `prod-library-frontend`

**Consequences:** Consistent names make dashboards, log queries, and scripts portable across environments. Any new service added to the topology must extend the naming scheme and be documented in a new ADR.

## ADR-0004: Port scheme
**Status:** Accepted | **Date:** 2026-08-29

**Context:** Multiple apps share one host (e.g., portfolio, investclub). Host ports must be globally unique and immediately identifiable by environment.

**Decision:** Global server port scheme: **`1xxxx` = prod, `2xxxx` = uat**, with a **100 gap between apps**. Library assignments (host port → container port):

| Environment | Service | Host port | Container port |
|-------------|-----------|-----------|----------------|
| UAT | frontend | **20100** | 80 |
| UAT | api | **20180** | 8082 |
| Prod | frontend | **10100** | 80 |
| Prod | api | **10180** | 8082 |

**Consequences:** Port collisions across apps are prevented by convention; the 100-gap leaves room for additional services per app. Changing any host port requires updating the compose files and this log (see documentation maintenance contract in AGENTS.md).

## ADR-0005: Health check pattern
**Status:** Accepted | **Date:** 2026-08-29 (refined 2026-08-29 via commits `f68ed26`, `fbd3b55`, `ca0cf59`, `8971ed1`)

**Context:** Early deploys showed "healthy" containers that were actually broken: actuator returned 403 behind Spring Security, Docker healthchecks hit endpoints nginx didn't proxy, and CI health gates checked the runner's localhost instead of the deployed URL. The `pc` project already solved this with a dedicated `/health` endpoint — the library should match that pattern.

**Decision:**
- The api exposes a **dedicated `/health` endpoint** (`HealthController`) outside the secured filter chain, separate from `/actuator/**` which has its own `SecurityFilterChain` (`@Order(1)`).
- nginx proxies `/health` (and `/ready`, `/actuator/`) to the api.
- Each compose service defines a **Docker healthcheck** (`curl -f http://localhost:8082/health` for api, `curl -f http://localhost:80/` for frontend).
- The CI **health gate checks the PUBLIC URL**, not runner localhost: `https://uatlibrary.nanobyte.ca/api/health` (uat) and `https://library.nanobyte.ca/api/health` (prod), requiring `"status": "UP"`.

Related fixes: Hibernate naming strategy had to be set explicitly for Spring Boot 3.x / Hibernate 6 (physical naming strategy change caused table-name mismatches → login 403; commits `ca0cf59`, `8971ed1`).

**Consequences:** Health is verified end-to-end through the public entry point, catching proxy/ingress breakage that container-internal checks miss. Any new endpoint used by healthchecks must be added to the nginx proxy config and excluded from auth.

## ADR-0006: CI/CD pipeline
**Status:** Accepted | **Date:** 2026-09-02 (commit `6cb31e8`)

**Context:** Deploys need reproducible images, automated UAT delivery, and a deliberate human gate before production.

**Decision:**
- **Build workflow** (`.github/workflows/build.yml`, name: `Build`) runs on **push and PR to `master`/`main`**: API tests (Gradle) + frontend build (lint, type check, build), then on push builds and pushes GHCR images `ghcr.io/nanobyte-canada/library-api` and `library-frontend` tagged `main-<short-sha>` plus `latest` (deploy validation also accepts `master-<short-sha>`). Slack notification on completion.
- **Deploy UAT** (`.github/workflows/deploy.yml`): triggered **automatically via `workflow_run` when Build completes successfully** on `main`/`master`, or **manually via `workflow_dispatch`** with `environment` (uat/prod) and `tag` inputs — e.g. `gh workflow run deploy.yml -f environment=uat -f tag=main-a1b2c3d`.
- **Deploy prod** (`.github/workflows/deploy-prod.yml`): **manual-only** (`workflow_dispatch` with `tag` input) and protected by **`environment: prod`** GitHub environment rules.
- **Server deploy path** is `/opt/library/{uat,prod}`. The runner scp's the compose file and a Vault-generated `.env`, logs in to GHCR using the Vault-stored `GHCR_TOKEN` (fallback `GITHUB_TOKEN`), then runs `docker compose pull` + `docker compose up -d`, checks container health, and runs the public-URL health gate (ADR-0005) before notifying Slack. SSH reaches the server through a Cloudflare Tunnel.

**Consequences:** UAT stays in sync with master automatically; prod changes are always intentional. Rollback = redeploy a previous image tag. Any pipeline change must be reflected here.

## ADR-0007: Secrets via Vault AppRole
**Status:** Accepted | **Date:** 2026-08-29

**Context:** Runtime secrets (DB credentials, JWT signing key, SMTP credentials, CORS origins, GHCR token) must not live in the repo or in long-lived GitHub secrets readable by workflows beyond what's necessary.

**Decision:** All runtime secrets are fetched **at deploy time** from **Vault at `https://vault.nanobyte.ca`** using the **AppRole** auth method (`VAULT_ROLE_ID` / `VAULT_SECRET_ID` stored as GitHub secrets). Secrets are read from two tiers:

- `secret/library/common` — shared across environments
- `secret/library/{env}` — environment-specific (overrides common)

The deploy workflow assembles the `.env` file in-memory on the runner, scp's it to `/opt/library/{env}/.env`, and deletes the local copy afterward. **No secrets are committed to the repository.**

**Consequences:** Secret rotation happens in Vault only — no code changes. Deploys fail fast if Vault auth or secret fetch fails (key-count validation). Adding a new secret means adding it in Vault and referencing it in compose + documenting it.

## ADR-0008: Deployment isolation
**Status:** Accepted | **Date:** 2026-09-02 (commit `df5049a`)

**Context:** Several apps deploy to the same Docker host (portfolio, investclub, …). Compose projects must not interfere with each other's containers or networks.

**Decision:** Every compose file in `deploy/{uat,prod}/`:

- Sets a **top-level `name:`** (`library-uat`, `library-prod`) so the Compose project is namespaced and can never collide with another app's resources.
- Joins **external shared-infra networks** (`uat-internal-network` + `infra-uat-network` for UAT; `prod-internal-network` + `infra-prod-network` for prod) instead of creating ad-hoc networks.
- **Embeds NO database (or other infra) services** — the DB is the centralized shared Postgres (ADR-0002).

**Consequences:** Deploying or tearing down library cannot affect other apps. The external networks must pre-exist (created by the nanobyte-services infra repo). UAT must never reference prod infra networks, and vice versa.

## ADR-0009: Login authentication flow, error visibility, and deploy pipeline fix
**Status:** Accepted | **Date:** 2026-09-03

**Context:** UAT returned an opaque `403` with an empty body for `POST /api/auth/login`, masking several stacked defects: (1) `AuthController` exposes only `/register` — authentication was meant to run in `JWTAuthenticationFilter`, which extended `UsernamePasswordAuthenticationFilter` **without** overriding its default process URL (`POST /login`), so the filter never intercepted the `jwt.url` (`/api/auth/login`) the frontend actually calls → the request had no handler. (2) Spring Boot forwards error dispatches (401/404/405) to `/error`, which the security chain did not permit, so **every** error surfaced as an empty `403` via `Http403ForbiddenEntryPoint`. (3) `application-prod.yml` forced `org.springframework.security` logging to `INFO`, hiding the filter-chain trace during diagnosis. (4) The seed migration `V2__seed_data.sql` stored a placeholder BCrypt hash that does not match `password123`, so even `POST /login` failed password verification. (5) The deploy workflow derived its target environment only from `workflow_dispatch` inputs, so auto-deploys (`workflow_run`) ran with an empty `ENV` and failed at `scp` (exit 255); its health gate also checked `/api/health`, which does not exist (the endpoint is `/health`), so it could never pass.

**Decision:**
- `JWTAuthenticationFilter` calls **`setFilterProcessesUrl(jwtConfig.url)`** — the filter processes `POST /api/auth/login`, the URL both the frontend and `jwt.url` use.
- `unsuccessfulAuthentication` returns a JSON `ResponseModel` with **HTTP 401** directly instead of forwarding to `/error`.
- The main security chain **permits `/error`** so real status codes (404/405) reach clients instead of a masked empty 403.
- `application-prod.yml` **no longer overrides Spring Security logging** (DEBUG from `application.yml` applies).
- New migration **`V3__fix_seed_passwords.sql`** resets the `admin`/`jane`/`john` seed passwords to a BCrypt(9) hash of `password123` (V2 is immutable — Flyway checksum).
- The deploy workflow **derives the target environment** (defaults to `uat` for `workflow_run` auto-deploys) and the health gate checks the public **`/health`** endpoint (ADR-0005).

**Consequences:** Login works end-to-end against `/api/auth/login`; failures return meaningful status codes and are observable in logs. Seed password changes require a new migration. Any login-route change must update `jwt.url` and this log together.
