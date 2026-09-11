import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/login.page';
import { expectNoRequestMatching } from '../../support/negative-wait';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

const LOGIN_REQUEST = (url: string, method: string) => url.includes('/api/auth/login') && method === 'POST';

test('valid credentials reach the dashboard', { tag: scenarioTag('AUTH-LOGIN-001', 'regression') }, async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.username, 'password123');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('invalid password shows a generic error', { tag: scenarioTag('AUTH-LOGIN-002', 'regression') }, async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.username, 'wrong-password');
  await expect(login.error()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('unknown account shows the same generic error', { tag: scenarioTag('AUTH-LOGIN-003', 'regression') }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(identity('unknown'), 'password123');
  await expect(login.error()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('empty fields block submission', { tag: scenarioTag('AUTH-LOGIN-004', 'regression') }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submit().click();
  await expectNoRequestMatching(page, LOGIN_REQUEST);
  await expect(page).toHaveURL(/\/login/);
});

test('Enter submits the form', { tag: scenarioTag('AUTH-LOGIN-005', 'regression') }, async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.username().fill(member.username);
  await login.password().fill('password123');
  await login.password().press('Enter');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('service failure shows a recoverable error', { tag: scenarioTag('AUTH-LOGIN-006', 'regression') }, async ({ page, member }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }),
  );
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.username, 'password123');
  await expect(login.error()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('pending state prevents duplicate submissions', { tag: scenarioTag('AUTH-LOGIN-007', 'regression') }, async ({ page, member }) => {
  let loginRequests = 0;
  await page.route('**/api/auth/login', async (route) => {
    loginRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });
  const login = new LoginPage(page);
  await login.goto();
  await login.username().fill(member.username);
  await login.password().fill('password123');
  await login.submit().click();
  await expect(login.pendingSubmit()).toBeVisible();
  await expect(login.pendingSubmit()).toBeDisabled();
  await expect(page).toHaveURL(/\/dashboard/);
  expect(loginRequests).toBe(1);
});

test('keyboard-only interaction works', { tag: scenarioTag('AUTH-LOGIN-008', 'regression') }, async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.username().focus();
  await page.keyboard.type(member.username);
  await page.keyboard.press('Tab');
  await page.keyboard.type('password123');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('password is masked', { tag: scenarioTag('AUTH-LOGIN-009', 'regression') }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await expect(login.password()).toHaveAttribute('type', 'password');
});

test('mobile viewport keeps the form operable', { tag: scenarioTag('AUTH-LOGIN-010', 'regression', 'mobile') }, async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.username, 'password123');
  await expect(page).toHaveURL(/\/dashboard/);
});
