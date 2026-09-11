---
feature_id: RSV
feature: Reservation lifecycle
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-05]
requirement_refs: [RQ-RSV-001, RQ-RSV-002, RQ-RSV-003, RQ-RSV-004]
routes: [/reservations]
roles: [MEMBER, LIBRARIAN, ADMIN]
flags: []
components: [ReservationsPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "006"
---

# Reservation lifecycle

## Objective

Validate the full reservation lifecycle: a member reserves a book with zero available copies,
views the pending hold, cancels it, and staff marks a hold ready and fulfills it. UI assertions
cover the member's view; staff ready/fulfill are API-driven.

## Preconditions

- UAT is deployed with seed data.
- Run-scoped book with zero available copies exists.

## Test data

Run-namespaced book, copies, and users created by the test via API fixtures.

## Assumptions and dependencies

- The API rejects reservations while copies are available ("Copies are available — use checkout instead").
- ReservationsPage has no staff controls; staff actions are API-driven.

## Scenarios

### RSV-001 — A member reserves a book with zero available copies

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a book has zero available copies
When a member attempts to reserve via the API
Then the reservation is created

Steps:
1. Create a run-namespaced book with 1 copy via API.
2. Check out the copy so zero copies are available.
3. Create a reservation for the member via `POST /api/reservations`.
4. Assert the reservation was created (HTTP 200/201).

Expected results:
- The reservation is created successfully when no copies are available.

### RSV-002 — My reservations lists the pending hold

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has a pending reservation
When they navigate to `/reservations`
Then the reservation is visible

Steps:
1. Create a book with zero available copies and a reservation via API.
2. Seed the member session via `seedSession`.
3. Navigate to `/reservations`.
4. Assert the page contains the book title.

Expected results:
- The reservations page shows the pending hold.

### RSV-003 — A member cancels their own pending reservation

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has a pending reservation
When they cancel it via the API
Then the reservation is removed

Steps:
1. Create a book with zero available copies and a reservation via API.
2. Seed the member session via `seedSession`.
3. Navigate to `/reservations`.
4. Cancel the reservation via `DELETE /api/reservations/{id}`.
5. Assert the reservation no longer appears.

Expected results:
- The reservation is cancelled and no longer shown.

### RSV-004 — Staff marks a hold ready

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has a pending reservation
When staff marks it ready via the API
Then the reservation status changes to READY

Steps:
1. Create a book with zero available copies and a reservation via API.
2. Mark the reservation ready via `POST /api/reservations/{id}/ready` (admin auth).
3. Seed the member session via `seedSession`.
4. Navigate to `/reservations`.
5. Assert the reservation status text shows READY.

Expected results:
- The reservation status is READY after the staff action.

### RSV-005 — Staff fulfills a ready hold

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a reservation is in READY status
When staff fulfills it via the API
Then the reservation is fulfilled and the book is checked out

Steps:
1. Create a book with zero available copies and a reservation via API.
2. Mark the reservation ready via `POST /api/reservations/{id}/ready` (admin auth).
3. Fulfill the reservation via `POST /api/reservations/{id}/fulfill` (admin auth).
4. Seed the member session via `seedSession`.
5. Navigate to `/reservations`.
6. Assert the reservation status shows fulfilled or is no longer pending.

Expected results:
- The reservation is fulfilled.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| RSV-001 | browser | e2e/tests/regression/reservations-lifecycle.spec.ts | automated |
| RSV-002 | browser | e2e/tests/regression/reservations-lifecycle.spec.ts | automated |
| RSV-003 | browser | e2e/tests/regression/reservations-lifecycle.spec.ts | automated |
| RSV-004 | browser | e2e/tests/regression/reservations-lifecycle.spec.ts | automated |
| RSV-005 | browser | e2e/tests/regression/reservations-lifecycle.spec.ts | automated |
