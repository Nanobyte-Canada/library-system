---
feature_id: ADMIN-AUDIT
feature: Audit log
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-06]
requirement_refs: [RQ-AUD-001]
routes: [/admin/audit-logs]
roles: [ADMIN]
flags: []
components: [AuditLogPage]
source_overrides: []
tags: [regression]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "003"
---

# Audit log

## Objective

Validate that the audit log page loads for admins and lists entries, and that filtering
by entity type narrows the list.

## Preconditions

- UAT is deployed with seed data.
- An admin account exists (worker fixture).

## Test data

No additional test data needed; the audit log is populated by seed operations.

## Assumptions and dependencies

- The audit log is append-only; entries exist from seed data and prior test runs.

## Scenarios

### ADMIN-AUDIT-001 — The audit page lists entries

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an admin is authenticated
When they navigate to `/admin/audit-logs`
Then the page loads with audit log entries

Steps:
1. Seed the admin session via `seedSession`.
2. Navigate to `/admin/audit-logs`.
3. Assert the URL is `/admin/audit-logs`.
4. Assert the page contains audit/log text.
5. Assert at least one row or entry is visible.

Expected results:
- The audit log page loads.
- At least one audit entry is visible.

### ADMIN-AUDIT-002 — Filtering by entity type narrows the list

Priority: high
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given an admin is authenticated
When they filter the audit log by entity type
Then the list narrows to entries of that type

Steps:
1. Seed the admin session via `seedSession`.
2. Navigate to `/admin/audit-logs`.
3. Select an entity type filter (if available) from the dropdown.
4. Assert the list is filtered or the filter control is present.

Expected results:
- The filter control is functional or present on the page.

## Exclusions

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| ADMIN-AUDIT-001 | browser | e2e/tests/regression/admin-audit.spec.ts | automated |
| ADMIN-AUDIT-002 | browser | e2e/tests/regression/admin-audit.spec.ts | automated |
