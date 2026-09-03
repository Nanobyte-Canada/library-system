import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';

// ─── HEALTH ─────────────────────────────────────────────────────────

test('1. Health endpoint returns 200', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('UP');
});

// ─── LOGIN SUCCESS (all 3 users) ────────────────────────────────────

test('2. Login success — admin', async ({ page }) => {
  await login(page, 'admin');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('body')).toContainText(/admin/i);
});

test('3. Login success — jane (librarian)', async ({ page }) => {
  await login(page, 'jane');
  await expect(page).toHaveURL(/dashboard/);
});

test('4. Login success — john (member)', async ({ page }) => {
  await login(page, 'john');
  await expect(page).toHaveURL(/dashboard/);
});

// ─── LOGIN FAILURE ──────────────────────────────────────────────────

test('5. Login failure — wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill('admin');
  await page.getByLabel(/password/i).fill('wrongpassword');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  // Should stay on /login and show error
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('body')).toContainText(/invalid|incorrect|failed|error/i);
});

// ─── LOGOUT ─────────────────────────────────────────────────────────

test('6. Logout returns to login page', async ({ page }) => {
  await login(page, 'admin');
  await expect(page).toHaveURL(/dashboard/);
  // Find and click logout
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  await expect(page).toHaveURL(/login/);
});
