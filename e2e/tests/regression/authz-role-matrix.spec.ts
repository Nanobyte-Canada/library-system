import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { authedGet, authedPost } from '../../fixtures/data.fixture';
import { scenarioTag } from '../../support/scenario';

const ADMIN_STATIC_ROUTES = [
  '/admin/books',
  '/admin/books/new',
  '/admin/categories',
  '/admin/users',
  '/admin/users/new',
  '/admin/branches',
  '/admin/branches/new',
  '/admin/audit-logs',
];

const AUTHENTICATED_ROUTES = ['/dashboard', '/catalog', '/profile', '/reservations', '/checkouts', '/scan'];

test('anonymous access to guarded routes redirects to login', { tag: scenarioTag('AUTHZ-001', 'regression') }, async ({ page, runBranch }) => {
  const paths = [...ADMIN_STATIC_ROUTES, ...AUTHENTICATED_ROUTES, `/admin/branches/${runBranch.id}`, '/checkout-desk'];
  for (const path of paths) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  }
});

test('ADMIN reaches every route', { tag: scenarioTag('AUTHZ-002', 'regression') }, async ({ page, admin, runBranch, catalogBook }) => {
  await seedSession(page, admin);
  const paths = [
    ...ADMIN_STATIC_ROUTES,
    ...AUTHENTICATED_ROUTES,
    '/checkout-desk',
    `/admin/books/${catalogBook.id}`,
    `/admin/users/${admin.userId}`,
    `/admin/branches/${runBranch.id}`,
  ];
  for (const path of paths) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
  }
});

test('LIBRARIAN reaches books and categories but not system administration', { tag: scenarioTag('AUTHZ-003', 'regression') }, async ({ page, librarian, runBranch, catalogBook }) => {
  await seedSession(page, librarian);
  const allowed = ['/admin/books', '/admin/books/new', `/admin/books/${catalogBook.id}`, '/admin/categories'];
  for (const path of allowed) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
  }
  const forbidden = [
    '/admin/users',
    '/admin/users/new',
    `/admin/users/${librarian.userId}`,
    '/admin/branches',
    '/admin/branches/new',
    `/admin/branches/${runBranch.id}`,
    '/admin/audit-logs',
  ];
  for (const path of forbidden) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  }
});

test('MEMBER is redirected from admin routes to the dashboard', { tag: scenarioTag('AUTHZ-004', 'regression') }, async ({ page, member, runBranch, catalogBook }) => {
  await seedSession(page, member);
  const paths = [
    ...ADMIN_STATIC_ROUTES,
    `/admin/books/${catalogBook.id}`,
    `/admin/users/${member.userId}`,
    `/admin/branches/${runBranch.id}`,
  ];
  for (const path of paths) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  }
});

test('checkout desk direct navigation documents the guard boundary', { tag: scenarioTag('AUTHZ-005', 'regression') }, async ({ page, member, librarian }) => {
  await seedSession(page, member);
  await page.goto('/checkout-desk');
  await expect(page).toHaveURL(/checkout-desk/);
  await expect(page.getByRole('heading', { name: /Checkout & Return/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Checkout Desk' })).toHaveCount(0);

  await seedSession(page, librarian);
  await page.goto('/checkout-desk');
  await expect(page).toHaveURL(/checkout-desk/);
  await expect(page.getByRole('heading', { name: /Checkout & Return/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Checkout Desk' })).toHaveCount(0);
});

test('sidebar sections follow the role matrix', { tag: scenarioTag('AUTHZ-006', 'regression') }, async ({ page, admin, librarian, member }) => {
  const adminOnly = ['Users', 'Branches', 'Audit Log', 'Checkout Desk'];
  const staff = ['Books', 'Categories'];

  await seedSession(page, admin);
  for (const name of [...staff, ...adminOnly]) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }

  await seedSession(page, librarian);
  for (const name of staff) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
  for (const name of adminOnly) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }

  await seedSession(page, member);
  for (const name of [...staff, ...adminOnly]) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  for (const name of ['Dashboard', 'Catalog', 'My Books']) {
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
  }
});

test('API role enforcement spot-checks', { tag: scenarioTag('AUTHZ-007', 'regression') }, async ({ request, admin, librarian, member, runBranch, catalogBook }) => {
  const anonymousUsers = await request.get('/api/users');
  expect(anonymousUsers.status()).toBe(403);

  for (const actor of [member, librarian]) {
    const users = await authedGet(request, '/users?page=1&size=1', actor);
    expect(users.status()).toBe(403);
    const audit = await authedGet(request, '/audit-logs?limit=1', actor);
    expect(audit.status()).toBe(403);
  }

  const memberDesk = await authedPost(request, '/checkout', member, {
    userId: member.userId,
    copyId: catalogBook.id,
  });
  expect(memberDesk.status()).toBe(403);

  const librarianBooks = await authedGet(request, `/books/${catalogBook.id}`, librarian);
  expect(librarianBooks.status()).toBe(200);

  const adminUsers = await authedGet(request, '/users?page=1&size=1', admin);
  expect(adminUsers.status()).toBe(200);
});
