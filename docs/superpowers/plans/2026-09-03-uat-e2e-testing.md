# UAT E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Commit the 32-test Playwright suite (per-area files), add a manually-triggered "UAT E2E" GitHub Actions workflow with suite targeting, and wire in the AGENTS.md rule + PR checklist + ADR-0010.

**Architecture:** Tests move 1:1 from the existing (untracked) `e2e/tests/uat.spec.ts` into six per-area spec files sharing a `tests/helpers/shared.ts` module. A `workflow_dispatch`-only workflow runs Chromium against `https://uatlibrary.nanobyte.ca` with a `suite` input mapping to one spec file (or all), uploads the HTML report/traces as artifacts, and Slacks on failure. No deploy chaining, no gate, no data cleanup.

**Tech Stack:** Playwright 1.62.1 (`@playwright/test`), Node 22 (CI) / ≥18 (local), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-uat-e2e-testing-design.md`

## Global Constraints

- Commit messages: NEVER add `Co-Authored-By:` or any AI-attribution lines (AGENTS.md).
- ADR log is append-only; ADR-0010 lands in the **same commit** as the workflow file (repo documentation contract).
- Never delete or modify shared seed data; creation tests use fixed "Playwright"-prefixed names and **tolerate duplicates** (spec decision).
- Suite runs sequentially: `fullyParallel: false`, workers 1, `retries: 0` — tests share the live UAT database.
- `@playwright/test` pinned to `1.62.1`; CI uses Node 22, Chromium only.
- UAT is a shared live environment — running the suite mutates data (accepted by spec); creation tests 9/14 are idempotent (API pre-check → skip if the fixed-name entity already exists) to bound data growth.
- `e2e/` is currently **untracked**: "moving" a test = create the new file (`git add`), and `uat.spec.ts` is deleted with plain `rm` (no `git rm`) in Task 5.
- Local Playwright runs execute against the **real UAT** (`https://uatlibrary.nanobyte.ca`).
- Suite test counts for verification: auth 6, admin-books 6, admin-settings 7, librarian 4, member 7, roles 2 = **32 total**.

## File Structure

```
e2e/
├── package.json              # MODIFY: scripts + pinned dep, private
├── package-lock.json         # COMMIT (exists, untracked)
├── playwright.config.ts      # MODIFY: forbidOnly + BASE_URL env override
├── .gitignore                # CREATE: node_modules/, test-results/, report/
├── README.md                 # CREATE: how to run
├── tests/
│   ├── helpers/shared.ts     # CREATE: USERS, login(), getApiToken(), authedGet()
│   ├── auth.spec.ts          # CREATE: tests 1–6
│   ├── admin-books.spec.ts   # CREATE: tests 7–12
│   ├── admin-settings.spec.ts# CREATE: tests 13–19
│   ├── librarian.spec.ts     # CREATE: tests 20–23
│   ├── member.spec.ts        # CREATE: tests 24–28, 31–32
│   ├── roles.spec.ts         # CREATE: tests 29–30
│   └── uat.spec.ts           # DELETE (Task 5, plain rm — untracked source of all moves)
├── .github/workflows/uat-e2e.yml   # CREATE (repo root .github/)
├── .github/pull_request_template.md# CREATE (repo root .github/)
├── README.md                       # MODIFY: E2E stack row, /health fix, dispatch + local-dev sections
├── docs/adr.md                     # MODIFY: append ADR-0010
└── AGENTS.md                       # MODIFY: add "UAT E2E Testing" section
```

---

### Task 1: Suite hygiene — commit `e2e` scaffolding (no tests yet)

**Files:**
- Create: `e2e/.gitignore`
- Create: `e2e/README.md`
- Modify: `e2e/package.json` (replace whole file)
- Modify: `e2e/playwright.config.ts` (replace whole file)
- Commit: `e2e/package-lock.json` (exists, untracked)

**Interfaces:**
- Produces: pinned `@playwright/test` 1.62.1, `BASE_URL` env override, `forbidOnly`, committed lockfile. All later tasks consume this.

- [ ] **Step 1: Write `e2e/.gitignore`**

```gitignore
node_modules/
test-results/
report/
```

