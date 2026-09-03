# Agents

This file provides context for AI coding agents working on the Library System.

## Repository Overview

A REST API for managing a library system: books, users, book issues/returns, and QR code generation.

| Layer | Stack |
|-------|-------|
| Backend | Kotlin 1.9.25, Spring Boot 3.3.5, JDK 17, JPA/Hibernate |
| Build | Gradle 8.10.2 (Kotlin DSL) |
| Database | PostgreSQL 16 — centralized shared instance from nanobyte-services infra (DB name `library`; historically MySQL, migrated — see ADR-0002) |
| Auth | Spring Security + JWT (Auth0 java-jwt) |
| QR Code | External API (api.qrserver.com) |

## Quick Reference

For detailed architecture and module documentation, see `docs/business-context.html`.

For reference docs, see `docs/reference/INDEX.md`.

## Documentation Map

| Path | Purpose |
|------|---------|
| `docs/adr.md` | **Append-only** architecture decision records — update on every architectural change |
| `docs/business-context.html` | Business context and module documentation |
| `docs/reference/INDEX.md` | Reference docs index |
| `README.md` | High-level repo overview |

## Architecture Invariants

These rules must hold at all times. Violating any of them is a bug:

- Every compose file must set a **top-level `name:`** (`library-uat`, `library-prod`) to namespace the Compose project.
- Container naming follows **`{env}-library-{service}`** (e.g. `uat-library-api`, `prod-library-frontend`).
- Port scheme: **`1xxxx` = prod, `2xxxx` = uat**, 100 gap between apps (library: uat 20100/20180, prod 10100/10180).
- The database is the **centralized shared Postgres** from the nanobyte-services infra repo (hosts `uat-postgres` / `prod-postgres`, DB `library`) — **never embed a DB (or other infra service) in a compose file**.
- **All secrets come from Vault** (`https://vault.nanobyte.ca`, paths `secret/library/common` and `secret/library/{env}`, AppRole auth) — never commit secrets.
- **UAT must never reference prod infra networks**, and vice versa (uat: `uat-internal-network` + `infra-uat-network`; prod: `prod-internal-network` + `infra-prod-network`).

## Documentation Maintenance Contract

Applies to **any agent or model** working in this repo:

- Any change to **compose files, ports, networks, CI/CD workflows, or DB schema REQUIRES adding a new ADR entry** to `docs/adr.md` **in the same commit/PR**. Never delete or rewrite past ADR entries — supersede them with a new entry referencing the old one.
- If the high-level overview changes (stack, services, URLs, local dev), update `README.md` in the same change.

## UAT E2E Testing

The `e2e/` directory holds the Playwright suite that validates the deployed UAT
environment (`https://uatlibrary.nanobyte.ca`).

**Rule:** Any PR that changes user-visible behavior (API or frontend) must add or
update tests in the matching `e2e/tests/<area>.spec.ts` **in the same PR**. A new
area means a new spec file plus an entry in the `suite` choice list in
`.github/workflows/uat-e2e.yml`.

- Suites (per-area files): `auth`, `admin-books`, `admin-settings`, `librarian`,
  `member`, `roles` — see the e2e README for what each covers.
- Run locally: `cd e2e && npm ci && npx playwright install chromium && npx playwright test`
  (single suite: append `tests/<area>.spec.ts`).
- Run in CI: Actions → **UAT E2E** → Run workflow → pick a suite. Dispatch **after
  the latest Deploy run for master has completed** — overlapping an in-flight deploy
  can hit mid-restart containers and produce false failures.
- Test data: fixed "Playwright"-prefixed names, **tolerates duplicates** — creation
  tests with fixed names (books, categories) pre-check the API and skip when the
  entity already exists. Never delete shared seed data. Tests run sequentially
  against the shared UAT DB.

## Git Rules

**Commit messages:**
- NEVER add `Co-Authored-By:` or any AI-attribution lines/trailers to commit messages.

**Etiquette:**
- Never push unless explicitly asked.
