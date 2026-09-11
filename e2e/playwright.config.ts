import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

const CI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { outputFolder: 'report', open: 'never' }],
  ['junit', { outputFile: 'test-results/junit.xml' }],
  ['json', { outputFile: 'test-results/results.json' }],
];

if (CI) {
  reporters.push(['github']);
}

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: reporters,
  use: {
    baseURL: process.env.BASE_URL ?? 'https://uatlibrary.nanobyte.ca',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: './test-results',
  projects: [
    { name: 'chromium', grepInvert: /@mobile/, use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', grep: /@mobile/, use: { ...devices['Pixel 7'] } },
  ],
});
