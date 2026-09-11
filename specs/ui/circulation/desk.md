---
feature_id: CIRC-DESK
feature: Staff circulation desk and loan lifecycle
owner: saurabhbilakhia
status: draft
priority: critical
critical_journeys: [CJ-04]
requirement_refs: [RQ-CIRC-001, RQ-CIRC-002, RQ-CIRC-003, RQ-CIRC-004]
routes: [/checkout-desk]
roles: [ADMIN, LIBRARIAN, MEMBER]
flags: []
components: [CheckoutDeskPage, MyBooksPage]
source_overrides: [frontend/src/pages/librarian/CheckoutDeskPage.tsx, frontend/src/pages/member/MyBooksPage.tsx]
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "007"
---

# Staff circulation desk and loan lifecycle

## Objective

Prove the staff checkout and return desk, the 3-book borrowing limit, the single-renewal rule, and the
reservation block on renewal. Every scenario uses a run-scoped book and member so no shared seed data
is mutated.

## Preconditions

A run-scoped branch, members, and books with one or more available copies exist. Copies are created
through `POST /api/books/{id}/copies` (there are no copy-management controls in the admin UI).

## Scenarios

### CIRC-DESK-001 — Staff checks out a copy for a member

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a LIBRARIAN session on /checkout-desk and a run-scoped member with an available copy
When the member id and the copy identifier are submitted in Checkout mode
Then the success banner reports the checkout and the due date

### CIRC-DESK-002 — Staff returns a copy

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an active checkout created through the API
When the copy identifier is submitted in Return mode
Then the success banner reports the return

### CIRC-DESK-003 — Unknown identifier shows a recoverable error

Priority: normal
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given a LIBRARIAN session on /checkout-desk
When an unknown copy identifier is submitted
Then an error banner reports "Copy not found" and the form remains usable

### CIRC-DESK-004 — The 3-book borrowing limit blocks a fourth checkout

Priority: high
Type: boundary
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped member already holding three active loans created through the API
When a fourth checkout is attempted at the desk
Then the error banner reports "Borrowing limit reached. Maximum 3 books allowed."

### CIRC-DESK-005 — One renewal extends the loan and is not repeatable

Priority: high
Type: boundary
Layer: browser
Target: deployed
Automation: automated

Given a run-scoped member with one active loan
When Renew is clicked on /checkouts
Then the card shows the Renewed state and the Renew control disappears (the API rejects a second renewal)

### CIRC-DESK-006 — A pending reservation blocks renewal

Priority: high
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given the only copy is on loan and another member has a PENDING reservation for the book
When Renew is clicked on /checkouts
Then the renewal API responds 400 and the card never shows the Renewed state

## Exclusions

- The desk sends the Book Barcode field value as `copyId`, so barcode-only checkout cannot succeed
  today; the automated scenarios use the copy id returned by `GET /api/books/{id}/copies` and this
  product gap is recorded for the owner. Invalid-barcode handling is covered by CIRC-DESK-003 through
  the API error path.
- My Books does not render the renewal error message; CIRC-DESK-006 asserts the observable absence of
  the Renewed state and the 400 response instead. Error surfacing is recorded as a product gap.
- Fines are not implemented and are not a circulation scenario.

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| CIRC-DESK-001 | browser | `@CIRC-DESK-001` in e2e/tests/regression/circulation-desk.spec.ts | automated |
| CIRC-DESK-002 | browser | `@CIRC-DESK-002` in e2e/tests/regression/circulation-desk.spec.ts | automated |
| CIRC-DESK-003 | browser | `@CIRC-DESK-003` in e2e/tests/regression/circulation-desk.spec.ts | automated |
| CIRC-DESK-004 | browser | `@CIRC-DESK-004` in e2e/tests/regression/circulation-desk.spec.ts | automated |
| CIRC-DESK-005 | browser | `@CIRC-DESK-005` in e2e/tests/regression/circulation-desk.spec.ts | automated |
| CIRC-DESK-006 | browser | `@CIRC-DESK-006` in e2e/tests/regression/circulation-desk.spec.ts | automated |
