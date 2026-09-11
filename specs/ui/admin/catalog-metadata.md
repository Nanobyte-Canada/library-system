---
feature_id: ADMIN-META
feature: Catalog metadata (categories)
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-06]
requirement_refs: [RQ-BOOK-001]
routes: [/admin/categories]
roles: [ADMIN, LIBRARIAN]
flags: []
components: [CategoryListPage]
source_overrides: [frontend/src/pages/admin/CategoryListPage.tsx]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "005"
---

# Catalog metadata (categories)

## Objective

Prove category creation and parent selection through the categories modal.

## Scenarios

### ADMIN-META-001 — Create a root category

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a LIBRARIAN session on /admin/categories
When Add Category is submitted with a unique run-scoped name and no parent
Then the new category card is visible

### ADMIN-META-002 — Create a child category under a parent

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped root category
When a new category is submitted with that category selected as parent
Then the child appears under the parent card

### ADMIN-META-003 — Category name is required

Priority: normal
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given the category modal with an empty name
When Create is clicked
Then "Category name is required" is shown and the modal stays open

### ADMIN-META-004 — Category update is not implemented

Priority: normal
Type: not-applicable
Layer: manual
Target: deployed
Automation: not-applicable

Given an existing category
When Edit is clicked
Then the modal opens with existing values, but there is no `PUT /api/categories/{id}` endpoint and
submitting re-posts a create; this product gap is recorded for the owner and no automated scenario
asserts the broken behaviour

## Exclusions

- Category deletion has no endpoint or UI control.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| ADMIN-META-001 | browser | `@ADMIN-META-001` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-META-002 | browser | `@ADMIN-META-002` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-META-003 | browser | `@ADMIN-META-003` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-META-004 | manual | not applicable — no update endpoint or control | not-applicable |
