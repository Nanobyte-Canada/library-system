import { test, expect } from '@playwright/test';
import { scenarioTag } from '../../support/scenario';

test.use({ baseURL: process.env.PROD_BASE_URL ?? 'https://library.nanobyte.ca' });

test('production is available and identified as production', { tag: scenarioTag('PROD-SMOKE-001', 'prod') }, async ({ page, request }) => {
  const health = await request.get('/health');
  expect(health.ok()).toBeTruthy();
  const books = await request.get('/api/books?page=1&size=1');
  expect(books.ok()).toBeTruthy();
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  const marker = await page.locator('meta[name="app-environment"]').getAttribute('content');
  expect(marker).toBe('production');
});

test('production does not expose test-support endpoints', { tag: scenarioTag('PROD-SMOKE-002', 'prod') }, async ({ request }) => {
  for (const path of ['/api/test-support', '/api/__test__', '/api/test/seed']) {
    const response = await request.get(path);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  }
});