- [ ] **Step 2: Write `e2e/package.json`** (replace entire file)

```json
{
  "name": "library-e2e",
  "version": "1.0.0",
  "private": true,
  "description": "Playwright e2e suite for the deployed library UAT environment",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1"
  }
}
```

- [ ] **Step 3: Write `e2e/playwright.config.ts`** (replace entire file)

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ...(process.env.CI ? [['github']] : []),
    ['html', { outputFolder: 'report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://uatlibrary.nanobyte.ca',
    screenshot: 'on',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  outputDir: './test-results',
});
```

- [ ] **Step 4: Write `e2e/README.md`**

(Note the four-backtick outer fence — the content below contains triple-backtick bash blocks.)

````markdown
# UAT E2E Tests

Playwright suite validating the deployed library UAT environment
(`https://uatlibrary.nanobyte.ca`, override with `BASE_URL`).

## Run locally

```bash
cd e2e
npm ci
npx playwright install chromium
npx playwright test              # all suites
npx playwright test tests/auth.spec.ts   # one suite
```

## Suites

| File | Area |
|------|------|
| tests/auth.spec.ts | health, login (all roles), logout |
| tests/admin-books.spec.ts | admin dashboard, books CRUD, copies, QR |
| tests/admin-settings.spec.ts | categories, users, branches, audit logs |
| tests/librarian.spec.ts | librarian dashboard/books/search/checkout desk |
| tests/member.spec.ts | member dashboard, catalog, profile, my books, reservations, scanner |
| tests/roles.spec.ts | role guards (member blocked from admin) |

## Run in CI

GitHub Actions → **UAT E2E** → Run workflow → pick a suite (or `all`).
Dispatch **after the latest Deploy run for master has completed** — a dispatch
overlapping an in-flight deploy can hit mid-restart containers and produce false
failures. Failure artifacts (HTML report + traces) are uploaded to the run; Slack
is notified on failure.

## Conventions (see AGENTS.md)

- Any PR changing user-visible behavior must add/update tests in the matching spec file, same PR.
- Creation tests with fixed "Playwright"-prefixed names (books, categories) pre-check the API and skip if the entity already exists — no data accumulation.
- Test data **tolerates duplicates** — do not delete shared seed data.
````

- [ ] **Step 5: Regenerate lockfile + verify install and discovery**

The manifest changed (name, pinned dep, no `main`), so regenerate the lockfile first:

```bash
cd e2e && npm install && npx playwright install chromium
```
Expected: no errors; `package-lock.json` rewritten to match the new manifest (`"name": "library-e2e"`, exact `1.62.1`).

```bash
npx playwright test --list
```
Expected: **32 tests** listed (uat.spec.ts still present, untouched).

- [ ] **Step 6: Commit**

```bash
git add e2e/.gitignore e2e/README.md e2e/package.json e2e/package-lock.json e2e/playwright.config.ts
git commit -m "test(e2e): commit suite scaffolding — pinned playwright, config, docs"
```

---

### Task 2: Shared helpers + `auth.spec.ts` (tests 1–6)

**Files:**
- Create: `e2e/tests/helpers/shared.ts`
- Create: `e2e/tests/auth.spec.ts`

**Interfaces:**
- Produces (used by Tasks 3–4): `USERS` (admin/jane/john with `username`, `password`, `name`, `role`), `type TestUser = 'admin' | 'jane' | 'john'`, `login(page, user)`, `getApiToken(request, user): Promise<string>`, `authedGet(request, path, token)`.

- [ ] **Step 1: Write `e2e/tests/helpers/shared.ts`**

