---
feature_id: CATALOG-SEARCH
feature: Catalog search and results
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-02]
requirement_refs: [RQ-CAT-001, RQ-CAT-002]
routes: [/catalog]
roles: [MEMBER, LIBRARIAN, ADMIN]
flags: []
components: [CatalogPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Catalog search and results

## Objective

Validate that members, librarians, and admins can browse the catalog, search by title/author/ISBN,
and receive meaningful empty-state feedback when no results match.

## Preconditions

- UAT is deployed with seed data (books, categories).
- A run-scoped member account exists (worker fixture).

## Test data

Run-namespaced books and categories created by the test via API fixtures.

## Assumptions and dependencies

- The catalog page loads book cards asynchronously.
- Search is triggered by typing in the search input and pressing Enter or a search button.

## Scenarios

### CATALOG-SEARCH-001 — Member browses the catalog and sees books

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they navigate to `/catalog`
Then the catalog renders book cards and at least one book title is visible

Steps:
1. Seed a member session via `seedSession`.
2. Navigate to `/catalog`.
3. Assert the URL is `/catalog`.
4. Wait for book cards to render.
5. Assert at least one book title is visible.

Expected results:
- The catalog page loads successfully.
- Book cards are rendered.
- At least one book title from seed data or test data is visible.

### CATALOG-SEARCH-002 — Search by title, author, or ISBN returns matching books

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a librarian is authenticated
When they search the catalog for a known title
Then the results contain the matching book

Steps:
1. Create a run-namespaced book via API.
2. Seed a librarian session via `seedSession`.
3. Navigate to `/catalog`.
4. Fill the search input with the book title.
5. Press Enter to trigger the search.
6. Assert the result list contains the created book title.

Expected results:
- The search input is present.
- After searching, the result list contains the matching book.

### CATALOG-SEARCH-003 — An unmatched query shows the no-results state

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they search for a term that matches no books
Then the catalog shows an empty or no-results state

Steps:
1. Seed a member session via `seedSession`.
2. Navigate to `/catalog`.
3. Fill the search input with `NO-BOOK-MATCHES-${runId}`.
4. Press Enter to trigger the search.
5. Assert no book cards are visible, or an empty-state message is shown.

Expected results:
- The search completes without error.
- No book cards are rendered for the unmatched query.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| CATALOG-SEARCH-001 | browser | e2e/tests/regression/catalog-search.spec.ts | automated |
| CATALOG-SEARCH-002 | browser | e2e/tests/regression/catalog-search.spec.ts | automated |
| CATALOG-SEARCH-003 | browser | e2e/tests/regression/catalog-search.spec.ts | automated |
