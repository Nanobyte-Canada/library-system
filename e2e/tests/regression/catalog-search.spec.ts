import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { ensureBook } from '../../fixtures/data.fixture';
import { identity, runId } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('member browses the catalog and sees books', { tag: scenarioTag('CATALOG-SEARCH-001', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/catalog');
  await expect(page).toHaveURL(/\/catalog/);
  // Wait for book cards to render (async data load)
  await expect(page.locator('[data-testid="catalog-book-card"], [role="article"]').first()).toBeVisible({ timeout: 10_000 });
  // Seed data has books; at least one should be visible on the first page
  await expect(page.locator('body')).toContainText(/Jaina|Religion|Karman|Vegetarian|Playwright/i);
});

test('search by title returns matching books', { tag: scenarioTag('CATALOG-SEARCH-002', 'regression') }, async ({ page, api, librarian }) => {
  const book = await ensureBook(api, librarian, {
    title: `PW ${identity('search-book')}`,
    author: 'Playwright Author',
    isbn: '',
    categoryId: null,
  });
  await seedSession(page, librarian);
  await page.goto('/catalog');
  const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
  await searchInput.fill(book.title);
  await page.keyboard.press('Enter');
  // Wait for results to load
  await page.waitForTimeout(2_000);
  await expect(page.locator('body')).toContainText(book.title);
});

test('an unmatched query shows no results', { tag: scenarioTag('CATALOG-SEARCH-003', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/catalog');
  const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
  await searchInput.fill(`NO-BOOK-MATCHES-${runId()}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2_000);
  // No book cards should be visible for an unmatched query
  const bookCards = page.locator('[data-testid="catalog-book-card"], [role="article"]');
  await expect(bookCards).toHaveCount(0);
});