```typescript
import { expect, type Page, type APIRequestContext } from '@playwright/test';

export const USERS = {
  admin: { username: 'admin', password: 'password123', name: 'Admin User', role: 'ADMIN' },
  jane:  { username: 'jane',  password: 'password123', name: 'Jane Librarian', role: 'LIBRARIAN' },
  john:  { username: 'john',  password: 'password123', name: 'John Member', role: 'MEMBER' },
} as const;

export type TestUser = keyof typeof USERS;

/** UI login through the login form; waits for navigation away from /login. */
export async function login(page: Page, user: TestUser) {
  const u = USERS[user];
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(u.username);
  await page.getByLabel(/password/i).fill(u.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

/** API login; returns the full Authorization header value ("Bearer <jwt>"). */
export async function getApiToken(request: APIRequestContext, user: TestUser): Promise<string> {
  const u = USERS[user];
  const res = await request.post('/api/auth/login', {
    data: { username: u.username, password: u.password },
  });
  if (!res.ok()) throw new Error(`API login failed for ${user}: ${res.status()}`);
  const auth = res.headers()['authorization'];
  if (!auth) throw new Error(`No Authorization header in login response for ${user}`);
  return auth;
}

/** Authenticated API GET helper for fast state setup in future tests. */
export async function authedGet(request: APIRequestContext, path: string, token: string) {
  return request.get(path, { headers: { Authorization: token } });
}
```

- [ ] **Step 2: Write `e2e/tests/auth.spec.ts`**

Tests 1–6 move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 1 (health) = lines 23–28
- test 2 (login admin) = lines 32–36
- test 3 (login jane) = lines 38–41
- test 4 (login john) = lines 43–46
- test 5 (login failure) = lines 50–58
- test 6 (logout) = lines 62–68

The only changes are the import header (below) and dropping the local `USERS`/`login` definitions (now in helpers). The file must end up with exactly this structure:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';

// ─── HEALTH ─────────────────────────────────────────────────────────

test('1. Health endpoint returns 200', async ({ request }) => {
  // verbatim from uat.spec.ts lines 23-28
});

// ─── LOGIN SUCCESS (all 3 users) ────────────────────────────────────

test('2. Login success — admin', async ({ page }) => {
  // verbatim from uat.spec.ts lines 32-36
});

test('3. Login success — jane (librarian)', async ({ page }) => {
  // verbatim from uat.spec.ts lines 38-41
});

test('4. Login success — john (member)', async ({ page }) => {
  // verbatim from uat.spec.ts lines 43-46
});

// ─── LOGIN FAILURE ──────────────────────────────────────────────────

test('5. Login failure — wrong password', async ({ page }) => {
  // verbatim from uat.spec.ts lines 50-58
});

// ─── LOGOUT ─────────────────────────────────────────────────────────

test('6. Logout returns to login page', async ({ page }) => {
  // verbatim from uat.spec.ts lines 62-68
});
```

(Replace each comment with the exact test body from the referenced lines. Line numbers are stable until Task 5 deletes the file; if they have shifted, locate tests by their title strings, e.g. `test('1. Health endpoint returns 200', ...)`. Test bodies reference `USERS` only through `login()` — test 5 hardcodes its credentials.)

- [ ] **Step 3: Run to verify**

```bash
cd e2e && npx playwright test tests/auth.spec.ts
```
Expected: **6 passed** (UAT is healthy; baseline known-good).

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/helpers/shared.ts e2e/tests/auth.spec.ts
git commit -m "test(e2e): shared helpers + auth suite (health, login, logout)"
```

---

### Task 3: Admin suites — `admin-books.spec.ts` (7–12) + `admin-settings.spec.ts` (13–19)

**Files:**
- Create: `e2e/tests/admin-books.spec.ts`
- Create: `e2e/tests/admin-settings.spec.ts`

**Interfaces:**
- Consumes: `USERS`, `login` from `./helpers/shared`.
- Produces: **idempotent** creation tests 9/14 — an API pre-check calls `test.skip()` when the fixed-name entity already exists, bounding data growth (books list sorts `createdAt DESC` at page size 20; unbounded accumulation would push seed titles off page 1 and false-fail tests 8/21/25) — plus the layout-visibility sanity check in 9/14/16/18. Tests 9/14 establish the canonical new-test idiom `waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)`; tests 10–12, 16, 18 retain the inherited `isVisible({ timeout })` verbatim (known quirk: Playwright ignores that timeout).

- [ ] **Step 1: Write `e2e/tests/admin-books.spec.ts`**

