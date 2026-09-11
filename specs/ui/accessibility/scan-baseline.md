---
feature_id: A11Y
feature: Accessibility scans for critical pages
owner: saurabhbilakhia
status: draft
priority: high
critical_journeys: [CJ-01, CJ-02]
requirement_refs: [RQ-UI-001]
routes: [/login, /dashboard, /catalog]
roles: [anonymous, MEMBER]
flags: []
components: [LoginPage, DashboardPage, CatalogPage]
source_overrides: []
tags: [accessibility]
last_reviewed: "2026-09-11"
review:
  approved_by: ""
  approved_on: ""
  requirement_version: ""
next_id: "004"
---

# Accessibility scans for critical pages

## Objective

Automatically detect serious or critical accessibility violations on critical pages after they reach
their stable state, with a narrow, reviewed baseline. There is no register page (registration UI is
`feature-absent`), so the anonymous scan covers `/login` only.

## Scenario IDs

### A11Y-001 — Login page scan (anonymous)

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given the login page at its stable state
Then no unapproved serious or critical axe violation is reported

### A11Y-002 — Dashboard scan (authenticated member)

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member on /dashboard
Then no unapproved serious or critical axe violation is reported

### A11Y-003 — Catalog scan (authenticated member)

Priority: high
Type: accessibility
Layer: browser
Target: deployed
Automation: automated

Given an authenticated member on /catalog
Then no unapproved serious or critical axe violation is reported

## Retired scenarios

| Scenario ID | Retired on | Reason | Replaced by |
|---|---|---|---|

## Requirement-to-test mapping

| Scenario ID | Layer | Automated test file/title or tag | Status |
|---|---|---|---|
| A11Y-001 | browser | `@A11Y-001` in e2e/tests/accessibility/critical-pages.a11y.spec.ts | automated |
| A11Y-002 | browser | `@A11Y-002` in e2e/tests/accessibility/critical-pages.a11y.spec.ts | automated |
| A11Y-003 | browser | `@A11Y-003` in e2e/tests/accessibility/critical-pages.a11y.spec.ts | automated |
