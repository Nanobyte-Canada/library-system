import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { checkA11y } from '../../fixtures/a11y.fixture';
import { scenarioTag } from '../../support/scenario';

test('login page has no unapproved serious violations', { tag: scenarioTag('A11Y-001', 'a11y') }, async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await checkA11y(page);
});

test('dashboard has no unapproved serious violations', { tag: scenarioTag('A11Y-002', 'a11y') }, async ({ page, member }) => {
  await seedSession(page, member);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await checkA11y(page);
});

test('catalog has no unapproved serious violations', { tag: scenarioTag('A11Y-003', 'a11y') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/catalog');
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await checkA11y(page);
});
