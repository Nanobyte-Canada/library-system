import { test as base } from '@playwright/test';
import { allowedBaseUrl, assertEnvironmentMarker } from '../support/environment';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppFixtures {}

export const test = base.extend<AppFixtures, { appEnvironment: void }>({
  appEnvironment: [
    async ({ browser }, use) => {
      const url = allowedBaseUrl(process.env.BASE_URL);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${url.origin}/login`);
      await assertEnvironmentMarker(page);
      await context.close();
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect } from '@playwright/test';
