import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

interface RunSummary {
  tests: Array<{ title: string; retries: number; status: string }>;
}

const dir = resolve(REPO_ROOT, 'e2e/reliability');
const files = [1, 2, 3, 4, 5].map((n) => resolve(dir, `results-${n}.json`)).filter((file) => existsSync(file));
const runs: RunSummary[] = files.map((file) => {
  const report = JSON.parse(readFileSync(file, 'utf8')) as {
    suites?: Array<{ specs?: Array<{ title: string; tests?: Array<{ results?: Array<{ retry: number; status: string }> }> }> }>;
  };
  const tests: RunSummary['tests'] = [];
  const visit = (suite: { specs?: unknown[]; suites?: unknown[] }) => {
    for (const spec of (suite.specs ?? []) as Array<{ title: string; tests?: Array<{ results?: Array<{ retry: number; status: string }> }> }>) {
      const results = spec.tests?.[0]?.results ?? [];
      tests.push({
        title: spec.title,
        retries: Math.max(0, ...results.map((result) => result.retry)),
        status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
      });
    }
    for (const child of (suite.suites ?? []) as Array<{ specs?: unknown[]; suites?: unknown[] }>) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return { tests };
});

const totalRuns = runs.length;
const cleanRuns = runs.filter((run) => run.tests.every((test) => test.status === 'passed' && test.retries === 0)).length;
const reliability = totalRuns === 0 ? 0 : cleanRuns / totalRuns;
const flakyTests = [...new Set(runs.flatMap((run) => run.tests.filter((test) => test.retries > 0).map((test) => test.title)))];

const output = { generatedAt: new Date().toISOString(), runs: totalRuns, cleanRuns, reliability, flakyTests };
writeFileSync(resolve(REPO_ROOT, 'e2e/reliability/reliability.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`measure-reliability: ${cleanRuns}/${totalRuns} clean runs, ${flakyTests.length} flaky test(s)`);
