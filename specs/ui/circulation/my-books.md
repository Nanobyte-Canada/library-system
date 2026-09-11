---
feature_id: CIRC-MYBOOKS
feature: My books, loans, and renewals
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-03]
requirement_refs: [RQ-CIRC-001, RQ-CIRC-002, RQ-CIRC-003, RQ-CIRC-006]
routes: [/checkouts]
roles: [MEMBER]
flags: []
components: [MyBooksPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "006"
---

# My books, loans, and renewals

## Objective

Validate that the member's My Books page loads active loans, shows due dates and renew actions,
and that renewal semantics work correctly.

## Preconditions

- UAT is deployed with seed data.
- Run-scoped member, book, and copies exist (worker fixtures).

## Test data

Run-namespaced book, copies, and member created by the test via API fixtures.

## Assumptions and dependencies

- The My Books page shows checkout cards with title, due date, and renew button.
- Renewal is blocked when a pending reservation exists.

## Scenarios

### CIRC-MYBOOKS-001 — The page loads the member's active loans

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has an active loan
When they navigate to `/checkouts`
Then the loan card is visible with the book title

Steps:
1. Create a run-namespaced book and check it out via API.
2. Seed the member session via `seedSession`.
3. Navigate to `/checkouts`.
4. Assert a card containing the book title is visible.

Expected results:
- The `/checkouts` page loads.
- The loan card with the book title is visible.

### CIRC-MYBOOKS-002 — An active loan shows its due date and renew action

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has an active loan
When they view the loan card
Then the due date and renew button are visible

Steps:
1. Create a run-namespaced book and check it out via API.
2. Seed the member session via `seedSession`.
3. Navigate to `/checkouts`.
4. Assert the loan card shows a due date.
5. Assert the Renew button is visible on the card.

Expected results:
- The loan card contains a due date and a Renew button.

### CIRC-MYBOOKS-003 — A renewal extends the due date once

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has an active loan
When they click Renew on the loan card
Then the due date extends and the Renew button disappears

Steps:
1. Create a run-namespaced book and check it out via API.
2. Seed the member session via `seedSession`.
3. Navigate to `/checkouts`.
4. Click the Renew button on the loan card.
5. Assert the card shows "Renewed" text.
6. Assert the Renew button is no longer present.

Expected results:
- Renewal succeeds and the button is removed after renewal.

### CIRC-MYBOOKS-004 — Renewal is blocked when a pending reservation exists

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a member has an active loan for a book that has a pending reservation
When they attempt to renew
Then the renewal is blocked

Steps:
1. Create a run-namespaced book with 1 copy via API.
2. Create borrower and reserving users via API.
3. Check out the book for borrower via API.
4. Create a reservation for the reserving user via API.
5. Seed the borrower session via `seedSession`.
6. Navigate to `/checkouts`.
7. Click the Renew button on the loan card.
8. Assert the renewal request returns HTTP 400.
9. Assert the card does not show "Renewed".

Expected results:
- The API rejects the renewal with 400.
- The UI does not show "Renewed".

### CIRC-MYBOOKS-005 — The history lists returned loans

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has returned a book
When they navigate to `/checkouts`
Then the returned loan appears in the history

Steps:
1. Create a run-namespaced book and check it out via API.
2. Return the book via API.
3. Seed the member session via `seedSession`.
4. Navigate to `/checkouts`.
5. Assert the page contains a history or returned loan entry for the book title.

Expected results:
- The returned loan is visible in the history section.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| CIRC-MYBOOKS-001 | browser | e2e/tests/regression/circulation-my-books.spec.ts | automated |
| CIRC-MYBOOKS-002 | browser | e2e/tests/regression/circulation-my-books.spec.ts | automated |
| CIRC-MYBOOKS-003 | browser | e2e/tests/regression/circulation-my-books.spec.ts | automated |
| CIRC-MYBOOKS-004 | browser | e2e/tests/regression/circulation-my-books.spec.ts | automated |
| CIRC-MYBOOKS-005 | browser | e2e/tests/regression/circulation-my-books.spec.ts | automated |
