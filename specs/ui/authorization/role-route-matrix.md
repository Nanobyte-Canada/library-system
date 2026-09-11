---
feature_id: AUTHZ
feature: Authorization role x route matrix
owner: saurabhbilakhia
status: draft
priority: critical
critical_journeys: [CJ-07]
requirement_refs: [RQ-AUTHZ-001, RQ-AUTHZ-002, RQ-UI-001, RQ-UI-002]
routes: [/login, /dashboard, /catalog, /catalog/:id, /profile, /reservations, /checkouts, /scan, /checkout-desk, /admin/books, /admin/books/new, /admin/books/:id, /admin/categories, /admin/users, /admin/users/new, /admin/users/:id, /admin/branches, /admin/branches/new, /admin/branches/:id, /admin/audit-logs]
roles: [anonymous, MEMBER, LIBRARIAN, ADMIN]
flags: []
components: [ProtectedRoute, Layout, App]
source_overrides: [frontend/src/App.tsx, frontend/src/components/ProtectedRoute.tsx, frontend/src/components/Layout.tsx]
tags: [regression, authorization]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "008"
---

# Authorization role x route matrix

## Objective

Prove the visible authorization boundaries: anonymous visitors cannot reach guarded routes, ADMIN can
reach every route, LIBRARIAN can reach book and category administration but not user, branch, or audit
administration, and MEMBER is redirected away from every admin route. The sidebar is a display filter
only; the route guard is the enforcement under test for direct navigation.

## Preconditions

`admin`, `librarian`, and `member` fixtures exist; `runBranch`, `catalogBook`, and `catalogCopies`
fixtures provide real ids for the parameterised admin routes.

## Scenarios

### AUTHZ-001 — Anonymous access to guarded routes redirects to login

Priority: critical
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given no session
When every guarded route is opened directly, including parameterised admin routes
Then each redirects to /login

### AUTHZ-002 — ADMIN reaches every route

Priority: critical
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given an ADMIN session
When every route is opened directly with real record ids
Then none redirects to /login or /dashboard

### AUTHZ-003 — LIBRARIAN reaches books and categories but not system administration

Priority: critical
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a LIBRARIAN session
When admin book and category routes are opened directly
Then they render; when user, branch, and audit routes are opened directly
Then each redirects to /dashboard

### AUTHZ-004 — MEMBER is redirected from admin routes to the dashboard

Priority: critical
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a MEMBER session
When every /admin route is opened directly
Then each redirects to /dashboard

### AUTHZ-005 — Checkout desk direct navigation documents the guard boundary

Priority: high
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given a MEMBER or LIBRARIAN session
When /checkout-desk is opened directly
Then the page renders because the route guard checks authentication only
And the Checkout Desk sidebar link is absent, matching the ADMIN-only navigation rule

### AUTHZ-006 — Sidebar sections follow the role matrix

Priority: high
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given an ADMIN session Then Books, Categories, Users, Branches, Audit Log, and Checkout Desk links are visible
Given a LIBRARIAN session Then Books and Categories are visible and the System Admin links are absent
Given a MEMBER session Then the Library Admin and System Admin links are absent and the Main links remain visible

### AUTHZ-007 — API role enforcement spot-checks

Priority: high
Type: authorization
Layer: browser
Target: deployed
Automation: automated

Given an anonymous request to an admin endpoint Then the response is 403 (no 401 entry point is configured)
Given a MEMBER or LIBRARIAN request to a user, audit, or staff checkout endpoint Then the response is 403
Given an ADMIN request to the same endpoint Then the response is 200

## Exclusions

- The sidebar is rendered by `Layout.tsx` for every authenticated route; the sidebar role matrix is
  checked in AUTHZ-005 and AUTHZ-006 and is not repeated per route.
- The catch-all route is excluded in `specs/ui/route-exclusions.json` and is behaviourally covered by
  the route-availability redirect scenarios.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| AUTHZ-001 | browser | `@AUTHZ-001` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-002 | browser | `@AUTHZ-002` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-003 | browser | `@AUTHZ-003` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-004 | browser | `@AUTHZ-004` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-005 | browser | `@AUTHZ-005` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-006 | browser | `@AUTHZ-006` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
| AUTHZ-007 | browser | `@AUTHZ-007` in e2e/tests/regression/authz-role-matrix.spec.ts | automated |
