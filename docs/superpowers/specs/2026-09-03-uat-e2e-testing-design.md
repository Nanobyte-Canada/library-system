# UAT E2E Testing — Design

**Date:** 2026-09-03
**Status:** Approved (Approach 2 — per-area suites + targeted dispatch)
**Related:** ADR-0003 (two-service topology), ADR-0005 (health endpoint), ADR-0006 (CI/CD pipeline), ADR-0009 (login flow fix); will add **ADR-0010** when implemented

## Context

The library system now has a 32-test Playwright suite (`e2e/tests/uat.spec.ts`) that validates the deployed UAT environment end-to-end at `https://uatlibrary.nanobyte.ca` for all three roles (admin / jane / john). It currently runs only from a developer machine and is **not committed to the repo**. The team's working model is: build a feature → deploy to UAT → manually verify.

Goal: commit the suite, make it runnable against UAT from GitHub Actions on demand, and establish a convention so that **every new user-visible feature lands with UAT e2e coverage in the same PR**, keeping regressions caught at the UAT level.

## Goals

1. Commit the e2e suite to the repo with proper hygiene (ignore rules, scripts, pinned deps).
2. A manually-triggered GitHub Actions workflow that runs the suite against UAT, with per-area suite selection, artifact upload, and Slack notification on failure.
3. Reorganize tests into per-area files so new-feature tests have an obvious home.
4. Written convention (AGENTS.md + PR template checklist) linking feature work to test updates.
5. Document the pipeline change as ADR-0010 (repo documentation contract).

## Non-Goals (explicitly out of scope)

- **No automatic post-deploy triggering** — suite is manual-only by decision.
- **No hard CI gate** — a failed e2e run does not block master or prod deploys; it signals (red run + Slack) and a human decides.
- **No test-data cleanup/reset** — creation tests tolerate pre-existing/duplicate data; fixed "Playwright"-prefixed names; shared seed data is never deleted.
- **No prod smoke tests, no environment matrix** — UAT only (BASE_URL is an env override so this stays cheap to add later).
- **No retries, no parallel workers** — tests share the UAT database; retries mask real bugs.

## 1. Test suite structure

```
e2e/
├── package.json              # scripts: test / test:headed; @playwright/test pinned
├── package-lock.json         # committed
├── playwright.config.ts      # forbidOnly; baseURL from BASE_URL env (default uat URL)
├── .gitignore                # node_modules/, test-results/, report/
├── README.md                 # how to run locally & in CI (short)
└── tests/
    ├── helpers/shared.ts         # USERS, login(), getApiToken(), authedGet()
    ├── auth.spec.ts              # tests 1–6:   health, login admin/jane/john, bad login, logout
    ├── admin-books.spec.ts       # tests 7–12:  dashboard, list, create/edit book, copies, QR
    ├── admin-settings.spec.ts    # tests 13–19: categories, users, branches, audit logs
    ├── librarian.spec.ts         # tests 20–23: dashboard, books, catalog search, checkout desk
    ├── member.spec.ts            # tests 24–28, 31–32: dashboard, catalog, detail, profile,
    │                             #              my books, reservations, QR scanner
    └── roles.spec.ts             # tests 29–30: member blocked from /admin/*
```

Rules:

- **1:1 migration** — all 32 tests move unchanged except:
  - Creation tests **9 (book)** and **14 (category)** gain an **idempotency pre-check**: before the UI flow, query the public API (`/api/books/search`, `/api/categories`) and `test.skip()` if the fixed-name entity already exists. This honors the tolerate-duplicates/no-cleanup decision while **bounding data growth** — without it, repeated runs accumulate "Playwright Test Book" rows; books list sorts `createdAt DESC` with page size 20, so seed titles eventually fall off page 1 and tests 8/21/25 would false-fail.
  - Creation tests **16 (user)** and **18 (branch)** never submit (fill + screenshot only) — they gain only the "page remains functional" sanity check (`Layout` heading still visible), inserted before the final screenshot.
