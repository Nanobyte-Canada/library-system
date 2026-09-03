import { expect, type Page, type APIRequestContext } from '@playwright/test';

export const USERS = {
  admin: { username: 'admin', password: 'password123', name: 'Admin User', role: 'ADMIN' },
  jane:  { username: 'jane',  password: 'password123', name: 'Jane Librarian', role: 'LIBRARIAN' },
  john:  { username: 'john',  password: 'password123', name: 'John Member', role: 'MEMBER' },
} as const;

export type TestUser = keyof typeof USERS;

/** UI login through the login form; waits for navigation away from /login. */
export async function login(page: Page, user: TestUser) {
  const u = USERS[user];
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(u.username);
  await page.getByLabel(/password/i).fill(u.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

/** API login; returns the full Authorization header value ("Bearer <jwt>"). */
export async function getApiToken(request: APIRequestContext, user: TestUser): Promise<string> {
  const u = USERS[user];
  const res = await request.post('/api/auth/login', {
    data: { username: u.username, password: u.password },
  });
  if (!res.ok()) throw new Error(`API login failed for ${user}: ${res.status()}`);
  const auth = res.headers()['authorization'];
  if (!auth) throw new Error(`No Authorization header in login response for ${user}`);
  return auth;
}

/** Authenticated API GET helper for fast state setup in future tests. */
export async function authedGet(request: APIRequestContext, path: string, token: string) {
  return request.get(path, { headers: { Authorization: token } });
}
