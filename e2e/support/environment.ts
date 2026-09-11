import type { Page } from '@playwright/test';

export const ALLOWED_HOSTS = ['uatlibrary.nanobyte.ca'];
export const UAT_APP_ENVIRONMENT = 'uat';
export const DEFAULT_BASE_URL = 'https://uatlibrary.nanobyte.ca';

export function allowedBaseUrl(value: string | undefined): URL {
  const url = new URL(value ?? DEFAULT_BASE_URL);
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    throw new Error(`Refusing to run UI tests against non-UAT host "${url.hostname}"`);
  }
  return url;
}

export async function assertEnvironmentMarker(page: Page): Promise<void> {
  const marker = await page.locator('meta[name="app-environment"]').getAttribute('content');
  if (marker !== UAT_APP_ENVIRONMENT) {
    throw new Error(`Environment marker mismatch: expected "${UAT_APP_ENVIRONMENT}", got "${marker}"`);
  }
}
