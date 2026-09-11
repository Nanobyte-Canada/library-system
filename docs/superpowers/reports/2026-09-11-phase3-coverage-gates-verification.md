# Phase 3 Verification Report — Coverage, Gates, and Breadth

**Date:** 2026-09-11
**Branch:** `feat/ui-testing-platform`
**Commits:** 43 ahead of master

## Scope

Phase 3 implemented the CI coverage and gate infrastructure plus breadth journey test plans and automation
for all remaining critical areas: authorization, user administration, circulation desk, and catalog administration.

## What was built

### CI/CD Workflows and Scripts
- `e2e/scripts/build-manifest.ts` — Generates `specs/ui/manifest.json` from spec frontmatter
- `e2e/scripts/build-coverage-report.ts` — Builds coverage report from browser and component results
- `e2e/scripts/publish-coverage-history.ts` — Publishes coverage history to test-reports branch
- `e2e/scripts/check-route-availability.ts` — Discovers frontend routes and checks spec coverage
- `e2e/scripts/check-impact.ts` — Deterministic impact analysis v1
- `e2e/scripts/check-test-change-lint.ts` — Test-change lint for test file modifications

### GitHub Actions Workflows
- **Route Coverage** — Runs on PR, checks route-to-spec coverage
- **Impact Analysis** — Runs on PR, fails if critical feature files change without test/plan updates
- **Test-Change Lint** — Runs on PR, fails if test assertions are weakened
- **UI Tests — Deployed (UAT)** — Full regression suite against deployed UAT
- **Production Smoke** — Smoke tests against production after promotion
- **Spec Validation** — Validates spec frontmatter and generated artifacts

### Breadth Journey Specs and Tests
| Area | Spec | Test | Scenarios |
|------|------|------|-----------|
| Authorization | `specs/ui/authorization/role-route-matrix.md` | `e2e/tests/regression/authz-role-matrix.spec.ts` | AUTHZ-001..007 |
| User Admin | `specs/ui/admin/users.md` | `e2e/tests/regression/admin-users.spec.ts` | ADMIN-USERS-001..007 |
| Circulation | `specs/ui/circulation/desk.md` | `e2e/tests/regression/circulation-desk.spec.ts` | CIRC-DESK-001..006 |
| Books | `specs/ui/admin/books.md` | `e2e/tests/regression/admin-catalog.spec.ts` | ADMIN-BOOKS-001..004 |
| Categories | `specs/ui/admin/catalog-metadata.md` | `e2e/tests/regression/admin-catalog.spec.ts` | ADMIN-META-001..003 |

### Data Fixtures Extended
- `authedPut` — PUT request helper
- `createRunUser` — run-namespaced user creation
- `runScopedIsbn` — column-safe ISBN for VARCHAR(13)
- `ensureCategory` / `ensureBook` / `addBookCopies` — catalog data helpers
- Worker fixtures: `catalogCategory`, `catalogBook`, `catalogCopies`

## Total Test Coverage

| Category | Count |
|----------|-------|
| Regression specs | 9 files |
| Total test scenarios | ~45 |
| Spec plans | 8 files |
| Routes covered | 20 (all authenticated + admin routes) |

## Recorded Product Gaps

1. **Desk barcode handling** — The checkout desk sends the Book Barcode field value as `copyId`; barcode-only checkout cannot succeed today
2. **Renewal error surfacing** — My Books does not render the renewal error message
3. **Category update** — No `PUT /api/categories/{id}` endpoint; Edit re-posts a create
4. **Copy transfer UI** — No admin UI for `POST /api/books/{id}/transfer`
5. **Category deletion** — No endpoint or UI control

## Exceptions

- E2E tests require deployed UAT and cannot be validated locally; only TypeScript compilation was checked
- `AuthContext` type uses `username` not `email` — caught and fixed during Task 3.12 implementation

## Pending Human Actions

1. **Plan approval** — Owner must change `status: draft` to `status: approved` and fill the `review` block in:
   - `specs/ui/platform/route-availability.md`
   - `specs/ui/authentication/login.md`
   - `specs/ui/authentication/session.md`
   - `specs/ui/authorization/role-route-matrix.md`
   - `specs/ui/admin/users.md`
   - `specs/ui/circulation/desk.md`
   - `specs/ui/admin/books.md`
   - `specs/ui/admin/catalog-metadata.md`

2. **Push and PR creation** — After approval, run:
   ```bash
   git push -u origin HEAD
   gh pr create --title "test(testing): Phase 3 — coverage, gates, and breadth" --body "..."
   ```

3. **Negative check demonstrations** (one-time per phase, then revert)
