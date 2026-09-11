---
feature_id: ADMIN-USERS
feature: User administration and self-service profile
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-06, CJ-01]
requirement_refs: [RQ-USER-001, RQ-USER-002, RQ-USER-003]
routes: [/admin/users, /admin/users/new, /admin/users/:id, /profile]
roles: [ADMIN, MEMBER]
flags: []
components: [UserListPage, UserFormPage, ProfilePage]
source_overrides: [frontend/src/pages/admin/UserListPage.tsx, frontend/src/pages/admin/UserFormPage.tsx, frontend/src/pages/member/ProfilePage.tsx]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "008"
---

# User administration and self-service profile

## Objective

Prove that ADMIN creates and edits users through the UI, that role and branch assignment persist,
that list search and role filtering work, and that a signed-in user maintains their own profile and
password.

## Preconditions

`admin` can create users; `member` is a run-scoped account. New users are created with unique
run-namespaced emails and membership IDs.

## Scenarios

### ADMIN-USERS-001 — ADMIN creates a user with role and branch

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an ADMIN session on the new-user form
When the required fields, role, membership type, branch, and password are submitted
Then the success message appears, the app returns to the list, and the new user's row shows the role and branch

### ADMIN-USERS-002 — ADMIN changes a user role

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped MEMBER user
When the ADMIN changes Role to LIBRARIAN on the edit form and submits
Then the success message appears and the update is persisted

### ADMIN-USERS-003 — Status is displayed but not editable in the UI

Priority: normal
Type: boundary
Layer: browser
Target: deployed
Automation: automated

Given the user list
Then every row shows an Active or Inactive badge
And no status control is rendered (the UI never sends `isActive`; status changes are API-only until a control exists)

### ADMIN-USERS-004 — List search and role filter

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given run-namespaced users exist
When the ADMIN types a unique name fragment Then only matching rows remain
When the ADMIN selects the MEMBER role filter Then no LIBRARIAN or ADMIN badge remains

### ADMIN-USERS-005 — User edits their own profile

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a signed-in member on /profile
When First Name is changed and Save Changes is submitted
Then "Profile updated successfully" appears and the header shows the new name

### ADMIN-USERS-006 — User changes their own password

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a signed-in run-scoped user
When the current and a new password are submitted
Then "Password changed successfully" appears, the new password authenticates, and the old password is rejected

### ADMIN-USERS-007 — Duplicate email is rejected

Priority: normal
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given an existing run-namespaced user
When the ADMIN submits the new-user form with the same email
Then an error banner with the duplicate-email message appears and the user list is unchanged

## Exclusions

- Registration UI is feature-absent (API-only); the registration endpoint is covered by backend
  integration tests.
- Deactivation/activation has no UI control; `PUT /api/users/{id}` `isActive` behaviour remains
  backend-covered until a control exists.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| ADMIN-USERS-001 | browser | `@ADMIN-USERS-001` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-002 | browser | `@ADMIN-USERS-002` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-003 | browser | `@ADMIN-USERS-003` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-004 | browser | `@ADMIN-USERS-004` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-005 | browser | `@ADMIN-USERS-005` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-006 | browser | `@ADMIN-USERS-006` in e2e/tests/regression/admin-users.spec.ts | automated |
| ADMIN-USERS-007 | browser | `@ADMIN-USERS-007` in e2e/tests/regression/admin-users.spec.ts | automated |
