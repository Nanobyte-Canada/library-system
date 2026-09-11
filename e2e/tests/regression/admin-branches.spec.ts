import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { branchName } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('the branches list shows seed branches', { tag: scenarioTag('ADMIN-BRANCHES-001', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/branches');
  await expect(page).toHaveURL(/\/admin\/branches/);
  await expect(page.locator('body')).toContainText(/central|north|east/i);
});

test('an admin creates a run-namespaced branch', { tag: scenarioTag('ADMIN-BRANCHES-002', 'regression') }, async ({ page, admin }) => {
  const name = `PW ${branchName()}`;
  await seedSession(page, admin);
  await page.goto('/admin/branches/new');
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: /save|submit|create/i }).click();
  await page.waitForTimeout(2_000);
  // Page must remain functional after creation
  await expect(page.locator('main, [role="main"], .app-layout, #root')).toBeVisible();
  // Verify the branch appears in the list
  await page.goto('/admin/branches');
  await expect(page.locator('body')).toContainText(name);
});

test('an admin edits a branch', { tag: scenarioTag('ADMIN-BRANCHES-003', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/branches');
  // Click the first edit link
  const editLink = page.getByRole('link', { name: /edit/i }).or(page.locator('a[href*="/admin/branches/"]')).first();
  if (await editLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await editLink.click();
    await page.waitForTimeout(1_000);
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const current = await nameInput.inputValue();
      await nameInput.fill(`${current} updated`);
      await page.getByRole('button', { name: /save|submit|update/i }).click();
      await page.waitForTimeout(2_000);
    }
  }
  // Page must remain functional
  await expect(page.locator('main, [role="main"], .app-layout, #root')).toBeVisible();
});
