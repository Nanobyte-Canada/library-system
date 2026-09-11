import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { ensureCategory } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('create a root category', { tag: scenarioTag('ADMIN-META-001', 'regression') }, async ({ page, librarian }) => {
  const name = `PW ${identity('root-category')}`;
  await seedSession(page, librarian);
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Add Category' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(name)).toBeVisible();
});

test('create a child category under a parent', { tag: scenarioTag('ADMIN-META-002', 'regression') }, async ({ page, api, admin }) => {
  const parent = await ensureCategory(api, admin, `PW ${identity('parent-category')}`);
  const childName = `PW ${identity('child-category')}`;
  await seedSession(page, admin);
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Add Category' }).click();
  await page.getByLabel('Name', { exact: true }).fill(childName);
  await page.getByLabel('Parent Category (optional)').selectOption({ label: parent.name });
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(childName)).toBeVisible();
});

test('category name is required', { tag: scenarioTag('ADMIN-META-003', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Add Category' }).click();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Category name is required')).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
});
