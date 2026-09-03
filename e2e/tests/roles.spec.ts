import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';

// ─── 29–30. ROLE GUARDS — MEMBER BLOCKED FROM ADMIN ────────────────

test('29. Member blocked from /admin/books → redirected', async ({ page }) => {
  await login(page, 'john');
  await page.goto('/admin/books');
  // Should redirect to /dashboard (or /login if not authenticated)
  await page.waitForTimeout(2000);
  const url = page.url();
  expect(url).not.toContain('/admin/books');
});

test('30. Member blocked from /admin/users → redirected', async ({ page }) => {
  await login(page, 'john');
  await page.goto('/admin/users');
  await page.waitForTimeout(2000);
  const url = page.url();
  expect(url).not.toContain('/admin/users');
});
