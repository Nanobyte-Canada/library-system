---
feature_id: PLATFORM-ROUTES
feature: Route availability and environment health
owner: saurabhbilakhia
status: approved
priority: high
critical_journeys: [CJ-01]
requirement_refs: [RQ-UI-001]
routes: [/login, /]
roles: [anonymous]
flags: []
components: [LoginPage, Badge]
source_overrides: [frontend/src/main.tsx, frontend/src/App.tsx]
tags: [smoke]
last_reviewed: "2026-09-11"
review:
  approved_by: saurabhbilakhia
  approved_on: "2026-09-11"
  requirement_version: "f13e2fa"
next_id: "007"
---

# Route availability and environment health

## Objective

Prove that the deployed UAT frontend is reachable, identifies itself as the UAT environment, serves the
public entry route, and that the application is healthy before deeper suites run.

## Preconditions

- Deployed UAT revision, reachable at the workflow's `BASE_URL`.
- No authentication required for these scenarios.

## Test data

None. These scenarios create no data.

## Assumptions and dependencies

- The UAT frontend image is built with `VITE_APP_ENVIRONMENT=uat` (Task 1.4) and published as
  `library-frontend-uat`.
- `/health` is public (SecurityConfig permits `/health`).
- The catch-all route redirects to `/dashboard`, whose guard redirects unauthenticated visitors to
  `/login`.
- UI registration is feature-absent (API-only; backend integration tests cover it).

## Scenarios

### PLATFORM-ROUTES-001 — Health endpoint is UP

Priority: normal
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given the deployed UAT environment
When the health endpoint is requested
Then it returns 200 with status UP

Expected results:
- HTTP 200 and JSON `{"status":"UP"}`.

### PLATFORM-ROUTES-002 — Login page renders the sign-in form

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an anonymous browser session
When the visitor opens /login
Then the sign-in form is visible with username, password, and submit controls
And no unexpected console or network errors occur

Expected results:
- Description text, Username field, Password field, and Sign In button are visible.
- The network monitor reports no unallowlisted errors.

### PLATFORM-ROUTES-003 — Root redirects to the login page

Priority: high
Type: navigation
Layer: browser
Target: deployed
Automation: automated

Given an anonymous browser session
When the visitor opens /
Then the browser lands on /login

Expected results:
- The catch-all route sends the visitor to /dashboard and the guard redirects to /login.

### PLATFORM-ROUTES-004 — Protected route redirects anonymous visitors to login

Priority: high
Type: navigation
Layer: browser
Target: deployed
Automation: automated

Given an anonymous browser session
When the visitor opens /dashboard directly
Then the browser lands on /login

Expected results:
- No authenticated content renders.

### PLATFORM-ROUTES-005 — Login form renders required controls

Priority: high
Type: happy-path
Layer: component
Target: deployed
Automation: automated

Given the LoginPage component rendered in the component-test environment
When it mounts
Then the username field, password field, and submit button are present

### PLATFORM-ROUTES-006 — Badge renders its variant text

Priority: normal
Type: happy-path
Layer: component
Target: deployed
Automation: automated

Given the Badge component
When it renders with a variant
Then the badge text is visible

## Exclusions

- Visual and accessibility assertions for these pages live in Phase 4 plans.
- Authenticated route availability is covered by per-feature plans.
- Route ownership of `/login` is shared with `specs/ui/authentication/login.md` (the smoke suite owns
  the anonymous render check), and `/catalog/:id` is shared with `specs/ui/admin/books.md`
  (ADMIN-BOOKS-004) and `specs/ui/catalog/book-detail.md`.
- UI registration is feature-absent; there is no signup route to smoke-test.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| PLATFORM-ROUTES-001 | browser | `@PLATFORM-ROUTES-001` in e2e/tests/smoke/route-availability.spec.ts | automated |
| PLATFORM-ROUTES-002 | browser | `@PLATFORM-ROUTES-002` in e2e/tests/smoke/route-availability.spec.ts | automated |
| PLATFORM-ROUTES-003 | browser | `@PLATFORM-ROUTES-003` in e2e/tests/smoke/route-availability.spec.ts | automated |
| PLATFORM-ROUTES-004 | browser | `@PLATFORM-ROUTES-004` in e2e/tests/smoke/route-availability.spec.ts | automated |
| PLATFORM-ROUTES-005 | component | `PLATFORM-ROUTES-005` in frontend/src/pages/LoginPage.test.tsx | automated |
| PLATFORM-ROUTES-006 | component | `PLATFORM-ROUTES-006` in frontend/src/components/ui/Badge.test.tsx | automated |
