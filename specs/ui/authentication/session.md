---
feature_id: AUTH-SESSION
feature: Session and logout
owner: saurabhbilakhia
status: approved
priority: critical
critical_journeys: [CJ-01, CJ-07]
requirement_refs: [RQ-AUTH-004, RQ-AUTH-005, RQ-AUTH-006, RQ-AUTHZ-001]
routes: [/dashboard, /admin/books, /checkout-desk, /login]
roles: [anonymous, MEMBER, LIBRARIAN, ADMIN]
flags: []
components: [ProtectedRoute, Layout]
source_overrides: [frontend/src/components/ProtectedRoute.tsx, frontend/src/stores/authStore.ts, frontend/src/services/api.ts]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: saurabhbilakhia
  approved_on: "2026-09-11"
  requirement_version: "f13e2fa"
next_id: "010"
---

# Session and logout

## Objective

Prove session persistence, invalid-token handling, protected-route guarding, logout, and the role boundary
on guarded routes.

## Preconditions

Stored sessions are seeded through the API token, not UI login, except where the login UI itself is under
test. Run-namespaced member and librarian accounts exist; the seed admin account is committed.

## Scenarios

### AUTH-SESSION-001 — Logout clears the session

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member in the app shell
When the "Log out" button is clicked
Then the URL is /login and the stored token is removed

### AUTH-SESSION-002 — Unauthenticated access redirects to login

Priority: critical
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given no session
When /dashboard is opened
Then the URL becomes /login

### AUTH-SESSION-003 — Refresh keeps a valid session

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member on /dashboard
When the page is reloaded
Then /dashboard still renders without a login redirect

### AUTH-SESSION-004 — Invalid token is rejected by the API without a redirect

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a corrupt token in storage and an authenticated store state
When an authenticated API route that loads user data (/profile) is opened
Then the API rejects the request (HTTP 403 under the current security configuration) and the page surfaces the failure
And no automatic redirect to /login occurs, because the interceptor only handles HTTP 401 (known gap; normalization is an open item)

Expected results:
- The protected page does not display API data.
- The rejection is observable as an error state, not a silent success.

### AUTH-SESSION-005 — Deep link works with a valid session

Priority: high
Type: navigation
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member
When a deep authenticated route (/catalog) is opened directly
Then the page renders without a login redirect

### AUTH-SESSION-006 — Librarian reaches a role-guarded admin route

Priority: high
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a librarian session
When /admin/books is opened directly
Then the route renders (the guard allows ADMIN and LIBRARIAN)

### AUTH-SESSION-007 — Admin reaches a role-guarded admin route

Priority: high
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a seed admin session
When /admin/users is opened directly
Then the route renders

### AUTH-SESSION-008 — Member is redirected from admin routes to the dashboard

Priority: critical
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a member session
When /admin/books is opened directly
Then the app redirects to /dashboard

### AUTH-SESSION-009 — Member direct navigation to the checkout desk documents current behavior

Priority: normal
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a member session
When /checkout-desk is opened directly
Then the page renders because the route guard checks authentication only, and the ADMIN-only "Checkout
Desk" sidebar link is absent

## Exclusions

- Full role x route matrix: Phase 3 authorization plan (specs/ui/authorization/role-route-matrix.md).
- Real token expiry (~16 h 40 min): cannot be waited out in CI; AUTH-SESSION-004 proves the rejection path (403 under the current configuration).
- Server-side 403 enforcement spot-checks: Phase 3 AUTHZ scenarios.
- Registration/recovery/email: feature-absent (see login.md).

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| AUTH-SESSION-001 | browser | `@AUTH-SESSION-001` in e2e/tests/regression/auth-session.spec.ts | automated |
| AUTH-SESSION-002 | browser | `@AUTH-SESSION-002` in e2e/tests/regression/auth-session.spec.ts | automated |
| AUTH-SESSION-003 | browser | `@AUTH-SESSION-003` in e2e/tests/regression/auth-session.spec.ts | automated |
| AUTH-SESSION-004 | browser | `@AUTH-SESSION-004` in e2e/tests/regression/auth-session.spec.ts | automated |
| AUTH-SESSION-005 | browser | `@AUTH-SESSION-005` in e2e/tests/regression/auth-session.spec.ts | automated |
| AUTH-SESSION-006 | browser | `@AUTH-SESSION-006` in e2e/tests/regression/auth-guard.spec.ts | automated |
| AUTH-SESSION-007 | browser | `@AUTH-SESSION-007` in e2e/tests/regression/auth-guard.spec.ts | automated |
| AUTH-SESSION-008 | browser | `@AUTH-SESSION-008` in e2e/tests/regression/auth-guard.spec.ts | automated |
| AUTH-SESSION-009 | browser | `@AUTH-SESSION-009` in e2e/tests/regression/auth-guard.spec.ts | automated |
