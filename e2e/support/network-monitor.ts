import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export interface NetworkMonitor {
  errors: string[];
  assertClean(): void;
}

interface BaselineEntry {
  urlPattern: string;
  reason: string;
  owner: string;
  expiresOn: string;
}

function loadBaseline(): BaselineEntry[] {
  try {
    const file = resolve(__dirname, 'console-baseline.json');
    return JSON.parse(readFileSync(file, 'utf8')) as BaselineEntry[];
  } catch {
    return [];
  }
}

export function attachNetworkMonitor(
  page: Page,
  mode: 'annotate' | 'fail' = (process.env.NETWORK_MONITOR_MODE as 'annotate' | 'fail' | undefined) ?? 'annotate',
): NetworkMonitor {
  const errors: string[] = [];
  const baseline = loadBaseline();
  const allowlisted = (text: string) => baseline.some((entry) => new RegExp(entry.urlPattern).test(text));

  page.on('pageerror', (error) => {
    const text = `pageerror: ${error.message}`;
    if (!allowlisted(text)) errors.push(text);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = `console.error: ${message.text()}`;
      if (!allowlisted(text)) errors.push(text);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      const text = `HTTP ${response.status()} ${response.url()}`;
      if (!allowlisted(text)) errors.push(text);
    }
  });
  page.on('requestfailed', (request) => {
    const text = `requestfailed: ${request.method()} ${request.url()}`;
    if (!allowlisted(text)) errors.push(text);
  });

  return {
    errors,
    assertClean() {
      if (errors.length === 0) return;
      const summary = errors.join('\n');
      if (mode === 'fail') throw new Error(`Network/console errors:\n${summary}`);
      console.warn(`[network-monitor:annotate]\n${summary}`);
    },
  };
}
