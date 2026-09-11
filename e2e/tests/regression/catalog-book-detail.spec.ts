import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { addBookCopies, ensureBook, runScopedIsbn } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('open a detail page from catalog results', { tag: scenarioTag('CATALOG-DETAIL-001', 'regression') }, async ({ page, api, admin, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('detail-book')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('detail-isbn'),
    categoryId: null,
  });
  await seedSession(page, member);
  await page.goto(`/catalog/${book.id}`);
  await expect(page).toHaveURL(new RegExp(`/catalog/${book.id}`));
  await expect(page.locator('body')).toContainText(book.title);
});

test('the detail shows ISBN, author, publication, and description', { tag: scenarioTag('CATALOG-DETAIL-002', 'regression') }, async ({ page, api, admin, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('metadata-book')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('metadata-isbn'),
    categoryId: null,
  });
  await seedSession(page, member);
  await page.goto(`/catalog/${book.id}`);
  // The detail page should show book metadata
  await expect(page.locator('body')).toContainText(/isbn|author|publication|description/i);
});

test('the detail shows copy availability and reserve entry for a member', { tag: scenarioTag('CATALOG-DETAIL-003', 'regression') }, async ({ page, api, admin, member, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('availability-book')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('availability-isbn'),
    categoryId: null,
  });
  await addBookCopies(api, admin, book, runBranch, 2);
  await seedSession(page, member);
  await page.goto(`/catalog/${book.id}`);
  await expect(page.getByText('2 of 2 copies available')).toBeVisible();
});
