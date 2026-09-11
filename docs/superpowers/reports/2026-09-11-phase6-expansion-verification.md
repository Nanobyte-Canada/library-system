# Phase 6 — Expansion and Optimization: Verification Report

**Date:** 2026-09-11
**Branch:** feat/ui-testing-platform
**Status:** Implementation complete (pending CI verification)

## Summary

Phase 6 completes the UI testing platform by porting the remaining legacy journeys (catalog,
circulation, reservations, branches, audit), adding full browser matrix support with sharding,
retiring the legacy suite and workflow, and finalizing operations documentation.

## Changes

### Task 6.1: Remaining journeys (7 spec plans + 7 test files)

| Spec Plan | Scenarios | Test File |
|---|---|---|
| `specs/ui/catalog/search.md` | CATALOG-SEARCH-001..003 | `catalog-search.spec.ts` |
| `specs/ui/catalog/book-detail.md` | CATALOG-DETAIL-001..003 | `catalog-book-detail.spec.ts` |
| `specs/ui/circulation/self-checkout.md` | CIRC-SELF-001..003 | `circulation-self-checkout.spec.ts` |
| `specs/ui/circulation/my-books.md` | CIRC-MYBOOKS-001..005 | `circulation-my-books.spec.ts` |
| `specs/ui/reservations/lifecycle.md` | RSV-001..005 | `reservations-lifecycle.spec.ts` |
| `specs/ui/admin/branches.md` | ADMIN-BRANCHES-001..003 | `admin-branches.spec.ts` |
| `specs/ui/admin/audit.md` | ADMIN-AUDIT-001..002 | `admin-audit.spec.ts` |

**21 new scenarios** ported from `member.spec.ts`, `librarian.spec.ts`, and `admin-settings.spec.ts`.

**Commit:** `3cb5437` — `test(platform): port catalog, circulation, reservations, branch, and audit journeys`

### Task 6.2: Full browser matrix and sharding

- `e2e/playwright.config.ts`: Added `FULL_MATRIX` env var toggle; desktop projects expand to chromium +
  firefox + webkit when full; chromium-mobile project always present.
- `.github/workflows/ui-tests-deployed.yml`: Added `matrix` (default/full) and `shard` (N/M) inputs
  to `workflow_dispatch`; run block exports `FULL_MATRIX` and passes `--shard` flag.

**Commit:** `d151ffb` — `test(platform): add full browser matrix and sharding controls`

### Task 6.3: Legacy retirement, thresholds, and operations finalization

**Deleted:**
- `e2e/tests/admin-books.spec.ts` (Phase 3 migration)
- `e2e/tests/admin-settings.spec.ts` (Phase 3/6 migration)
- `e2e/tests/librarian.spec.ts` (Phase 3 migration)
- `e2e/tests/member.spec.ts` (Phase 6 migration)
- `e2e/tests/roles.spec.ts` (Phase 3 migration)
- `e2e/tests/helpers/shared.ts` (superseded by fixtures)
- `.github/workflows/uat-e2e.yml` (replaced by `ui-tests-deployed.yml`)

**Modified:**
- `docs/testing/legacy-tests.md`: All rows marked `migrated (Phase X)`
- `docs/testing/operations.md`: Appended measured thresholds table
- `docs/adr.md`: Appended ADR-0020 (legacy retirement and full browser matrix)
- `README.md`: Updated UAT E2E section to reference new workflow; added UI testing section
- `.github/pull_request_template.md`: Replaced legacy e2e checklist with plan/test/CI items

**Commit:** `b061879` — `test(platform): retire the legacy suite and finalize operations`

### Task 6.4: Verification report and program closure

This report.

**Commit:** (this commit)

## End-state checklist

| Criterion | Status |
|---|---|
| All `docs/testing/legacy-tests.md` rows migrated or retired | ✅ All 7 rows show `migrated (Phase X)` |
| `uat-e2e.yml` deleted; `ui-tests-deployed.yml` is the only browser-test trigger | ✅ |
| All critical journeys have approved plans with automated coverage | ✅ 19 spec plans, 77 regression scenarios |
| 16 regression test files cover all journey areas | ✅ |
| `docs/testing/operations.md` records thresholds and cadence | ✅ |
| ADR-0020 documents the legacy retirement | ✅ |
| PR template reflects the plan-based workflow | ✅ |

## Coverage totals

| Category | Files | Scenarios |
|---|---|---|
| Regression | 16 | 77 |
| Smoke | 1 | — |
| Prod Smoke | 1 | — |
| Visual | 1 | — |
| Accessibility | 1 | — |
| **Total spec files** | **20** | **77+** |

## Spec plans

19 approved spec plans across areas:
- Authentication: login, session
- Authorization: role-route-matrix
- Admin: books, catalog-metadata, users, branches, audit
- Circulation: desk, self-checkout, my-books
- Catalog: search, book-detail
- Reservations: lifecycle
- Platform: route-availability, prod-smoke
- Accessibility: scan-baseline
- Visual: critical-pages

## Open items

1. **CI verification:** The ported suites must be verified green in the deployed workflow after merge.
   The full matrix (firefox, webkit) should be dispatched manually to confirm browser compatibility.
2. **Measured thresholds:** The 30-day measurement window for impact-gate bypass rate, false-positive
   rate, smoke reliability, and quarantine limit begins after the first full deploy with the new suite.
3. **UAT data reset:** The accumulated test data from Phases 1–5 may need a manual reset after Phase 6
   lands (documented in `docs/testing/operations.md`).

## Approved exceptions

None. All critical journeys have automated coverage at their declared layers.
