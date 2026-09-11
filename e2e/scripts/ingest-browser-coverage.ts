import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

const input = resolve(REPO_ROOT, 'e2e/coverage/browser-coverage.json');
if (!existsSync(input)) {
  console.log('ingest-browser-coverage: no coverage input; skipping (optional)');
  process.exit(0);
}

const raw = JSON.parse(readFileSync(input, 'utf8')) as {
  tests?: Array<{ id: string; files?: string[] }>;
};

const map = {
  generatedAt: new Date().toISOString(),
  tests: (raw.tests ?? []).map((test) => ({ scenarioId: test.id, files: test.files ?? [] })),
};
writeFileSync(resolve(REPO_ROOT, 'specs/ui/empirical-impact-map.json'), `${JSON.stringify(map, null, 2)}\n`);
console.log(`ingest-browser-coverage: ${map.tests.length} test mapping(s)`);
