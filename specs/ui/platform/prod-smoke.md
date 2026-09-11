---
feature_id: PROD-SMOKE
feature: Production smoke
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: []
requirement_refs: [RQ-UI-001]
routes: [/login]
roles: [anonymous]
flags: []
components: []
source_overrides: []
tags: [prod]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "003"
---

# Production smoke

## Objective

Read-only production checks after a successful production deploy (or manual dispatch): availability,
public route rendering, and absence of test-support endpoints. Runs never log in, never register, and
never mutate data.

## Scenarios

### PROD-SMOKE-001 — Production is available and identified as production

Priority: critical
Type: happy-path
Layer: browser
Target: deployed
Automation: automated

Given the production deployment
When /health and the public books API are requested and /login is opened
Then all respond successfully, the sign-in form is visible, and the app-environment marker is `production`

### PROD-SMOKE-002 — Production does not expose test-support endpoints

Priority: critical
Type: negative
Layer: browser
Target: deployed
Automation: automated

Given the production deployment
When expected test-support paths are requested
Then they return 4xx responses

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| PROD-SMOKE-001 | browser | `@PROD-SMOKE-001` in e2e/tests/prod-smoke/prod-smoke.spec.ts | automated |
| PROD-SMOKE-002 | browser | `@PROD-SMOKE-002` in e2e/tests/prod-smoke/prod-smoke.spec.ts | automated |