- **Single worker, sequential** (`fullyParallel: false`, `workers: 1`, retries 0) — tests share the UAT DB and its seed users. Note: `fullyParallel: false` alone does NOT prevent the six spec *files* from running across parallel workers; `workers: 1` is required.
- The inherited `isVisible({ timeout })` idiom ignores its timeout (Playwright returns immediately). Tests 10–12, 16, 18 keep it verbatim (inherited quirk, noted); the rewritten tests 9 and 14 use `waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)` as the canonical idiom for new tests.
- **`helpers/shared.ts`** exports:
  - `USERS` — admin/jane/john credentials (already public seed data in the repo's migrations)
  - `login(page, user)` — UI login helper (moved from uat.spec.ts)
  - `getApiToken(request, user)` — API login via `POST /api/auth/login`, returns the JWT from the `Authorization` response header
  - `authedGet(request, path, token)` — authenticated API GET for fast state setup in future tests
- **`playwright.config.ts`** — `baseURL: process.env.BASE_URL ?? 'https://uatlibrary.nanobyte.ca'`; `forbidOnly: !!process.env.CI` (deliberately CI-conditional: locals may use `test.only` during development); in CI the `github` reporter is added so failures annotate inline in the Actions UI; `workers: 1`.

## 2. CI workflow (`.github/workflows/uat-e2e.yml`)

- **Name:** `UAT E2E`
- **Trigger:** `workflow_dispatch` only, inputs:
  - `suite` (choice, default `all`): `all | auth | admin-books | admin-settings | librarian | member | roles`
- **Job permissions:** `contents: read` (no token use beyond checkout)
- **Concurrency:** group `uat-e2e`, `cancel-in-progress: false`
- **Timeout:** 20 minutes
- **Steps:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` — node 22, `cache: npm`, `cache-dependency-path: e2e/package-lock.json`
  3. `npm ci` (working-directory: e2e)
  4. `npx playwright install --with-deps chromium`
  5. `npx playwright test $SUITE_ARGS` where `SUITE_ARGS` is empty for `all`, else `tests/<suite>.spec.ts`
  6. Upload artifacts (always): `e2e/report/` (HTML report) and `e2e/test-results/` (traces/screenshots), retention 14 days
  7. Slack notification on failure — reuses `SLACK_WEBHOOK_URL` secret, payload style matching `deploy.yml`
- No GHCR/Vault/SSH access needed — the workflow is read-only against the UAT public URL.

## 3. Conventions linking features to tests

- **AGENTS.md** — new "UAT E2E Testing" section:
  - Rule: *any PR that changes user-visible behavior (API or frontend) must add or update tests in the matching `e2e/tests/<area>.spec.ts` in the same PR.*
  - New area → new spec file + add it to the `suite` choice list in `uat-e2e.yml`.
  - Test-data convention: fixed "Playwright"-prefixed names, tolerate pre-existing data, never delete shared seed data.
  - How to run: locally (`cd e2e && npx playwright test`) and in CI (Actions → UAT E2E → Run workflow → pick suite).
- **`.github/pull_request_template.md`** (new file) — checklist including: `- [ ] UAT e2e suite updated (if user-visible behavior changed)`.
- **Root `README.md`** — updated in the same change (documentation contract: local-dev and CI/CD overview changed): add an E2E stack-table row, an E2E Local Development subsection, a UAT E2E dispatch example in CI/CD Usage, and fix the stale health-gate reference (`/api/health` → `/health`, moved by ADR-0009).
- **Operational note** (AGENTS.md + e2e README): dispatch the suite **after the latest Deploy run for master has completed** — a dispatch overlapping an in-flight deploy can hit mid-restart containers and produce false reds.
- **`docs/adr.md`** — ADR-0010 appended (append-only contract): manual-dispatch e2e workflow, per-area suites + suite targeting, test-data convention, AGENTS.md/PR-template contract.

## 4. Verification plan

1. **Local parity:** run each spec file locally against UAT — 32 tests, 0 failures (steady state: 30 passed, 2 skipped via the idempotency pre-checks; baseline was 32/32 passed on 2026-09-03 before the pre-checks were added).
2. **Idempotency:** run `admin-books.spec.ts` twice — the second run reports test 9 **skipped** (pre-check finds the existing book) and no duplicate row is created.
3. **CI full run:** dispatch `suite=all` → green run, HTML report + traces uploaded.
4. **CI targeted run:** dispatch `suite=auth` → run executes only the 6 auth tests (validates file filtering).
5. **Slack path:** reuses the already-proven notification config from deploy.yml; no forced-failure test (failure UX in CI is additionally covered by the `github` reporter).

## Future extensions (not now)

- Auto-run after UAT deploy completes (workflow_run chain) — decision was manual-only; revisit if manual triggering gets forgotten.
- Nightly drift check (certs, DB state).
- Prod smoke subset (read-only tests, separate `environment` input).
- API-fixture state setup to cut runtime; parallel workers with per-worker data namespaces.
