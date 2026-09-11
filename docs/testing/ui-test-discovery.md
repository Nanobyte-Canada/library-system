# UI Test Discovery

Date: 2026-09-11. Derived from `docs/superpowers/specs/2026-09-11-ui-testing-platform-design.md` section 3.

| Item | Discovered value | Evidence/path | Decision or impact |
|---|---|---|---|
| Frontend framework/version | React 19.2, Vite 8.1, TypeScript 6.0 | frontend/package.json | Vitest + RTL added at the component layer |
| Frontend root | frontend/ | frontend/ | Component tests colocated under src/ |
| Package manager/lockfile | npm + package-lock.json | frontend/package-lock.json, e2e/package-lock.json | Tooling deps added to e2e; test deps to frontend |
| Node/runtime version | Node 20 in the build.yml frontend job and frontend/Dockerfile; Node 22 in uat-e2e.yml | .github/workflows/build.yml, frontend/Dockerfile, .github/workflows/uat-e2e.yml | Node 22 for all e2e/UI-test jobs; the frontend Vitest job keeps Node 20 to match the Dockerfile |
| Build tool | Vite 8.1 | frontend/package.json | Component tests run with Vitest |
| Repository type | Full-stack monorepo (api/, frontend/, e2e/) | repository root | Full-stack rows of Revision 2 §4.2 evaluated; no local CI stack by policy |
| Backend runnable in CI | Yes for backend tests (Testcontainers PostgreSQL) | .github/workflows/build.yml (`test-api`) | Not used for UI tests: policy is no local/full-stack CI target |
| Existing component-test runner | None | frontend/package.json | Vitest + RTL introduced Phase 1 |
| Existing browser/E2E runner and suites | Playwright 1.62.1, 32 tests, 6 spec files | e2e/ | Rewritten feature by feature (D6); disposition in legacy-tests.md |
| Existing accessibility tooling | None | repository grep | axe added Phase 4 |
| Router and route definitions | react-router-dom 6.30, 20 route patterns plus a catch-all redirect to /dashboard | frontend/src/App.tsx | Route discovery parses App.tsx |
| Authentication provider and model | Embedded forms, own API, JWT HS512 (~16 h 40 min) returned in the `Authorization` response header; no refresh or server logout; no verification/recovery | frontend/src/pages/LoginPage.tsx, api/src/main/kotlin/com/digihome/library/api/controller/AuthController.kt, api/src/main/kotlin/com/digihome/library/api/security/SecurityConfiguration.kt | Embedded model: login and client session in scope; email, recovery, and UI registration feature-absent |
| Lockout, rate-limit, captcha, WAF on test env | None (unused `is_locked`/`failed_attempts` columns) | api/.../security/JWTAuthenticationFilter.kt, api/.../security/SecurityConfiguration.kt | Negative auth scenarios safe |
| Feature-flag system | None | repository grep | Flags dimension removed; flags: [] in plans |
| Requirements system of record | ADRs + design specs | docs/adr.md, docs/superpowers/specs/ | RQ markers in design specs (D4) |
| CI provider and workflows | GitHub Actions: build.yml, deploy.yml, deploy-prod.yml, uat-e2e.yml | .github/workflows/ | New ui-* workflows; every change gets an ADR |
| CI runner image, caching, container support | ubuntu-latest, npm and Gradle caches, containers supported | build.yml | Pinned Playwright container with npm cache |
| PR preview deployment | None | deploy.yml | PR tier is component + deterministic only (D2) |
| Staging base URL mechanism | Fixed: https://uatlibrary.nanobyte.ca | e2e/playwright.config.ts:17, .github/workflows/uat-e2e.yml | BASE_URL from environment; hostname allowlist |
| Staging shared by concurrent runs | Yes | deploy.yml, uat-e2e.yml concurrency | Concurrency group `library-uat-deploy` (deploy + UI tests), cancel-in-progress: false |
| Test-data reset/seed mechanism | Public API only; no test-support endpoint; committed Flyway seeds V1–V3 | e2e/tests/helpers/shared.ts, api Flyway migrations | Run-ID namespacing; no destructive sweeps |
| Test email mechanism | None; no email sending exists (unused `email_log`, unread `SMTP_*` env vars) | api configuration | Email scenarios feature-absent |
| Supported browsers | Chromium today; owner matrix proposed: Chrome/Edge (chromium), Firefox, Safari (webkit emulation) | e2e/playwright.config.ts | PR/post-deploy chromium; full matrix manual until Phase 6 |
| Supported viewports | Desktop default; mobile emulation proposed: Pixel 7 / iPhone 14 descriptors | owner decision | Mobile labelled "emulated" in reports |
| Existing reporting destination | GitHub Actions artifacts (14 days), Slack webhook | uat-e2e.yml | test-reports branch + dashboard.md (D8) |
| Team alerting channel | Slack webhook | secrets.SLACK_WEBHOOK_URL | Reused for UI-test alerts |
| Secret-management mechanism | GitHub secrets + Vault AppRole | deploy.yml | Committed UAT seed accounts; no E2E service secrets |
| UI source path patterns | frontend/src/** | frontend/src | Impact graph roots at route entry modules |
| Existing code-owner/reviewer rules | None (no CODEOWNERS) | repository root | CODEOWNERS added Phase 0 |
| Existing scenario/requirement ID convention | Numeric test titles, no requirement IDs | e2e/tests/*.spec.ts | New IDs: RQ-<AREA>-<NNN>, <FEATURE>-<NNN> |

## Phase 0 decisions

- **Test target (§4.2):** PR tier = deterministic checks + component tests. Full tier = deployed UAT after
  every successful UAT deploy, plus manual dispatch. No local or preview target; no nightly execution.
- **Identity provider (§4.3):** embedded. Login (Username, Password), client-side logout, and
  session/guard behavior are in scope; registration is API-only with no frontend page, and email
  verification, password recovery, and lockout are feature-absent.
- **Operations (§4.4):** plan approver and test owner: @saurabhbilakhia; alert channel: existing Slack
  webhook; dashboard: `test-reports` branch `dashboard.md`; plan review cadence 180 days; critical-journey
  review quarterly. Full detail in `docs/testing/operations.md`.

## Inventory

- Routes: 20 patterns plus a catch-all in frontend/src/App.tsx (listed in `specs/ui/authorization/role-route-matrix.md`, Phase 3).
- Critical workflows: see `docs/testing/critical-journeys.md`.
- Forms: LoginPage (Username, Password, button `Sign In`); relies on HTML required validation. No
  registration page exists, so there is no signup form to cover at the UI layer.
- Reusable components: frontend/src/components/ui/* (Badge, Button, Card — currently unused), Layout.tsx,
  catalog and dashboard components.
- External integrations: book QR images render from the public api.qrserver.com URL; tests assert on the
  QR URL/flow, never on third-party image bytes.
- Existing test IDs: none; four aria-labels only (all in Layout.tsx). Locator policy uses
  role/label/placeholder first.
- Existing tests: e2e/tests/*.spec.ts, disposition in `docs/testing/legacy-tests.md`.
