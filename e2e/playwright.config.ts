import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ...(process.env.CI ? [['github']] : []),
    ['html', { outputFolder: 'report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://uatlibrary.nanobyte.ca',
    screenshot: 'on',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  outputDir: './test-results',
});
