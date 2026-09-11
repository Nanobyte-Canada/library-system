import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { addBookCopies, authedPost, createRunUser, ensureBook, runScopedIsbn } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

async function createCirculationBook(api: Parameters<typeof ensureBook>[0], admin: Parameters<typeof ensureBook>[1], suffix: string, copies: number, runBranch: { id: string; name: string }) {
  const book = await ensureBook(api, admin, {
    title: `PW ${identity(suffix)}`,
    author: 'Playwright Author',
    isbn: runScopedIsbn(`${suffix}-isbn`),
    categoryId: null,
  });
  return { book, copies: await addBookCopies(api, admin, book, runBranch, copies) };
}

test('staff checks out a copy for a member', { tag: scenarioTag('CIRC-DESK-001', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const { copies } = await createCirculationBook(api, admin, 'desk-checkout', 1, runBranch);
  await seedSession(page, librarian);
  await page.goto('/checkout-desk');
  await page.getByPlaceholder('Member ID').fill(member.userId);
  await page.getByLabel('Book Barcode').fill(copies[0].id);
  await page.getByRole('button', { name: 'Checkout Book' }).click();
  await expect(page.locator('.success-banner')).toContainText('Book checked out successfully');
});

test('staff returns a copy', { tag: scenarioTag('CIRC-DESK-002', 'regression') }, async ({ page, api, admin, librarian, runBranch, member }) => {
  const { copies } = await createCirculationBook(api, admin, 'desk-return', 1, runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  await seedSession(page, librarian);
  await page.goto('/checkout-desk');
  await page.getByRole('button', { name: 'Return' }).click();
  await page.getByLabel('Book Barcode').fill(copies[0].id);
  await page.getByRole('button', { name: 'Return Book' }).click();
  await expect(page.locator('.success-banner')).toContainText('Book returned successfully');
});

test('unknown identifier shows a recoverable error', { tag: scenarioTag('CIRC-DESK-003', 'regression') }, async ({ page, librarian, member }) => {
  await seedSession(page, librarian);
  await page.goto('/checkout-desk');
  await page.getByPlaceholder('Member ID').fill(member.userId);
  await page.getByLabel('Book Barcode').fill(`PW-NO-SUCH-${identity('missing')}`);
  await page.getByRole('button', { name: 'Checkout Book' }).click();
  await expect(page.locator('.error-banner')).toContainText('Copy not found');
  await expect(page.getByRole('button', { name: 'Checkout Book' })).toBeEnabled();
});

test('the 3-book borrowing limit blocks a fourth checkout', { tag: scenarioTag('CIRC-DESK-004', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const { copies } = await createCirculationBook(api, admin, 'limit-book', 4, runBranch);
  const member = await createRunUser(api, admin, identity('limit-member'), 'MEMBER', runBranch);
  for (const copy of copies.slice(0, 3)) {
    const response = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copy.id });
    expect(response.ok()).toBeTruthy();
  }
  await seedSession(page, librarian);
  await page.goto('/checkout-desk');
  await page.getByPlaceholder('Member ID').fill(member.userId);
  await page.getByLabel('Book Barcode').fill(copies[3].id);
  await page.getByRole('button', { name: 'Checkout Book' }).click();
  await expect(page.locator('.error-banner')).toContainText('Borrowing limit reached. Maximum 3 books allowed.');
});

test('one renewal extends the loan and is not repeatable', { tag: scenarioTag('CIRC-DESK-005', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const { book, copies } = await createCirculationBook(api, admin, 'renew-book', 1, runBranch);
  const member = await createRunUser(api, admin, identity('renew-member'), 'MEMBER', runBranch);
  const checkedOut = await authedPost(api, '/checkout', librarian, { userId: member.userId, copyId: copies[0].id });
  expect(checkedOut.ok()).toBeTruthy();

  await seedSession(page, member);
  await page.goto('/checkouts');
  const card = page.locator('.checkout-card', { hasText: book.title });
  await card.getByRole('button', { name: 'Renew' }).click();
  await expect(card.getByText('Renewed')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Renew' })).toHaveCount(0);
});

test('a pending reservation blocks renewal', { tag: scenarioTag('CIRC-DESK-006', 'regression') }, async ({ page, api, admin, librarian, runBranch }) => {
  const { book, copies } = await createCirculationBook(api, admin, 'reservation-block', 1, runBranch);
  const borrower = await createRunUser(api, admin, identity('blocked-borrower'), 'MEMBER', runBranch);
  const reserving = await createRunUser(api, admin, identity('blocking-reserver'), 'MEMBER', runBranch);
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
