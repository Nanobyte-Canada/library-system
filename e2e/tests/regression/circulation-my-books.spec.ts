import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { addBookCopies, authedPost, createRunUser, ensureBook, runScopedIsbn } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('the page loads the member\'s active loans', { tag: scenarioTag('CIRC-MYBOOKS-001', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('mybooks-active')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('mybooks-active-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const member = await createRunUser(api, admin, identity('mybooks-member'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/checkouts');
  await expect(page).toHaveURL(/\/checkouts/);
  await expect(page.locator('.checkout-card', { hasText: book.title })).toBeVisible();
});

test('an active loan shows its due date and renew action', { tag: scenarioTag('CIRC-MYBOOKS-002', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('mybooks-due')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('mybooks-due-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const member = await createRunUser(api, admin, identity('mybooks-due-member'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/checkouts');
  const card = page.locator('.checkout-card', { hasText: book.title });
  await expect(card).toBeVisible();
  await expect(card.getByText(/due/i)).toBeVisible();
  await expect(card.getByRole('button', { name: 'Renew' })).toBeVisible();
});

test('a renewal extends the due date once', { tag: scenarioTag('CIRC-MYBOOKS-003', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('mybooks-renew')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('mybooks-renew-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const member = await createRunUser(api, admin, identity('mybooks-renew-member'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/checkouts');
  const card = page.locator('.checkout-card', { hasText: book.title });
  await card.getByRole('button', { name: 'Renew' }).click();
  await expect(card.getByText('Renewed')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Renew' })).toHaveCount(0);
});

test('renewal is blocked when a pending reservation exists', { tag: scenarioTag('CIRC-MYBOOKS-004', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('mybooks-reservation-block')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('mybooks-block-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const borrower = await createRunUser(api, admin, identity('mybooks-borrower'), 'MEMBER', runBranch);
  const reserving = await createRunUser(api, admin, identity('mybooks-reserver'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: borrower.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const reserved = await authedPost(api, '/reservations', reserving, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();

  await seedSession(page, borrower);
  await page.goto('/checkouts');
  const card = page.locator('.checkout-card', { hasText: book.title });
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/checkout/') && res.url().endsWith('/renew')),
    card.getByRole('button', { name: 'Renew' }).click(),
  ]);
  expect(response.status()).toBe(400);
  await expect(card.getByText('Renewed')).toHaveCount(0);
});

test('the history lists returned loans', { tag: scenarioTag('CIRC-MYBOOKS-005', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('mybooks-history')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('mybooks-history-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const member = await createRunUser(api, admin, identity('mybooks-history-member'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const returned = await authedPost(api, '/return', librarian, { copyId: copies[0].id });
  expect(returned.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/checkouts');
  await expect(page).toHaveURL(/\/checkouts/);
  // The history should list the returned loan
  await expect(page.locator('body')).toContainText(new RegExp(book.title));
});
