import { test, expect, seedSession } from '../../fixtures/auth.fixture';
import { apiLogin, authedGet, createRunUser } from '../../fixtures/data.fixture';
import { identity } from '../../support/run-context';
import { scenarioTag } from '../../support/scenario';

test('ADMIN creates a user with role and branch', { tag: scenarioTag('ADMIN-USERS-001', 'regression') }, async ({ page, admin, runBranch }) => {
  const suffix = identity('new-user');
  const email = suffix; // identity() already includes the domain; `${suffix}@library.test` exceeds login.username VARCHAR(50)
  const phoneSeed = [...`${email}-phone`].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10_000_000, 7);
  const membershipId = `PW${String([...`${email}-mid`].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10_000_000, 7)).padStart(6, '0')}`;
  await seedSession(page, admin);
  await page.goto('/admin/users/new');
  await page.getByLabel('First Name').fill('PW');
  await page.getByLabel('Last Name').fill('User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Phone').fill(`555-${String(phoneSeed).padStart(7, '0')}`);
  await page.getByLabel('Membership ID').fill(membershipId);
  await page.getByLabel('Role').selectOption('MEMBER');
  await page.getByLabel('Membership Type').selectOption('PUBLIC');
  await page.getByLabel('Branch').selectOption({ label: runBranch.name });
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create User' }).click();
  await expect(page.getByText('User created successfully')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/users$/, { timeout: 15_000 });
  const row = page.locator('tr', { hasText: suffix });
  await expect(row).toContainText('MEMBER');
  await expect(row).toContainText(runBranch.name);
});

test('ADMIN changes a user role', { tag: scenarioTag('ADMIN-USERS-002', 'regression') }, async ({ page, api, admin, runBranch }) => {
  const user = await createRunUser(api, admin, identity('role-change'), 'MEMBER', runBranch);
  await seedSession(page, admin);
  await page.goto(`/admin/users/${user.userId}`);
  await page.getByLabel('Role').selectOption('LIBRARIAN');
  await page.getByRole('button', { name: 'Update User' }).click();
  await expect(page.getByText('User updated successfully')).toBeVisible();
  const response = await authedGet(api, `/users/${user.userId}`, admin);
  expect(response.ok()).toBeTruthy();
  expect(((await response.json()) as { data: { role: string } }).data.role).toBe('LIBRARIAN');
});

test('status is displayed but not editable in the UI', { tag: scenarioTag('ADMIN-USERS-003', 'regression') }, async ({ page, admin }) => {
  await seedSession(page, admin);
  await page.goto('/admin/users');
  const rows = page.locator('tbody tr');
  expect(await rows.count()).toBeGreaterThan(0);
  await expect(rows.first().getByText(/Active|Inactive/)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /deactivate|inactivate|status/i })).toHaveCount(0);
});

test('list search and role filter', { tag: scenarioTag('ADMIN-USERS-004', 'regression') }, async ({ page, api, admin }) => {
  const alpha = await createRunUser(api, admin, identity('search-alpha'), 'MEMBER');
  await createRunUser(api, admin, identity('search-beta'), 'LIBRARIAN');
  await seedSession(page, admin);
  await page.goto('/admin/users');
  await page.getByPlaceholder(/Search by name, email, phone, or membership ID/).fill(alpha.username);
  const visibleRows = page.locator('tbody tr');
  await expect(visibleRows).toHaveCount(1);
  await expect(visibleRows.first()).toContainText(alpha.username);
  await page.getByPlaceholder(/Search by name, email, phone, or membership ID/).fill('');
  await page.locator('select').first().selectOption('MEMBER');
  await expect(page.locator('tbody tr').getByText('LIBRARIAN', { exact: true })).toHaveCount(0);
});

test('user edits their own profile', { tag: scenarioTag('ADMIN-USERS-005', 'regression') }, async ({ page, member }) => {
  await seedSession(page, member);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Profile' }).click();
  const firstName = page.getByLabel('First Name');
  await firstName.fill('PW Updated');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Profile updated successfully')).toBeVisible();
  await expect(page.locator('.profile-name')).toContainText('PW Updated');
});

test('user changes their own password', { tag: scenarioTag('ADMIN-USERS-006', 'regression') }, async ({ page, request, api, admin }) => {
  const user = await createRunUser(api, admin, identity('password-change'), 'MEMBER');
  await seedSession(page, user);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await page.getByLabel('Current Password').fill('password123');
  await page.getByLabel('New Password').fill('newpassword456');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.getByText('Password changed successfully')).toBeVisible();
  await expect(apiLogin(request, user.username, 'password123')).rejects.toThrow();
  const reauthenticated = await apiLogin(request, user.username, 'newpassword456');
  expect(reauthenticated.token).toBeTruthy();
});

test('duplicate email is rejected', { tag: scenarioTag('ADMIN-USERS-007', 'regression') }, async ({ page, api, admin }) => {
  const existing = await createRunUser(api, admin, identity('duplicate'), 'MEMBER');
  await seedSession(page, admin);
  await page.goto('/admin/users/new');
  await page.getByLabel('First Name').fill('PW');
  await page.getByLabel('Last Name').fill(identity('duplicate-2'));
  await page.getByLabel('Email').fill(existing.username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create User' }).click();
  await expect(page.getByText(/already exists/i)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/users\/new/);
});
