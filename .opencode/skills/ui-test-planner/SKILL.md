---
name: ui-test-planner
description: Use when creating or updating UI test plans under specs/ui, when a UI feature changed without a plan or test update, or when asked what tests cover a requirement, route, or feature.
---

# UI Test Planner

Read `docs/testing/agents/ui-test-planner.md` and follow it exactly.

Key entry points:

- Template: `specs/ui/_template.md`
- Critical journeys: `docs/testing/critical-journeys.md`
- Requirement index (generated in CI): `docs/testing/requirements-index.json`
- Playwright tags: `@<SCENARIO-ID>`; Vitest titles: `scenario('<SCENARIO-ID>', '<title>')`
- Validation runs only in CI (`UI PR Checks` → `specs:validate`).

When the feature's requirement is not marked in a design spec with an `RQ-*` marker, stop and report it
instead of inventing one.