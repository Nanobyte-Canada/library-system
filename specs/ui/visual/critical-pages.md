---
feature_id: VIS
feature: Critical page visual states
owner: saurabhbilakhia
status: draft
priority: normal
critical_journeys: [CJ-01, CJ-02]
requirement_refs: [RQ-UI-001]
routes: [/login, /dashboard]
roles: [anonymous, MEMBER]
flags: []
components: [LoginPage, DashboardPage]
source_overrides: []
tags: [visual]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Critical page visual states

## Objective

Pin the stable visual appearance of the login page (desktop and emulated mobile) and the authenticated
member dashboard, with baselines stored in Git LFS and updated only through the reviewed baseline
workflow. Authenticated visual states stay limited to the dashboard until run-data stabilization is
decided in `operations.md`. There is no register page (registration UI is `feature-absent`).

## Scenario IDs

### VIS-001 — Login page desktop baseline

Priority: normal
Type: visual
Layer: browser
Target: deployed
Automation: automated

Given the login page at rest with animations disabled
Then the page matches the approved desktop baseline

### VIS-002 — Login page mobile baseline

Priority: normal
Type: visual
Layer: browser
Target: deployed
Automation: automated

Given an emulated mobile viewport on the login page
Then the page matches the approved mobile baseline

### VIS-003 — Dashboard desktop baseline (authenticated member)

Priority: normal
Type: visual
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member on the dashboard at rest with animations disabled
Then the page matches the approved desktop baseline

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| VIS-001 | browser | `@VIS-001` in e2e/tests/visual/critical-pages.visual.spec.ts | automated |
| VIS-002 | browser | `@VIS-002` in e2e/tests/visual/critical-pages.visual.spec.ts | automated |
| VIS-003 | browser | `@VIS-003` in e2e/tests/visual/critical-pages.visual.spec.ts | automated |
