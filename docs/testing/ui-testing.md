# UI Testing Platform

Design: `docs/superpowers/specs/2026-09-11-ui-testing-platform-design.md`.
Discovery: `docs/testing/ui-test-discovery.md`. Operations: `docs/testing/operations.md`.

## The one rule

Tests and validators execute **only** in GitHub Actions or against deployed environments. No local test
run is part of any workflow. Local commands exist only as debugging exceptions; the authoritative result
is the CI run.

## Layers and where they run

| Layer | Location | Workflow | Trigger |
|---|---|---|---|
| Component (Vitest + RTL) | `frontend/src/**/*.test.tsx` | `build.yml` → `Frontend Build` | Every PR |
| Spec and manifest validation | `e2e/scripts` | `ui-tests-pr.yml` → `Spec Validation` | Every PR |
| Browser smoke/regression | `e2e/tests/{smoke,regression}` | `ui-tests-deployed.yml` | After successful UAT deploy; manual dispatch |
| Accessibility | `e2e/tests/accessibility` | `ui-tests-deployed.yml` (Phase 4+) | Same as browser |
| Visual | `e2e/tests/visual` | `ui-tests-deployed.yml` (Phase 4+) | Same as browser |
| Route, impact, lint | `ui-tests-pr.yml` (Phase 3+) | Every PR |

## Scenario IDs and tags

- Plans live in `specs/ui/<area>/<feature>.md`; template at `specs/ui/_template.md`.
- Scenario IDs are `<FEATURE-ID>-<NNN>`; never reuse an ID.
- Playwright tests declare IDs with tags: `{ tag: ['@AUTH-LOGIN-001', '@regression'] }`.
- Vitest tests declare IDs in the title: `test(scenario('AUTH-LOGIN-004', 'empty fields'), ...)`.
- Tags select suites (`@smoke`, `@regression`, `@a11y`, `@visual`); folders are navigation only.

## Requirements

- Requirement markers (`RQ-*`) live in `docs/superpowers/specs/*.md`.
- `docs/testing/requirements-index.json` is generated in CI from those markers.
- Plans reference requirements through `requirement_refs`.

## Adding tests for a change

1. Use the `ui-test-planner` skill to update the feature plan.
2. Add the test at the declared layer; components in `frontend/`, browser flows in `e2e/`.
3. Push the branch; `UI PR Checks` validates plans; the post-deploy workflow runs browser tests after merge.
4. Never run the suite locally; read CI artifacts instead.

## Artifacts

`ui-tests-deployed.yml` uploads the HTML report, JUnit, and JSON results, plus traces, screenshots, and
videos for failures (14-day retention). History is published to the `test-reports` branch (Phase 3+).
