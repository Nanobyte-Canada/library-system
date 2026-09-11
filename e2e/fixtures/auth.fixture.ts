import type { Page } from '@playwright/test';
import { test as dataTest, expect, type AuthContext } from './data.fixture';

// The app persists auth in two places: the raw `token` key (read by
// frontend/src/services/api.ts) and the zustand `auth-storage` entry (read by
// frontend/src/components/ProtectedRoute.tsx). Both must be seeded for a session
// to exist. The sessionStorage marker makes seeding one-shot so a reload actually
// exercises persistence and the 401 interceptor is not re-seeded after redirect.
const SESSION_SEEDED_KEY = 'pw-session-seeded';

interface SeededSession {
  marker: string;
  token: string;
  user: { id: string; firstName: string; lastName: string; role: string; email: string };
}

export async function seedSession(page: Page, auth: AuthContext): Promise<void> {
  await page.addInitScript((session: SeededSession) => {
    if (window.sessionStorage.getItem(session.marker)) return;
    window.sessionStorage.setItem(session.marker, '1');
    window.localStorage.setItem('token', session.token);
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: { token: session.token, user: session.user, isAuthenticated: true },
        version: 0,
      }),
    );
  }, {
    marker: SESSION_SEEDED_KEY,
    token: auth.token,
    user: {
      id: auth.userId,
      firstName: 'PW',
      lastName: 'User',
      role: auth.role,
      email: auth.username,
    },
  } satisfies SeededSession);
  await page.goto('/dashboard');
}

export async function clearSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('auth-storage');
  });
}

export const test = dataTest;
export { expect };
