import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import { REPO_ROOT } from './lib/paths';
import { listPlanFiles, parsePlan } from './lib/frontmatter';

const failures: string[] = [];

const VALID_STATUS = new Set(['draft', 'approved', 'retired']);
const VALID_PRIORITY = new Set(['critical', 'high', 'normal']);
const VALID_TYPE = new Set(['happy-path', 'negative', 'boundary', 'navigation', 'accessibility', 'visual', 'authorization']);
const VALID_LAYER = new Set(['component', 'browser', 'manual']);
const VALID_TARGET = new Set(['deployed']);
const VALID_AUTOMATION = new Set(['automated', 'manual', 'not-applicable']);
const REQUIRED_FIELDS = [
  'feature_id', 'feature', 'owner', 'status', 'priority', 'critical_journeys', 'requirement_refs',
  'routes', 'roles', 'flags', 'components', 'source_overrides', 'tags', 'last_reviewed', 'review', 'next_id',
];

const indexFile = resolve(REPO_ROOT, 'docs/testing/requirements-index.json');
const knownRequirements = new Set<string>(
  existsSync(indexFile)
    ? (JSON.parse(readFileSync(indexFile, 'utf8')).requirements as Array<{ id: string }>).map((entry) => entry.id)
    : [],
);

const plans = listPlanFiles(resolve(REPO_ROOT, 'specs/ui')).map(parsePlan);
const scenarioOwners = new Map<string, string>();

for (const plan of plans) {
  const rel = plan.file.replace(`${REPO_ROOT}/`, '');
  const data = plan.data;

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined) failures.push(`${rel}: missing front matter field "${field}"`);
  }
  const featureId = String(data.feature_id ?? '');
  if (data.owner !== 'saurabhbilakhia') failures.push(`${rel}: owner must be saurabhbilakhia (CODEOWNERS)`);
  if (!VALID_STATUS.has(String(data.status))) failures.push(`${rel}: invalid status "${data.status}"`);
  if (!VALID_PRIORITY.has(String(data.priority))) failures.push(`${rel}: invalid priority "${data.priority}"`);

  const nextId = Number(String(data.next_id ?? '0'));
  const refs = (data.requirement_refs as string[] | undefined) ?? [];
  for (const ref of refs) {
    if (!/^RQ-[A-Z]+-\d{3}$/.test(ref)) failures.push(`${rel}: malformed requirement ref "${ref}"`);
    else if (knownRequirements.size > 0 && !knownRequirements.has(ref)) failures.push(`${rel}: unknown requirement ref "${ref}"`);
  }

  const overrides = (data.source_overrides as string[] | undefined) ?? [];
  for (const pattern of overrides) {
    if (globSync(pattern, { cwd: REPO_ROOT }).length === 0) {
      failures.push(`${rel}: source_override "${pattern}" matches no files`);
    }
  }

  for (const scenario of plan.scenarios) {
    if (scenarioOwners.has(scenario.id)) {
      failures.push(`${rel}: duplicate scenario id ${scenario.id} (also in ${scenarioOwners.get(scenario.id)})`);
    }
    scenarioOwners.set(scenario.id, rel);
    if (!scenario.id.startsWith(`${featureId}-`)) {
      failures.push(`${rel}: scenario ${scenario.id} does not match feature_id ${featureId}`);
    }
    if (Number(scenario.id.split('-').pop()) >= nextId) {
      failures.push(`${rel}: scenario ${scenario.id} must be below next_id ${nextId}`);
    }
    if (!VALID_PRIORITY.has(scenario.priority)) failures.push(`${rel}: ${scenario.id} invalid Priority "${scenario.priority}"`);
    if (!VALID_TYPE.has(scenario.type)) failures.push(`${rel}: ${scenario.id} invalid Type "${scenario.type}"`);
    if (!VALID_LAYER.has(scenario.layer)) failures.push(`${rel}: ${scenario.id} invalid Layer "${scenario.layer}"`);
    if (!VALID_TARGET.has(scenario.target)) failures.push(`${rel}: ${scenario.id} invalid Target "${scenario.target}"`);
    if (!VALID_AUTOMATION.has(scenario.automation)) failures.push(`${rel}: ${scenario.id} invalid Automation "${scenario.automation}"`);
  }

  for (const id of plan.retired) {
    if (scenarioOwners.has(id) && scenarioOwners.get(id) !== rel) {
      failures.push(`${rel}: retired id ${id} is active in ${scenarioOwners.get(id)}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`validate-specs: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`validate-specs: OK (${plans.length} plan(s), ${scenarioOwners.size} scenario(s))`);
