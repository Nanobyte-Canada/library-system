# UI Browser Tests

Playwright suites for the deployed library UAT environment
(`https://uatlibrary.nanobyte.ca`).

**Execution is CI-only.** Do not run these tests on a developer machine; the authoritative runs are the
`UI Tests — Deployed (UAT)` workflow (automatic after a successful UAT deploy, or manual dispatch) and
`UI PR Checks` for plan validation. See `docs/testing/ui-testing.md`.

## Layout

```text
e2e/
  playwright.config.ts   # UAT base URL, chromium project, HTML/JUnit/JSON reporters
  fixtures/              # app (worker-scoped environment safety), data/auth (later phases)
  support/               # run context, negative waits, network monitor, scenario tags
  pages/                 # page objects (later phases)
  tests/
    smoke/               # @smoke route availability
    regression/          # @regression feature suites (later phases)
  scripts/               # deterministic plan/manifest/impact/lint tooling (CI only)
```

## Conventions

- Declare scenario IDs with tags: `test('...', { tag: ['@AUTH-LOGIN-001', '@regression'] }, ...)`.
- Import `test`/`expect` from `fixtures/app.fixture` so the UAT environment check runs.
- Namespace any created data with `runId()` from `support/run-context.ts`.
- Assert user-visible outcomes with role/label/text locators; use `data-testid` only when no semantic
  locator exists.
- Never delete shared data; UAT resets are manual.

## Suites

| Tag | Contents |
|---|---|
| `@smoke` | Health, public routes, environment marker |
| `@regression` | Feature flows (Phase 2+) |
| `@a11y` | axe scans (Phase 4+) |
| `@visual` | screenshot comparisons (Phase 4+) |

## Debugging a failure

1. Open the failed run's artifacts (`gh run download <run-id>` or the Actions UI).
2. Read `test-results/results.json`, the trace, and the screenshot.
3. Use the `ui-test-failure-analyst` skill (Phase 5) when classification is non-obvious.