Import header:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';
```

Tests move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 7 (admin dashboard) = lines 72–77
- test 8 (books list) = lines 81–87
- test 9 (create book) = lines 91–113, **replaced in full** by the code below (idempotency pre-check + `waitFor` idiom)
- test 10 (edit book) = lines 117–129
- test 11 (copies) = lines 133–149
- test 12 (QR) = lines 153–168

Test 9 full replacement body:

```typescript
test('9. Admin can create a new book', async ({ page, request }) => {
  // Idempotency pre-check: skip if the fixed-name book already exists, so repeated
  // runs don't accumulate rows that push seed titles off page 1 (books list sorts
  // createdAt DESC, page size 20 — tests 8/21/25 depend on seed titles being visible).
  const res = await request.get('/api/books/search?q=' + encodeURIComponent('Playwright Test Book'));
  const body = await res.json();
  test.skip((body.data?.length ?? 0) > 0, 'Playwright Test Book already exists — tolerate duplicates');
  await login(page, 'admin');
  await page.goto('/admin/books/new');
  await expect(page).toHaveURL(/admin\/books\/new/);
  const nameInput = page.locator('input[name="bookName"], input[placeholder*="name" i], input[placeholder*="title" i]').first();
  if (await nameInput.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
    await nameInput.fill('Playwright Test Book');
  }
  const authorInput = page.locator('input[name="author"], input[placeholder*="author" i]').first();
  if (await authorInput.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
    await authorInput.fill('Test Author');
  }
  const submitBtn = page.getByRole('button', { name: /save|submit|create/i });
  if (await submitBtn.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }
  // Duplicate tolerance: creation may succeed, be rejected ("already exists"),
  // or be a no-op — the page must remain functional (layout rendered, no crash).
  await expect(page.getByText('📚 Library System')).toBeVisible();
  await page.screenshot({ path: 'test-results/09-create-book-result.png' });
});
```

(Both endpoints used in pre-checks are public (`permitAll`): `GET /api/books/search` and `GET /api/categories` — no token needed.)

- [ ] **Step 2: Write `e2e/tests/admin-settings.spec.ts`**

Import header: same as Task 3 Step 1.

Tests move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 13 (categories list) = lines 172–177
- test 14 (create category) = lines 181–201, **replaced in full** by the code below (idempotency pre-check + `waitFor` idiom)
- test 15 (users list) = lines 205–210
- test 16 (create user) = lines 214–233, **append the sanity-check snippet** immediately before the final screenshot (test never submits — no pre-check needed)
- test 17 (branches list) = lines 237–242
- test 18 (create branch) = lines 246–255, **append the sanity-check snippet** immediately before the final screenshot (test never submits — no pre-check needed)
- test 19 (audit logs) = lines 259–264

Test 14 full replacement body:

```typescript
test('14. Admin can create a new category', async ({ page, request }) => {
  // Idempotency pre-check: skip if the fixed-name category already exists.
  const res = await request.get('/api/categories');
  const categories = (await res.json()).data ?? [];
  test.skip(
    categories.some((c: { name: string }) => c.name === 'Playwright Category'),
    'Playwright Category already exists — tolerate duplicates'
  );
  await login(page, 'admin');
  await page.goto('/admin/categories');
  await expect(page).toHaveURL(/admin\/categories/);
  const addBtn = page.getByRole('button', { name: /add|new|create/i });
  if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(1000);
  }
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameInput.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
    await nameInput.fill('Playwright Category');
    const saveBtn = page.getByRole('button', { name: /save|submit|create/i });
    if (await saveBtn.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  // Duplicate tolerance: creation may succeed, be rejected ("already exists"),
  // or be a no-op — the page must remain functional (layout rendered, no crash).
  await expect(page.getByText('📚 Library System')).toBeVisible();
  await page.screenshot({ path: 'test-results/14-create-category.png' });
});
```

The sanity-check snippet to insert in tests 16 and 18 (immediately before each test's final `await page.screenshot(...)` line):

```typescript
  // Page must remain functional (layout rendered, no crash).
  await expect(page.getByText('📚 Library System')).toBeVisible();
