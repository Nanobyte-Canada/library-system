import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { scenarioTag } from '../../support/scenario';

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
});

test('login page desktop baseline', { tag: scenarioTag('VIS-001', 'visual') }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page).toHaveScreenshot('login-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
});

test('login page mobile baseline', { tag: scenarioTag('VIS-002', 'visual', 'mobile') }, async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page).toHaveScreenshot('login-mobile.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
});

test('dashboard desktop baseline', { tag: scenarioTag('VIS-003', 'visual') }, async ({ page, member }) => {
  await seedSession(page, member);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await expect(page).toHaveScreenshot('dashboard-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
});
