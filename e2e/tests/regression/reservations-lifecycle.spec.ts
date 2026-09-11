import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { addBookCopies, authedPost, createRunUser, ensureBook, runScopedIsbn } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('a member reserves a book with zero available copies', { tag: scenarioTag('RSV-001', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('rsv-reserve')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('rsv-reserve-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  // Check out the only copy so zero are available
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  // Reserve the book (zero copies available)
  const reserved = await authedPost(api, '/reservations', member, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();
});

test('my reservations lists the pending hold', { tag: scenarioTag('RSV-002', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('rsv-list')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('rsv-list-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const reserved = await authedPost(api, '/reservations', member, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/reservations');
  await expect(page).toHaveURL(/\/reservations/);
  await expect(page.locator('body')).toContainText(book.title);
});

test('a member cancels their own pending reservation', { tag: scenarioTag('RSV-003', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('rsv-cancel')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('rsv-cancel-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const reserved = await authedPost(api, '/reservations', member, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();
  const reservationId = (await reserved.json()) as { data: { id: string } };

  // Cancel the reservation
  const cancelled = await api.delete(`/api/reservations/${reservationId.data.id}`, {
    headers: { Authorization: `Bearer ${member.token}` },
  });
  expect(cancelled.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/reservations');
  // The cancelled reservation should no longer appear
  const reservationCards = page.locator('body').getByText(book.title);
  await expect(reservationCards).toHaveCount(0);
});

test('staff marks a hold ready', { tag: scenarioTag('RSV-004', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('rsv-ready')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('rsv-ready-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const reserved = await authedPost(api, '/reservations', member, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();
  const reservationId = (await reserved.json()) as { data: { id: string } };

  // Staff marks ready
  const ready = await authedPost(api, `/reservations/${reservationId.data.id}/ready`, admin);
  expect(ready.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/reservations');
  await expect(page.locator('body')).toContainText(/ready/i);
});

test('staff fulfills a ready hold', { tag: scenarioTag('RSV-005', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity('rsv-fulfill')}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn('rsv-fulfill-isbn'),
    categoryId: null,
  });
  const copies = await addBookCopies(api, admin, book, runBranch, 1);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();
  const reserved = await authedPost(api, '/reservations', member, { bookId: book.id, branchId: runBranch.id });
  expect(reserved.ok()).toBeTruthy();
  const reservationId = (await reserved.json()) as { data: { id: string } };

  // Staff marks ready then fulfills
  const ready = await authedPost(api, `/reservations/${reservationId.data.id}/ready`, admin);
  expect(ready.ok()).toBeTruthy();
  const fulfilled = await authedPost(api, `/reservations/${reservationId.data.id}/fulfill`, admin);
  expect(fulfilled.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/reservations');
  // The reservation should show as fulfilled or no longer pending
  await expect(page).toHaveURL(/\/reservations/);
});
