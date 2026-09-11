import type { Page, Request } from '@playwright/test';

export const NEGATIVE_REQUEST_WINDOW_MS = 3_000;
export const NEGATIVE_EMAIL_WINDOW_MS = 5_000;

export async function expectNoRequestMatching(
  page: Page,
  predicate: (url: string, method: string) => boolean,
  windowMs = NEGATIVE_REQUEST_WINDOW_MS,
): Promise<void> {
  const hits: string[] = [];
  const handler = (request: Request) => {
    if (predicate(request.url(), request.method())) hits.push(`${request.method()} ${request.url()}`);
  };
  page.on('request', handler);
  await page.waitForTimeout(windowMs);
  page.off('request', handler);
  if (hits.length > 0) {
    throw new Error(`Unexpected requests during the negative window: ${hits.join(', ')}`);
  }
}

export async function expectNoEmailInInbox(
  inbox: { count: () => Promise<number> },
  windowMs = NEGATIVE_EMAIL_WINDOW_MS,
): Promise<void> {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    if ((await inbox.count()) > 0) {
      throw new Error('An email arrived during the negative window');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
