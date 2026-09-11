import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

const reportsDir = resolve(process.env.REPORTS_DIR ?? resolve(REPO_ROOT, '../test-reports'));
const runsDir = resolve(reportsDir, 'runs');
mkdirSync(runsDir, { recursive: true });

const runId = process.env.GITHUB_RUN_ID ?? `debug-${Date.now()}`;
const sha = process.env.GITHUB_SHA ?? 'unknown';
const runUrl = process.env.GITHUB_RUN_URL ?? '';
const date = new Date().toISOString();

const coverage = JSON.parse(readFileSync(resolve(REPO_ROOT, 'docs/testing/coverage.json'), 'utf8')) as {
  coveredRequirements: string[];
  failures: string[];
  results: Array<{ id: string; status: string; layer: string }>;
};
const impact = existsSync(resolve(REPO_ROOT, 'specs/ui/impact-gate.json'))
  ? JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/impact-gate.json'), 'utf8'))
  : null;

const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
for (const result of coverage.results) {
  if (result.status in counts) counts[result.status as keyof typeof counts] += 1;
}

const entry = { runId, sha, testedSha: process.env.TESTED_SHA ?? sha, date, runUrl, counts, coveredRequirements: coverage.coveredRequirements, failures: coverage.failures, impact };
writeFileSync(resolve(runsDir, `${date.replace(/[:.]/g, '-')}-${runId}.json`), `${JSON.stringify(entry, null, 2)}\n`);
copyFileSync(resolve(REPO_ROOT, 'docs/testing/coverage.md'), resolve(reportsDir, 'latest-coverage.md'));

const runFiles = readdirSync(runsDir).filter((file) => file.endsWith('.json')).sort().slice(-20);
const recent = runFiles.map((file) => JSON.parse(readFileSync(resolve(runsDir, file), 'utf8')) as typeof entry);
const failedRuns = recent.filter((run) => run.counts.failed > 0 || run.failures.length > 0).length;

const dashboard = [
  '# UI Test Dashboard',
  '',
  `Latest run: \`${runId}\` (${sha})${runUrl ? ` — [run](${runUrl})` : ''}`,
  '',
  `| Metric | Value |`,
  `|---|---|`,
  `| Passed scenarios | ${counts.passed} |`,
  `| Failed scenarios | ${counts.failed} |`,
  `| Flaky scenarios | ${counts.flaky} |`,
  `| Skipped scenarios | ${counts.skipped} |`,
  `| Covered requirements | ${coverage.coveredRequirements.length} |`,
  `| Critical coverage failures | ${coverage.failures.length} |`,
  `| Runs in window with failures | ${failedRuns} / ${recent.length} |`,
  '',
  '## Recent runs',
  '',
  ...recent.map((run) => `- ${run.date} \`${run.runId}\` (${run.sha.slice(0, 7)}) — failed ${run.counts.failed}, flaky ${run.counts.flaky}`),
  '',
  '## Data hygiene',
  '',
  '- Run-namespaced data volume is reviewed manually against the `docs/testing/operations.md` threshold (CI has no ADMIN token and public endpoints do not expose creation metadata).',
  '',
  '## Latest coverage',
  '',
  'See [latest-coverage.md](./latest-coverage.md).',
  '',
  '## Notes',
  '',
  '- Reliability and flaky trends are produced by `ui-reliability.yml` (Phase 4).',
  '- Impact-gate bypass and false-positive rates are added in Phase 5.',
].join('\n');

writeFileSync(resolve(reportsDir, 'dashboard.md'), `${dashboard}\n`);
console.log(`publish-history: wrote run ${runId} and dashboard`);
