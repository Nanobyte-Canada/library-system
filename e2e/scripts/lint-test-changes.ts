import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

interface Finding { file: string; line: string; rule: string }

const base = process.env.BASE_SHA ?? 'origin/master';
const git = (args: string) => execSync(`git ${args}`, { cwd: REPO_ROOT, encoding: 'utf8' });

const mergeBase = git(`merge-base ${base} HEAD`).trim();
const WATCHED_PATHS = [
  'e2e/tests',
  'e2e/fixtures',
  'e2e/pages',
  'e2e/support',
  'frontend/src',
  'frontend/vitest.config.ts',
  'e2e/playwright.config.ts',
  'specs/ui',
  'e2e/a11y-baseline.json',
  'e2e/support/console-baseline.json',
];

const diff = git(`diff -U0 ${mergeBase} HEAD -- ${WATCHED_PATHS.join(' ')}`);
const findings: Finding[] = [];
let currentFile = '';

const WEAKER_PAIRS: Array<[RegExp, RegExp]> = [
  [/toBeVisible\(/, /toBeAttached\(/],
  [/toHaveText\(/, /toContainText\(/],
  [/toHaveValue\(/, /toHaveAttribute\(/],
  [/toHaveCount\(\s*\d+\s*\)/, /not\.toHaveCount\(0\)/],
];

const SCENARIO_ID = /@[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}|scenario\(['"][A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}/;
const addedLines: string[] = [];
const removedLines: string[] = [];

for (const rawLine of diff.split('\n')) {
  if (rawLine.startsWith('+++ b/')) {
    currentFile = rawLine.slice(6);
    continue;
  }
  if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) addedLines.push(rawLine.slice(1));
  if (rawLine.startsWith('-') && !rawLine.startsWith('---')) removedLines.push(rawLine.slice(1));
}

for (const line of addedLines) {
  const file = currentFile;
  if (/\.skip\(|\.fixme\(|test\.fail\(/.test(line)) {
    findings.push({ file, line, rule: 'added test skip/fixme/fail' });
  }
  if (/waitForTimeout\(/.test(line) && !file.includes('negative-wait.ts')) {
    findings.push({ file, line, rule: 'fixed sleep outside negative-wait.ts' });
  }
  if (/retries:\s*\d+|actionTimeout:\s*\d+|timeout:\s*\d+/.test(line) && /config\.ts$/.test(file)) {
    findings.push({ file, line, rule: 'changed retry/timeout configuration' });
  }
  if (/toBeAttached\(|toContainText\(/.test(line)) {
    findings.push({ file, line, rule: 'possible assertion weakening (weaker matcher added)' });
  }
}

for (const pair of WEAKER_PAIRS) {
  const removedStrong = removedLines.some((line) => pair[0].test(line));
  const addedWeak = addedLines.some((line) => pair[1].test(line));
  if (removedStrong && addedWeak) {
    findings.push({ file: currentFile, line: '(diff)', rule: `assertion weakening pair ${pair[0]} -> ${pair[1]}` });
  }
}

for (const line of removedLines) {
  if (/expect\(/.test(line)) findings.push({ file: currentFile, line, rule: 'removed assertion' });
  if (SCENARIO_ID.test(line)) findings.push({ file: currentFile, line, rule: 'removed scenario annotation' });
}

const changedNames = git(`diff --name-status ${mergeBase} HEAD`).trim().split('\n');
for (const entry of changedNames) {
  const [status, file] = entry.split('\t');
  if (!file) continue;
  if (/-snapshots\//.test(file) || file.endsWith('a11y-baseline.json') || file.endsWith('console-baseline.json')) {
    findings.push({ file, line: status, rule: 'baseline or allowlist change' });
  }
}

writeFileSync(resolve(REPO_ROOT, 'specs/ui/lint-report.json'), `${JSON.stringify({ findings }, null, 2)}\n`);
const markdown = ['# Test-change lint report', '', ...(findings.length === 0 ? ['No findings.'] : findings.map((finding) => `- \`${finding.file}\` ${finding.line} — ${finding.rule}`))].join('\n');
writeFileSync(resolve(REPO_ROOT, 'specs/ui/lint-report.md'), `${markdown}\n`);

if (findings.length > 0 && process.env.LINT_APPROVED !== 'true') {
  console.error(`lint-test-changes: ${findings.length} finding(s)`);
  for (const finding of findings) console.error(` - ${finding.file}: ${finding.rule}`);
  process.exit(1);
}
console.log(`lint-test-changes: ${findings.length} finding(s)${process.env.LINT_APPROVED === 'true' ? ' (approved)' : ''}`);
