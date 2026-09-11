---
feature_id: CATALOG-DETAIL
feature: Book detail and availability
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-02]
requirement_refs: [RQ-CAT-002, RQ-CAT-003]
routes: [/catalog/:id]
roles: [MEMBER, LIBRARIAN, ADMIN]
flags: []
components: [BookDetailPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Book detail and availability

## Objective

Validate that clicking a book in the catalog opens the detail page, that metadata (ISBN, author,
publication, description) is shown, and that copy availability is displayed.

## Preconditions

- UAT is deployed with seed data.
- A run-scoped book with copies exists (worker fixture).

## Test data

Run-namespaced book created by the test via API fixtures.

## Assumptions and dependencies

- Book detail is navigated to by clicking a catalog card or by direct URL with the book ID.

## Scenarios

### CATALOG-DETAIL-001 — Open a detail page from catalog results

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they click a book card in the catalog
Then the detail page loads with the book's title

Steps:
1. Create a run-namespaced book via API.
2. Seed a member session via `seedSession`.
3. Navigate to `/catalog/${book.id}`.
4. Assert the URL matches `/catalog/${book.id}`.
5. Assert the book title is visible.

Expected results:
- The detail page loads successfully.
- The book title is displayed.

### CATALOG-DETAIL-002 — The detail shows ISBN, author, publication, and description

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they open a book's detail page
Then the ISBN, author, publication, and description are visible

Steps:
1. Create a run-namespaced book via API with known author and ISBN.
2. Seed a member session via `seedSession`.
3. Navigate to `/catalog/${book.id}`.
4. Assert the ISBN is visible on the page.
5. Assert the author is visible on the page.
6. Assert the publication is visible on the page.

Expected results:
- ISBN, author, and publication text are visible on the detail page.

### CATALOG-DETAIL-003 — The detail shows copy availability and the reserve entry for a member

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they open a book's detail page
Then the copy availability count is displayed

Steps:
1. Create a run-namespaced book with 2 copies via API.
2. Seed a member session via `seedSession`.
3. Navigate to `/catalog/${book.id}`.
4. Assert the copy availability text shows `2 of 2 copies available`.

Expected results:
- The copy availability count is displayed on the detail page.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| CATALOG-DETAIL-001 | browser | e2e/tests/regression/catalog-book-detail.spec.ts | automated |
| CATALOG-DETAIL-002 | browser | e2e/tests/regression/catalog-book-detail.spec.ts | automated |
| CATALOG-DETAIL-003 | browser | e2e/tests/regression/catalog-book-detail.spec.ts | automated |
