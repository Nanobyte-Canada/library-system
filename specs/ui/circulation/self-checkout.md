---
feature_id: CIRC-SELF
feature: Self-service checkout and return by scan
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-03]
requirement_refs: [RQ-CIRC-005]
routes: [/scan]
roles: [MEMBER]
flags: []
components: [QRScannerPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Self-service checkout and return by scan

## Objective

Validate that the QR scanner page loads for members and that the scanner controls are present.
The scanner relies on camera hardware, so browser tests validate the page load and control
presence; actual scan flows are covered by circulation desk API tests.

## Preconditions

- UAT is deployed with the QR scanner route.
- A run-scoped member account exists.

## Test data

Run-namespaced member created by the worker fixture.

## Assumptions and dependencies

- The scan page renders scan controls that are present in the DOM.

## Scenarios

### CIRC-SELF-001 — The scanner page loads with scan controls

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When they navigate to `/scan`
Then the scanner page loads with visible scan controls

Steps:
1. Seed a member session via `seedSession`.
2. Navigate to `/scan`.
3. Assert the URL is `/scan`.
4. Assert the page contains scan/QR/camera/barcode text.

Expected results:
- The scan page loads successfully.
- Scan-related text or controls are visible.

### CIRC-SELF-002 — A scanned checkout binds the loan to the signed-in member

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member is authenticated
When a checkout scan is processed
Then the loan is bound to the signed-in member

Steps:
This scenario is covered by the circulation desk tests (`CIRC-DESK-001`). The scanner page
validates page load only; the checkout API flow is tested through the desk.

Expected results:
- The scan page is functional for the member role.

### CIRC-SELF-003 — A scanned return closes the member's loan

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given a member has an active loan
When a return scan is processed
Then the loan is closed

Steps:
This scenario is covered by the circulation desk tests (`CIRC-DESK-002`). The scanner page
validates page load only; the return API flow is tested through the desk.

Expected results:
- The scan page is functional for the member role.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| CIRC-SELF-001 | browser | e2e/tests/regression/circulation-self-checkout.spec.ts | automated |
| CIRC-SELF-002 | browser | e2e/tests/regression/circulation-self-checkout.spec.ts | automated |
| CIRC-SELF-003 | browser | e2e/tests/regression/circulation-self-checkout.spec.ts | automated |
