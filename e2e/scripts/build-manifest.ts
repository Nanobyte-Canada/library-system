import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';
import { listPlanFiles, parsePlan } from './lib/frontmatter';

const plans = listPlanFiles(resolve(REPO_ROOT, 'specs/ui')).map(parsePlan);

const features = plans.map((plan) => ({
  id: String(plan.data.feature_id),
  plan: plan.file.replace(`${REPO_ROOT}/`, ''),
  status: plan.data.status,
  priority: plan.data.priority,
  owner: plan.data.owner,
  criticalJourneys: plan.data.critical_journeys ?? [],
  requirementRefs: plan.data.requirement_refs ?? [],
  routes: plan.data.routes ?? [],
  roles: plan.data.roles ?? [],
  flags: plan.data.flags ?? [],
  components: plan.data.components ?? [],
  sourceOverrides: plan.data.source_overrides ?? [],
  tags: plan.data.tags ?? [],
  lastReviewed: plan.data.last_reviewed ?? '',
  scenarios: [
    ...plan.scenarios.map((scenario) => ({
      id: scenario.id,
      priority: scenario.priority,
      type: scenario.type,
      layer: scenario.layer,
      target: scenario.target,
      automation: scenario.automation,
      status: 'active',
    })),
    ...plan.retired.map((id) => ({ id, status: 'retired' })),
  ],
}));

const manifest = {
  schemaVersion: 2,
  generatedFrom: 'specs/ui/**/*.md',
  features,
};

writeFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`build-manifest: ${features.length} feature(s), ${features.reduce((n, f) => n + f.scenarios.length, 0)} scenario(s)`);
