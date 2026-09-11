---
feature_id: ADMIN-BRANCHES
feature: Branch administration
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-06]
requirement_refs: [RQ-BR-001, RQ-BR-002]
routes: [/admin/branches, /admin/branches/new, /admin/branches/:id]
roles: [ADMIN]
flags: []
components: [BranchListPage, BranchFormPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Branch administration

## Objective

Validate that the admin branch list shows seed branches, that an admin can create a
run-namespaced branch, and that an admin can edit an existing branch. Tests never delete
a branch because deletion cascades book copies.

## Preconditions

- UAT is deployed with seed data (branches).
- An admin account exists (worker fixture).

## Test data

Run-namespaced branch created by the test via API fixtures.

## Assumptions and dependencies

- Branches are seeded by Flyway migrations.

## Scenarios

### ADMIN-BRANCHES-001 — The branches list shows seed branches

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an admin is authenticated
When they navigate to `/admin/branches`
Then the branch list shows seed branch names

Steps:
1. Seed the admin session via `seedSession`.
2. Navigate to `/admin/branches`.
3. Assert the URL is `/admin/branches`.
4. Assert the page body contains seed branch text (central/north/east).

Expected results:
- The branches page loads.
- At least one seed branch name is visible.

### ADMIN-BRANCHES-002 — An admin creates a run-namespaced branch

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an admin is authenticated
When they fill the branch creation form with a run-namespaced name
Then the branch is created and appears in the list

Steps:
1. Seed the admin session via `seedSession`.
2. Navigate to `/admin/branches/new`.
3. Fill the Name field with `PW ${branchName()}`.
4. Click the Create/Save button.
5. Assert the page remains functional (layout visible, no crash).
6. Navigate to `/admin/branches`.
7. Assert the new branch name appears in the list.

Expected results:
- The branch creation form submits.
- The new branch is visible in the branch list.

### ADMIN-BRANCHES-003 — An admin edits a branch

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an admin is authenticated and a branch exists
When they edit the branch name
Then the updated name is saved

Steps:
1. Seed the admin session via `seedSession`.
2. Navigate to `/admin/branches`.
3. Click the edit link for the first branch.
4. Change the name to include "updated".
5. Click the Save/Update button.
6. Assert the page remains functional.

Expected results:
- The edit form submits without error.

## Exclusions

Tests never delete a branch — deletion cascades book copies.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| ADMIN-BRANCHES-001 | browser | e2e/tests/regression/admin-branches.spec.ts | automated |
| ADMIN-BRANCHES-002 | browser | e2e/tests/regression/admin-branches.spec.ts | automated |
| ADMIN-BRANCHES-003 | browser | e2e/tests/regression/admin-branches.spec.ts | automated |
