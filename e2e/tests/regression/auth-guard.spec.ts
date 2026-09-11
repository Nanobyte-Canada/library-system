import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { scenarioTag } from '../../support/scenario';

test('librarian reaches a role-guarded admin route', { tag: scenarioTag('AUTH-SESSION-006', 'regression') }, async ({ page, librarian }) => {
  await seedSession(page, librarian);
  await page.goto('/admin/books');
  await expect(page).toHaveURL(/\/admin\/books/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('admin reaches a role-guarded admin route', { tag: scenarioTag('AUTH-SESSION-007', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('member is redirected from admin routes to the dashboard', { tag: scenarioTag('AUTH-SESSION-008', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/admin/books');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('member direct navigation to the checkout desk documents current behavior', { tag: scenarioTag('AUTH-SESSION-009', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/checkout-desk');
  await expect(page).toHaveURL(/\/checkout-desk/);
  await expect(page.getByRole('heading', { name: /Checkout & Return/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Checkout Desk' })).toHaveCount(0);
});
