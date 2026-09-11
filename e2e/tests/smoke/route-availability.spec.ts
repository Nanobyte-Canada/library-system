import { test, expect } from '../../fixtures/app.fixture';
import { attachNetworkMonitor } from '../../support/network-monitor';
import { scenarioTag } from '../../support/scenario';

test('health endpoint is UP', { tag: scenarioTag('PLATFORM-ROUTES-001', 'smoke') }, async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).status).toBe('UP');
});

test('login page renders the sign-in form', { tag: scenarioTag('PLATFORM-ROUTES-002', 'smoke') }, async ({ page }) => {
  const monitor = attachNetworkMonitor(page);
  await page.goto('/login');
  await expect(page.getByText('Sign in to your account')).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  monitor.assertClean();
});

test('root redirects to the login page', { tag: scenarioTag('PLATFORM-ROUTES-003', 'smoke') }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('protected routes redirect anonymous visitors to login', { tag: scenarioTag('PLATFORM-ROUTES-004', 'smoke') }, async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
