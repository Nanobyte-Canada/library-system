import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

interface BaselineEntry {
  rule: string;
  target: string;
  reason: string;
  owner: string;
  expiresOn: string;
}

export async function checkA11y(page: Page): Promise<void> {
  const baselineFile = resolve(__dirname, '../a11y-baseline.json');
  const baseline = (JSON.parse(readFileSync(baselineFile, 'utf8')) as { exceptions: BaselineEntry[] }).exceptions;
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const today = new Date().toISOString().slice(0, 10);
  const blocking = results.violations.filter((violation) => {
    if (violation.impact !== 'serious' && violation.impact !== 'critical') return false;
    return !violation.nodes.every((node) =>
      baseline.some(
        (entry) =>
          entry.rule === violation.id &&
          entry.expiresOn >= today &&
          node.target.some((target) => target.toString().includes(entry.target)),
      ),
    );
  });
  if (blocking.length > 0) {
    const summary = blocking
      .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
      .join('\n');
    throw new Error(`Accessibility violations:\n${summary}`);
  }
}
