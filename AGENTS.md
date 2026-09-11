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

## UI Testing

The UI testing platform is specified in
`docs/superpowers/specs/2026-09-11-ui-testing-platform-design.md`.

**Rules for any PR that changes user-visible behavior (API or frontend):**

- Update or add scenarios in the matching plan under `specs/ui/<area>/`.
- Keep scenario IDs stable; retire with a reason and allocate new IDs; never reuse an ID.
- Add or update the executable test at the layer the plan declares: component tests in `frontend/`
  (Vitest) or browser tests in `e2e/tests/`.
- Browser tests execute only in CI against deployed UAT; they are never run locally. Verify through the
  `UI Tests — Deployed (UAT)` workflow (automatic after deploy, or manual dispatch from the Actions tab).
- PR checks (`UI PR Checks`) validate plans, the manifest, route coverage, impact, and test-change lint.
  Do not bypass `ui-test-impact` or `test-weakening-approved` gates without the approver label and reason.

**Test data:** run-namespaced (`pw-<runid>-*`); never delete shared data; never delete branches (deletion
cascades book copies); UAT resets are manual and documented in `docs/testing/operations.md`.

**Ownership:** CODEOWNERS routes `specs/ui/**`, `docs/testing/**`, `e2e/**`, component tests, and
`ui-*` workflows to the plan approver and test owner.

## Git Rules

**Commit messages:**
- NEVER add `Co-Authored-By:` or any AI-attribution lines/trailers to commit messages.

**Etiquette:**
- Never push unless explicitly asked.
