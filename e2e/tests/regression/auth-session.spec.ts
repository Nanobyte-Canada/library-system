import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { AppShellPage } from '../../pages/app-shell.page';
import { scenarioTag } from '../../support/scenario';

test('logout clears the session', { tag: scenarioTag('AUTH-SESSION-001', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  const shell = new AppShellPage(page);
  await shell.logout();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull();
});

test('unauthenticated access redirects to login', { tag: scenarioTag('AUTH-SESSION-002', 'regression') }, async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('refresh keeps a valid session', { tag: scenarioTag('AUTH-SESSION-003', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('invalid token is rejected by the API without a redirect', { tag: scenarioTag('AUTH-SESSION-004', 'regression') }, async ({ page, request, member }) => {
  const rejected = await request.get('/api/users/me', { headers: { Authorization: 'Bearer corrupt-token' } });
  expect(rejected.status()).toBe(403);

  await seedSession(page, { ...member, token: 'corrupt-token' });
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile/);
});

test('deep link works with a valid session', { tag: scenarioTag('AUTH-SESSION-005', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/catalog');
  await expect(page).toHaveURL(/\/catalog/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
