---
feature_id: AUTH-LOGIN
feature: Login
owner: saurabhbilakhia
status: approved
priority: critical
critical_journeys: [CJ-01]
requirement_refs: [RQ-AUTH-001, RQ-AUTH-002, RQ-AUTH-003, RQ-AUTH-007]
routes: [/login]
roles: [anonymous]
flags: []
components: [LoginPage]
source_overrides: [frontend/src/pages/LoginPage.tsx, frontend/src/services/authService.ts]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: saurabhbilakhia
  approved_on: "2026-09-11"
  requirement_version: "f13e2fa"
next_id: "014"
---

# Login

## Objective

Prove the login form's success, failure, validation, loading, navigation, keyboard, and mobile behavior.

## Preconditions

The worker-scoped `member` fixture creates a run-namespaced account through the registration API. The
committed seed `admin` account is used only where a fixed role is required; its credentials are committed,
not secret.

## Test data

Run-namespaced member (`identity('member')`); unknown account `identity('unknown')`; never a shared account
for failure cases.

## Scenarios

### AUTH-LOGIN-001 — Valid credentials reach the dashboard

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a registered member
When they submit valid credentials
Then the URL is /dashboard and the authenticated app shell renders

### AUTH-LOGIN-002 — Invalid password shows a generic error

Priority: critical
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a registered member
When they submit a wrong password
Then a generic error is visible and the URL is still /login

### AUTH-LOGIN-003 — Unknown account shows the same generic error

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a username that was never registered
When the login form is submitted
Then the same generic error is visible and the URL stays /login (no account enumeration)

### AUTH-LOGIN-004 — Empty fields block submission

Priority: high
Type: boundary
Layer: browser
Target: deployed
Automation: automated

Given an empty login form
When Sign In is clicked
Then no POST /api/auth/login is issued within the bounded negative window and the URL stays /login

### AUTH-LOGIN-005 — Enter submits the form

Priority: high
Type: navigation
Layer: browser
Target: deployed
Automation: automated

Given filled credentials
When Enter is pressed in the password field
Then login succeeds exactly as a button click would

### AUTH-LOGIN-006 — Service failure shows a recoverable error

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given the login API responds 503 (intercepted in the browser)
When any credentials are submitted
Then the generic error is visible, the page does not crash, and the URL stays /login

### AUTH-LOGIN-007 — Pending state prevents duplicate submissions

Priority: high
Type: boundary
Layer: browser
Target: deployed
Automation: automated

Given the login API response is delayed (intercepted in the browser)
When Sign In is clicked once
Then the button shows "Signing in...", is disabled while the request is in flight, only one POST is issued,
and the app reaches /dashboard

### AUTH-LOGIN-008 — Keyboard-only interaction works

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given the login page
When the user tabs from the username field
Then focus moves through password and Sign In in order and the form submits with the keyboard

### AUTH-LOGIN-009 — Password is masked

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given the login page
When the password field is inspected
Then its type is password and no unapproved reveal behavior exists

### AUTH-LOGIN-010 — Mobile viewport keeps the form operable

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given an emulated mobile viewport
When a member logs in
Then fields and the submit control are not clipped and login succeeds

### AUTH-LOGIN-011 — Pending state disables submit (component)

Priority: high
Type: boundary
Layer: component
Target: deployed
Automation: automated

Given the LoginPage component with a login call that never resolves
When the form is submitted
Then the button shows "Signing in..." and is disabled

### AUTH-LOGIN-012 — API failure renders the generic error (component)

Priority: high
Type: negative
Layer: component
Target: deployed
Automation: automated

Given the LoginPage component with a rejected login call
When the form is submitted
Then the generic error renders and no navigation occurs

### AUTH-LOGIN-013 — Successful login stores the token and navigates (component)

Priority: critical
Type: happy-path
Layer: component
Target: deployed
Automation: automated

Given the LoginPage component with a resolved login call
When the form is submitted
Then the token is stored and navigation to /dashboard occurs

## Exclusions

- Self-registration UI: `POST /api/auth/register` exists but there is no `/register` page (feature-absent);
  registration API behavior stays covered by the backend integration suite (`RegistrationIntegrationTest.kt`).
- Password recovery: no route and no API (feature-absent).
- Email verification/welcome email: no mail transport (feature-absent).
- Password policy and whitespace normalization: no policy exists beyond required fields, and the login field
  is a username, not an email (not-applicable).
- Authenticated visitor on /login: no redirect behavior is defined or implemented; owner decision required
  before this can become a requirement (not-applicable).
- Account lockout/rate limiting/captcha: not implemented.
- Visual and accessibility (axe) scans of this page: Phase 4 plans.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| AUTH-LOGIN-001 | browser | `@AUTH-LOGIN-001` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-002 | browser | `@AUTH-LOGIN-002` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-003 | browser | `@AUTH-LOGIN-003` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-004 | browser | `@AUTH-LOGIN-004` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-005 | browser | `@AUTH-LOGIN-005` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-006 | browser | `@AUTH-LOGIN-006` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-007 | browser | `@AUTH-LOGIN-007` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-008 | browser | `@AUTH-LOGIN-008` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-009 | browser | `@AUTH-LOGIN-009` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-010 | browser | `@AUTH-LOGIN-010` in e2e/tests/regression/auth-login.spec.ts | automated |
| AUTH-LOGIN-011 | component | `AUTH-LOGIN-011` in frontend/src/pages/LoginPage.test.tsx | automated |
| AUTH-LOGIN-012 | component | `AUTH-LOGIN-012` in frontend/src/pages/LoginPage.test.tsx | automated |
| AUTH-LOGIN-013 | component | `AUTH-LOGIN-013` in frontend/src/pages/LoginPage.test.tsx | automated |
