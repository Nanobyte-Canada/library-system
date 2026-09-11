import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

interface ScenarioResult {
  id: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  layer: 'browser' | 'component';
  title: string;
}

interface ManifestScenario {
  id: string;
  priority: string;
  layer: string;
  target: string;
  automation: string;
  status: string;
}

interface ManifestFeature {
  id: string;
  plan: string;
  status: string;
  priority: string;
  criticalJourneys: string[];
  requirementRefs: string[];
  scenarios: ManifestScenario[];
}

const SCENARIO_ID = /[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}/;

function extractId(title: string, tags: string[] = []): string | null {
  for (const tag of tags) {
    const match = SCENARIO_ID.exec(tag.replace(/^@/, ''));
    if (match) return match[0];
  }
  return SCENARIO_ID.exec(title)?.[0] ?? null;
}

function readPlaywrightResults(): ScenarioResult[] {
  const file = resolve(REPO_ROOT, 'e2e/test-results/results.json');
  if (!existsSync(file)) return [];
  const report = JSON.parse(readFileSync(file, 'utf8')) as {
    suites?: Array<{ specs?: Array<{ title: string; tags?: string[]; tests?: Array<{ status: string; tags?: string[]; results?: Array<{ status: string; retry: number }> }> }> }>;
  };
  const results: ScenarioResult[] = [];
  const visit = (suite: { specs?: unknown[]; suites?: unknown[] }) => {
    for (const spec of (suite.specs ?? []) as Array<{ title: string; tests?: Array<{ status: string; tags?: string[]; results?: Array<{ status: string; retry: number }> }> }>) {
      for (const test of spec.tests ?? []) {
        const id = extractId(spec.title, spec.tags ?? test.tags);
        if (!id) continue;
        const flaky = test.status === 'flaky' || (test.results ?? []).some((result) => result.retry > 0 && result.status === 'passed');
        const failed = test.status === 'unexpected' || (test.results ?? []).every((result) => result.status === 'failed');
        const status = flaky ? 'flaky' : failed ? 'failed' : test.status === 'skipped' ? 'skipped' : 'passed';
        results.push({ id, status, layer: 'browser', title: spec.title });
      }
    }
    for (const child of (suite.suites ?? []) as Array<{ specs?: unknown[]; suites?: unknown[] }>) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return results;
}

function readVitestResults(): ScenarioResult[] {
  const file = resolve(REPO_ROOT, 'frontend/test-results/results.json');
  if (!existsSync(file)) return [];
  const report = JSON.parse(readFileSync(file, 'utf8')) as {
    testResults?: Array<{ assertionResults?: Array<{ title: string; fullName?: string; status: string }> }>;
  };
  const results: ScenarioResult[] = [];
  for (const fileResult of report.testResults ?? []) {
    for (const assertion of fileResult.assertionResults ?? []) {
      const id = extractId(assertion.fullName ?? assertion.title);
      if (!id) continue;
      const status = assertion.status === 'passed' ? 'passed' : assertion.status === 'skipped' || assertion.status === 'pending' ? 'skipped' : 'failed';
      results.push({ id, status, layer: 'component', title: assertion.fullName ?? assertion.title });
    }
  }
  return results;
}

const manifest = JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8')) as { features: ManifestFeature[] };
const requirements = existsSync(resolve(REPO_ROOT, 'docs/testing/requirements-index.json'))
  ? (JSON.parse(readFileSync(resolve(REPO_ROOT, 'docs/testing/requirements-index.json'), 'utf8')) as { requirements: Array<{ id: string; title: string }> }).requirements
  : [];
const quarantine = (JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/quarantine.json'), 'utf8')) as { quarantined: Array<{ scenarioId: string; expiresOn: string }> }).quarantined;

const results = [...readPlaywrightResults(), ...readVitestResults()];
const byId = new Map<string, ScenarioResult[]>();
for (const result of results) {
  byId.set(result.id, [...(byId.get(result.id) ?? []), result]);
}

const failures: string[] = [];
const rows: string[] = [];
const coveredRequirements = new Set<string>();

for (const feature of manifest.features) {
  for (const scenario of feature.scenarios.filter((entry) => entry.status === 'active')) {
    const scenarioResults = (byId.get(scenario.id) ?? []).filter((entry) => scenario.layer === 'manual' || entry.layer === scenario.layer);
    const quarantined = quarantine.some((entry) => entry.scenarioId === scenario.id);
    let status: string;
    if (scenario.automation === 'not-applicable') status = 'n/a';
    else if (scenario.automation === 'manual') status = 'manual';
    else if (quarantined) status = 'quarantined';
    else if (scenarioResults.length === 0) status = 'missing';
    else if (scenarioResults.some((entry) => entry.status === 'failed')) status = 'failed';
    else if (scenarioResults.some((entry) => entry.status === 'flaky')) status = 'flaky';
    else if (scenarioResults.every((entry) => entry.status === 'skipped')) status = 'skipped';
    else status = 'passed';

    if (status === 'passed') {
      for (const ref of feature.requirementRefs) coveredRequirements.add(ref);
    }
    rows.push(`| ${feature.id} | ${scenario.id} | ${scenario.layer} | ${scenario.priority} | ${status} |`);

    const gating = feature.status === 'approved' && scenario.priority === 'critical' && scenario.automation === 'automated' && !quarantined;
    if (gating && (status === 'missing' || status === 'failed')) {
      failures.push(`${feature.id} ${scenario.id}: critical approved scenario is ${status} at the ${scenario.layer} layer`);
    }
  }
}

const journeyStatus = new Map<string, { total: number; passing: number }>();
for (const feature of manifest.features) {
  for (const journey of (feature.criticalJourneys ?? []) as string[]) {
    const entry = journeyStatus.get(journey) ?? { total: 0, passing: 0 };
    for (const scenario of feature.scenarios.filter((item) => item.status === 'active' && item.priority === 'critical' && item.automation === 'automated')) {
      entry.total += 1;
      const scenarioResults = (byId.get(scenario.id) ?? []).filter((item) => item.layer === scenario.layer);
      if (scenarioResults.some((item) => item.status === 'passed')) entry.passing += 1;
    }
    journeyStatus.set(journey, entry);
  }
}
const uncoveredRequirements = requirements.filter((requirement) => !coveredRequirements.has(requirement.id));
const legacyFile = resolve(REPO_ROOT, 'docs/testing/legacy-tests.md');
const legacyPending = existsSync(legacyFile)
  ? (readFileSync(legacyFile, 'utf8').match(/\| pending \|/g) ?? []).length
  : 0;

const markdown = [
  '# UI Test Coverage',
  '',
  `Generated from the manifest and test reports. Requirements indexed: ${requirements.length}.`,
  '',
  '| Feature | Scenario | Layer | Priority | Status |',
  '|---|---|---|---|---|',
  ...rows,
  '',
  '## Critical journeys',
  '',
  ...([...journeyStatus.entries()].map(([journey, entry]) => `- ${journey}: ${entry.passing}/${entry.total} critical scenarios passing`)),
  '',
  '## Uncovered requirements',
  '',
  ...(uncoveredRequirements.length === 0 ? ['None.'] : uncoveredRequirements.map((requirement) => `- ${requirement.id} ${requirement.title}`)),
  '',
  `## Legacy tests pending migration: ${legacyPending}`,
  '',
  '## Quarantine',
  '',
  ...(quarantine.length === 0 ? ['None.'] : quarantine.map((entry) => `- ${entry.scenarioId} until ${entry.expiresOn}`)),
].join('\n');

mkdirSync(resolve(REPO_ROOT, 'docs/testing'), { recursive: true });
writeFileSync(resolve(REPO_ROOT, 'docs/testing/coverage.md'), `${markdown}\n`);
writeFileSync(
  resolve(REPO_ROOT, 'docs/testing/coverage.json'),
  `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), results, coveredRequirements: [...coveredRequirements], uncoveredRequirements: uncoveredRequirements.map((requirement) => requirement.id), journeys: [...journeyStatus.entries()].map(([id, entry]) => ({ id, passing: entry.passing, total: entry.total })), legacyPending, failures }, null, 2)}\n`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

if (failures.length > 0) {
  console.error(`build-coverage-report: ${failures.length} critical coverage failure(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`build-coverage-report: ${rows.length} scenario(s), ${coveredRequirements.size} requirement(s) covered`);
