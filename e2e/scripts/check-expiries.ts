import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';
import { listPlanFiles, parsePlan } from './lib/frontmatter';

const today = new Date().toISOString().slice(0, 10);
const failures: string[] = [];

const a11y = JSON.parse(readFileSync(resolve(REPO_ROOT, 'e2e/a11y-baseline.json'), 'utf8')) as {
  exceptions: Array<{ rule: string; owner: string; expiresOn: string }>;
};
for (const entry of a11y.exceptions) {
  if (entry.expiresOn < today) failures.push(`expired a11y baseline exception ${entry.rule} (owner ${entry.owner})`);
}

const consoleBaseline = JSON.parse(readFileSync(resolve(REPO_ROOT, 'e2e/support/console-baseline.json'), 'utf8')) as Array<{
  urlPattern: string;
  owner: string;
  expiresOn: string;
}>;
for (const entry of consoleBaseline) {
  if (entry.expiresOn < today) failures.push(`expired console baseline entry ${entry.urlPattern} (owner ${entry.owner})`);
}

const quarantine = JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/quarantine.json'), 'utf8')) as {
  quarantined: Array<{ scenarioId: string; owner: string; expiresOn: string }>;
};
for (const entry of quarantine.quarantined) {
  if (entry.expiresOn < today) failures.push(`expired quarantine ${entry.scenarioId} (owner ${entry.owner})`);
}
if (quarantine.quarantined.length > 5) failures.push(`quarantine count ${quarantine.quarantined.length} exceeds the limit of 5`);

const reviewWindowDays = 180;
const limit = new Date(Date.now() - reviewWindowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
for (const plan of listPlanFiles(resolve(REPO_ROOT, 'specs/ui')).map(parsePlan)) {
  if (plan.data.status !== 'approved') continue;
  const lastReviewed = String(plan.data.last_reviewed ?? '');
  const critical = plan.data.priority === 'critical';
  if (lastReviewed < limit) {
    const message = `plan ${plan.file} last reviewed ${lastReviewed} (window ${reviewWindowDays} days)`;
    if (critical) failures.push(`critical ${message}`);
    else console.warn(`::warning::${message}`);
  }
}

if (failures.length > 0) {
  console.error(`check-expiries: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('check-expiries: OK');
