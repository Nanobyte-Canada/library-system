import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { addBookCopies, ensureBook, ensureCategory, runScopedIsbn } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('create a book with category and metadata', { tag: scenarioTag('ADMIN-BOOKS-001', 'regression') }, async ({ page, api, admin }) => {
  const category = await ensureCategory(api, admin, `PW ${identity('catalog-category')}`);
  const title = `PW ${identity('catalog-book')}`;
  await seedSession(page, admin);
  await page.goto('/admin/books/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Author').fill('Playwright Author');
  await page.getByLabel('Publication').fill('Playwright Press');
  await page.getByLabel('Language').fill('English');
  await page.getByLabel('Category').selectOption({ label: category.name });
  await page.getByLabel('Location').fill('PW Shelf');
  await page.getByRole('button', { name: 'Create Book' }).click();
  await expect(page.getByText('Book created successfully')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/books$/, { timeout: 15_000 });
  await expect(page.getByText(title)).toBeVisible();
});

test('update a book', { tag: scenarioTag('ADMIN-BOOKS-002', 'regression') }, async ({ page, api, admin }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('update-book')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('update-book-isbn'),
    categoryId: null,
  });
  const updatedTitle = `${book.title} updated`;
  await seedSession(page, admin);
  await page.goto(`/admin/books/${book.id}`);
  await page.getByLabel('Title').fill(updatedTitle);
  await page.getByRole('button', { name: 'Update Book' }).click();
  await expect(page.getByText('Book updated successfully')).toBeVisible();
  await page.goto('/admin/books');
  await expect(page.getByText(updatedTitle)).toBeVisible();
});

test('required fields block submission', { tag: scenarioTag('ADMIN-BOOKS-003', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/books/new');
  await page.getByLabel('Author').fill('Playwright Author');
  await page.getByRole('button', { name: 'Create Book' }).click();
  await expect(page).toHaveURL(/\/admin\/books\/new/);
  await expect(page.getByText('Book created successfully')).toHaveCount(0);
});

test('copies created through the API appear as availability', { tag: scenarioTag('ADMIN-BOOKS-004', 'regression') }, async ({ page, api, admin, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('copies-book')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('copies-book-isbn'),
    categoryId: null,
  });
  await addBookCopies(api, admin, book, runBranch, 2);
  await seedSession(page, admin);
  await page.goto(`/catalog/${book.id}`);
  await expect(page.getByText('2 of 2 copies available')).toBeVisible();
});

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
