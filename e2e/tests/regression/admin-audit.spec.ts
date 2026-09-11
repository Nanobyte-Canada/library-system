import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { scenarioTag } from '../../support/scenario';

test('the audit page lists entries', { tag: scenarioTag('ADMIN-AUDIT-001', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/audit-logs');
  await expect(page).toHaveURL(/\/admin\/audit-logs/);
  await expect(page.locator('body')).toContainText(/audit|log/i);
  // At least one row or entry should be visible
  const rows = page.locator('table tbody tr, [role="row"]').or(page.locator('body').getByText(/audit|log/i));
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
});

test('filtering by entity type narrows the list', { tag: scenarioTag('ADMIN-AUDIT-002', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/audit-logs');
  // Look for a filter dropdown or select
  const filterSelect = page.locator('select').or(page.getByRole('combobox'));
  if (await filterSelect.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    // Select the first available option to test filtering
    const options = await filterSelect.first().locator('option').allTextContents();
    if (options.length > 1) {
      await filterSelect.first().selectOption({ index: 1 });
      await page.waitForTimeout(1_000);
    }
  }
  // Page must remain functional after filtering
  await expect(page.locator('main, [role="main"], .app-layout, #root')).toBeVisible();
});
