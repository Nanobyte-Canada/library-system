# UAT E2E Tests

Playwright suite validating the deployed library UAT environment
(`https://uatlibrary.nanobyte.ca`, override with `BASE_URL`).

## Run locally

```bash
cd e2e
npm ci
npx playwright install chromium
npx playwright test              # all suites
npx playwright test tests/auth.spec.ts   # one suite
```

## Suites

| File | Area |
|------|------|
| tests/auth.spec.ts | health, login (all roles), logout |
| tests/admin-books.spec.ts | admin dashboard, books CRUD, copies, QR |
| tests/admin-settings.spec.ts | categories, users, branches, audit logs |
| tests/librarian.spec.ts | librarian dashboard/books/search/checkout desk |
| tests/member.spec.ts | member dashboard, catalog, profile, my books, reservations, scanner |
| tests/roles.spec.ts | role guards (member blocked from admin) |

## Run in CI

GitHub Actions → **UAT E2E** → Run workflow → pick a suite (or `all`).
Dispatch **after the latest Deploy run for master has completed** — a dispatch
overlapping an in-flight deploy can hit mid-restart containers and produce false
failures. Failure artifacts (HTML report + traces) are uploaded to the run; Slack
is notified on failure.

## Conventions (see AGENTS.md)

- Any PR changing user-visible behavior must add/update tests in the matching spec file, same PR.
- Creation tests with fixed "Playwright"-prefixed names (books, categories) pre-check the API and skip if the entity already exists — no data accumulation.
- Test data **tolerates duplicates** — do not delete shared seed data.
