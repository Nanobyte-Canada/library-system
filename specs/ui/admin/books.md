---
feature_id: ADMIN-BOOKS
feature: Book administration
owner: saurabhbilakhia
status: draft
priority: critical
critical_journeys: [CJ-06]
requirement_refs: [RQ-BOOK-001, RQ-BOOK-002, RQ-BOOK-003, RQ-BOOK-004]
routes: [/admin/books, /admin/books/new, /admin/books/:id, /catalog/:id]
roles: [ADMIN, LIBRARIAN]
flags: []
components: [BookListPage, BookFormPage, BookDetailPage]
source_overrides: [frontend/src/pages/admin/BookListPage.tsx, frontend/src/pages/admin/BookFormPage.tsx]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "006"
---

# Book administration

## Objective

Prove that ADMIN and LIBRARIAN create and update catalog records through the UI and that copy
availability created through the API is visible to readers.

## Scenarios

### ADMIN-BOOKS-001 — Create a book with category and metadata

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an ADMIN session on the new-book form with a run-scoped category
When title, author, publication, language, category, and location are submitted
Then "Book created successfully" appears, the list returns, and the new title is visible

### ADMIN-BOOKS-002 — Update a book

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped book
When its title is changed on the edit form and submitted
Then "Book updated successfully" appears and the change is persisted

### ADMIN-BOOKS-003 — Required fields block submission

Priority: normal
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given the new-book form with Author filled but Title empty
When Create Book is submitted
Then the browser blocks the submission, the form stays on screen, and no success message appears

### ADMIN-BOOKS-004 — Copies created through the API appear as availability

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped book with two copies created through `POST /api/books/{id}/copies`
When the book detail page is opened
Then "2 of 2 copies available" is shown

### ADMIN-BOOKS-005 — Copy transfer has no UI

Priority: normal
Type: not-applicable
Layer: manual
Target: deployed
Automation: not-applicable

Given the admin book pages
Then no transfer control exists; `POST /api/books/{id}/transfer` is covered by backend integration tests
And the plan records the missing UI control for the owner

## Exclusions

- QR generation (`GET /api/books/{id}/qr`) has no admin UI; it is covered by backend integration tests.
- The category picker behaviour is covered by the catalog-metadata plan.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| ADMIN-BOOKS-001 | browser | `@ADMIN-BOOKS-001` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-BOOKS-002 | browser | `@ADMIN-BOOKS-002` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-BOOKS-003 | browser | `@ADMIN-BOOKS-003` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-BOOKS-004 | browser | `@ADMIN-BOOKS-004` in e2e/tests/regression/admin-catalog.spec.ts | automated |
| ADMIN-BOOKS-005 | manual | not applicable — no UI control | not-applicable |