```

- [ ] **Step 3: Run to verify — including idempotency**

```bash
cd e2e && npx playwright test tests/admin-books.spec.ts tests/admin-settings.spec.ts
```
Expected: **13 tests total**. If "Playwright Test Book" / "Playwright Category" already exist in UAT from earlier runs, tests 9/14 report **skipped** — that is the idempotency pre-check working, not a failure (typical first run after migration: 11 passed, 2 skipped).

Then run `admin-books.spec.ts` a second time to prove no duplicate row is created across runs:

```bash
cd e2e && npx playwright test tests/admin-books.spec.ts
```
Expected: identical result to the first run — test 9 skipped again (no new book row).

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/admin-books.spec.ts e2e/tests/admin-settings.spec.ts
git commit -m "test(e2e): admin suites — books CRUD + settings (categories, users, branches, audit)"
```

---

### Task 4: Librarian / member / roles suites (tests 20–32)

**Files:**
- Create: `e2e/tests/librarian.spec.ts`
- Create: `e2e/tests/member.spec.ts`
- Create: `e2e/tests/roles.spec.ts`

**Interfaces:**
- Consumes: `USERS`, `login` from `./helpers/shared`.

- [ ] **Step 1: Write `e2e/tests/librarian.spec.ts`**

Import header: same as Task 3.

Tests move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 20 (librarian dashboard) = lines 268–272
- test 21 (librarian books list) = lines 276–281
- test 22 (catalog search) = lines 285–297
- test 23 (checkout desk) = lines 301–306

- [ ] **Step 2: Write `e2e/tests/member.spec.ts`**

Import header: same as Task 3.

Tests move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 24 (member dashboard) = lines 310–314
- test 25 (catalog browse) = lines 318–325
- test 26 (book detail) = lines 329–340
- test 27 (profile) = lines 344–349
- test 28 (my books) = lines 353–359
- test 31 (reservations) = lines 382–387
- test 32 (QR scanner) = lines 391–396

- [ ] **Step 3: Write `e2e/tests/roles.spec.ts`**

Import header: same as Task 3.

Tests move **verbatim** from `e2e/tests/uat.spec.ts`:
- test 29 (member blocked from /admin/books) = lines 363–370
- test 30 (member blocked from /admin/users) = lines 372–378

- [ ] **Step 4: Run to verify**

```bash
cd e2e && npx playwright test tests/librarian.spec.ts tests/member.spec.ts tests/roles.spec.ts
```
Expected: **13 passed** (4 + 7 + 2).

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/librarian.spec.ts e2e/tests/member.spec.ts e2e/tests/roles.spec.ts
git commit -m "test(e2e): librarian, member, and roles suites"
```

---

### Task 5: Retire the monolith — delete `uat.spec.ts`, verify full suite

**Files:**
- Delete: `e2e/tests/uat.spec.ts` (plain `rm` — file is untracked)

- [ ] **Step 1: Delete the old spec**

```bash
rm e2e/tests/uat.spec.ts
```

- [ ] **Step 2: Run the full suite**

```bash
cd e2e && npx playwright test
```
Expected: 32 tests, **0 failures** — steady state is **30 passed, 2 skipped** (tests 9/14 skip via the idempotency pre-checks when "Playwright Test Book" / "Playwright Category" already exist from earlier runs). ~1–2 minutes. If any test FAILS here, fix the migrated file (not UAT) before committing — the baseline was 32/32 on 2026-09-03.

- [ ] **Step 3: Commit**

```bash
git add -A e2e/tests/
git status --short   # confirm nothing under e2e/ is left untracked except ignored dirs
git commit -m "test(e2e): remove monolithic uat.spec.ts — superseded by per-area suites"
```
(Note: `uat.spec.ts` was never tracked; the commit may be empty or contain only incidental changes — if `git status` shows nothing to commit, run `git commit --allow-empty -m "test(e2e): remove monolithic uat.spec.ts — superseded by per-area suites"` so the milestone is recorded.)

---

### Task 6: CI workflow + ADR-0010 (same commit, repo contract)

**Files:**
- Create: `.github/workflows/uat-e2e.yml`
- Modify: `docs/adr.md` (append only)

**Interfaces:**
- Consumes: `e2e/package-lock.json` (Task 1), per-area spec files (Tasks 2–4), `SLACK_WEBHOOK_URL` secret (already configured).
- Produces: manual dispatch surface — `gh workflow run uat-e2e.yml -f suite=all|auth|admin-books|admin-settings|librarian|member|roles`.

- [ ] **Step 1: Write `.github/workflows/uat-e2e.yml`**

```yaml
# .github/workflows/uat-e2e.yml
name: UAT E2E

