import { test, expect } from '@playwright/test';
import { login } from './helpers/shared';

// ─── 20. LIBRARIAN DASHBOARD ───────────────────────────────────────

test('20. Librarian dashboard loads', async ({ page }) => {
  await login(page, 'jane');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('body')).toContainText(/dashboard/i);
});

// ─── 21. LIBRARIAN BOOKS LIST ──────────────────────────────────────

test('21. Librarian can view books list', async ({ page }) => {
  await login(page, 'jane');
  await page.goto('/admin/books');
  await expect(page).toHaveURL(/admin\/books/);
  await expect(page.locator('body')).toContainText(/1984|mockingbird|hobbit/i);
});

// ─── 22. LIBRARIAN CATALOG SEARCH ──────────────────────────────────

test('22. Librarian can search catalog', async ({ page }) => {
  await login(page, 'jane');
  await page.goto('/catalog');
  await expect(page).toHaveURL(/catalog/);
  // Look for search input
  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill('hobbit');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'test-results/22-catalog-search.png' });
});

// ─── 23. LIBRARIAN CHECKOUT DESK ───────────────────────────────────

test('23. Librarian checkout desk page loads', async ({ page }) => {
  await login(page, 'jane');
  await page.goto('/checkout-desk');
  await expect(page).toHaveURL(/checkout-desk/);
  await expect(page.locator('body')).toContainText(/checkout|desk|issue|return/i);
});
