import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';

// ─── 29–30. ROLE GUARDS — MEMBER BLOCKED FROM ADMIN ────────────────

test('29. Member blocked from /admin/books → redirected', async ({ page }) => {
  await login(page, 'john');
  await page.goto('/admin/books');
  // Should redirect to /dashboard (or /login if not authenticated) — auto-waits
  // instead of a fixed sleep, so slow SPA hydration cannot cause a false red.
  await page.waitForURL((url) => !url.pathname.includes('/admin/books'), { timeout: 5000 });
});

test('30. Member blocked from /admin/users → redirected', async ({ page }) => {
  await login(page, 'john');
  await page.goto('/admin/users');
  // Should redirect to /dashboard (or /login if not authenticated) — auto-waits
  // instead of a fixed sleep, so slow SPA hydration cannot cause a false red.
  await page.waitForURL((url) => !url.pathname.includes('/admin/users'), { timeout: 5000 });
});