on:
  workflow_dispatch:
    inputs:
      suite:
        description: "Test suite to run"
        required: true
        type: choice
        default: all
        options:
          - all
          - auth
          - admin-books
          - admin-settings
          - librarian
          - member
          - roles

concurrency:
  group: uat-e2e
  cancel-in-progress: false

jobs:
  e2e:
    name: UAT E2E — ${{ inputs.suite }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: e2e/package-lock.json

      - name: Install dependencies
        working-directory: e2e
        run: npm ci

      - name: Install Playwright browser
        working-directory: e2e
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        working-directory: e2e
        env:
          BASE_URL: https://uatlibrary.nanobyte.ca
        run: |
          SUITE="${{ inputs.suite }}"
          ARGS=""
          if [ "$SUITE" != "all" ]; then
            ARGS="tests/$SUITE.spec.ts"
          fi
          npx playwright test $ARGS

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-${{ inputs.suite }}
          path: |
            e2e/report
            e2e/test-results
          retention-days: 14
          if-no-files-found: ignore

      - name: Notify Slack
        if: failure()
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": ":x: Library UAT e2e suite *${{ inputs.suite }}* failed — <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
```

- [ ] **Step 2: Append ADR-0010 to `docs/adr.md`**

```markdown
## ADR-0010: UAT e2e testing workflow
**Status:** Accepted | **Date:** 2026-09-03

**Context:** The 32-test Playwright suite lived only on a developer machine, untracked. Regressions were caught by ad-hoc local runs after deploys. The team wants every new user-visible feature to land with UAT e2e coverage in the same PR, and the suite to be runnable against UAT on demand.

**Decision:**
- The suite is committed under `e2e/` and reorganized into **per-area spec files** (`auth`, `admin-books`, `admin-settings`, `librarian`, `member`, `roles`) sharing `tests/helpers/shared.ts` (`USERS`, `login()`, `getApiToken()`, `authedGet()`).
- A new **`UAT E2E` workflow** (`.github/workflows/uat-e2e.yml`) runs on **`workflow_dispatch` only** with a `suite` input (`all` or one area, mapping to the spec filename). It runs Chromium against the UAT public URL (`BASE_URL`, default `https://uatlibrary.nanobyte.ca`), uploads the HTML report and traces as artifacts (14-day retention), and notifies Slack on failure.
- No deploy chaining, no cron, no hard gate: a failed e2e run signals (red run + Slack) and a human decides.
- Tests run **sequentially** (1 worker, no retries) against the shared UAT database. Test data uses fixed "Playwright"-prefixed names and **tolerates duplicates**; shared seed data is never deleted.
- **Contract:** any PR changing user-visible behavior must add/update tests in the matching area spec in the same PR (documented in AGENTS.md, enforced via PR-template checklist). New areas get a new spec file plus an entry in the workflow's `suite` choice list.

**Consequences:** Feature regressions are caught at the UAT level on demand; the suite's quality depends on the PR contract being followed. Adding an area means two small edits (spec file + workflow choice list). Node 22 and Playwright 1.62.1 are pinned; browser install adds ~2 min to each run.
```

- [ ] **Step 3: Commit (workflow + ADR together, per repo contract)**

```bash
git add .github/workflows/uat-e2e.yml docs/adr.md
git commit -m "ci(e2e): UAT E2E manual workflow with suite targeting + ADR-0010"
```

- [ ] **Step 4: Push and verify in CI — full suite**

```bash
git push origin master
sleep 15
gh workflow run uat-e2e.yml -f suite=all
sleep 15
RUN_ID=$(gh run list --workflow=uat-e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
```
Expected: green run; steady state is **30 passed, 2 skipped** (tests 9/14 skip via the idempotency pre-checks when their entities already exist) — ~5 min including browser install. Check the run page shows the `playwright-all` artifact.

- [ ] **Step 5: Verify in CI — targeted suite**

```bash
gh workflow run uat-e2e.yml -f suite=auth
sleep 15
RUN_ID=$(gh run list --workflow=uat-e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
```
Expected: green run executing **only 6 auth tests** (visible in log output) — validates suite filtering.

---

### Task 7: AGENTS.md rule + PR template checklist

**Files:**
- Modify: `AGENTS.md` (add section after "Documentation Maintenance Contract")
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Add "UAT E2E Testing" section to `AGENTS.md`** (after the Documentation Maintenance Contract section)

```markdown
## UAT E2E Testing

The `e2e/` directory holds the Playwright suite that validates the deployed UAT
environment (`https://uatlibrary.nanobyte.ca`).

**Rule:** Any PR that changes user-visible behavior (API or frontend) must add or
update tests in the matching `e2e/tests/<area>.spec.ts` **in the same PR**. A new
area means a new spec file plus an entry in the `suite` choice list in
`.github/workflows/uat-e2e.yml`.

- Suites (per-area files): `auth`, `admin-books`, `admin-settings`, `librarian`,
  `member`, `roles` — see the e2e README for what each covers.
- Run locally: `cd e2e && npm ci && npx playwright install chromium && npx playwright test`
  (single suite: append `tests/<area>.spec.ts`).
- Run in CI: Actions → **UAT E2E** → Run workflow → pick a suite. Dispatch **after
  the latest Deploy run for master has completed** — overlapping an in-flight deploy
  can hit mid-restart containers and produce false failures.
- Test data: fixed "Playwright"-prefixed names, **tolerates duplicates** — creation
  tests with fixed names (books, categories) pre-check the API and skip when the
  entity already exists. Never delete shared seed data. Tests run sequentially
  against the shared UAT DB.
```

- [ ] **Step 2: Update root `README.md`** (documentation contract — local-dev and CI/CD overview changed)

Four exact edits:

2a. Stack table — add row after the `Frontend` row (README.md:14):

```markdown
| E2E | Playwright 1.62 (TypeScript), run against deployed UAT |
```

2b. Line 60 — fix the stale health-gate reference (endpoint moved to `/health` by ADR-0009):

old:
```markdown
Health endpoints (used by CI health gates): `https://library.nanobyte.ca/api/health` and `https://uatlibrary.nanobyte.ca/api/health`.
```
new:
```markdown
Health endpoints (used by CI health gates): `https://library.nanobyte.ca/health` and `https://uatlibrary.nanobyte.ca/health`.
```

2c. CI/CD Usage — add after the Prod block (after README.md:76):

```markdown
**UAT E2E** runs the Playwright suite against UAT on demand:

```bash
gh workflow run uat-e2e.yml -f suite=all        # or: auth | admin-books | admin-settings | librarian | member | roles
```

Dispatch after the latest Deploy run for master has completed.
```

2d. Local Development — add E2E subsection after the Frontend subsection (after README.md:97):

```markdown
### E2E (from `e2e/`)

```bash
npm ci                              # install dependencies
npx playwright install chromium     # one-time browser install
npx playwright test                 # full suite against https://uatlibrary.nanobyte.ca
```
```

- [ ] **Step 3: Write `.github/pull_request_template.md`**

```markdown
## Summary

<!-- What does this PR do and why? -->

## Checklist

- [ ] Builds and tests pass locally
- [ ] UAT e2e suite updated (if user-visible behavior changed — see AGENTS.md "UAT E2E Testing")
- [ ] ADR entry added to docs/adr.md (if compose files, ports, networks, CI/CD workflows, or DB schema changed)
```

- [ ] **Step 4: Commit + push**

```bash
git add AGENTS.md .github/pull_request_template.md README.md
git commit -m "docs: UAT e2e coverage rule in AGENTS.md, PR template checklist, README e2e sections"
git push origin master
```

- [ ] **Step 5: Final sanity**

```bash
cd e2e && npx playwright test --list
```
Expected: 32 tests across 6 files, no orphans of `uat.spec.ts`.
