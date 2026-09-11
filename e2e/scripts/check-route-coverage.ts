import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/paths';

interface RouteEntry {
  path: string;
  guarded: boolean;
}

interface ManifestFeature {
  id: string;
  status: string;
  routes: string[];
  scenarios: Array<{
    id: string;
    automation: string;
    status: string;
    layer: string;
  }>;
}

interface Exclusion {
  route: string;
  reason: string;
  owner: string;
}

const routes = (
  JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'specs/ui/routes.json'), 'utf8'),
  ) as { routes: RouteEntry[] }
).routes;

const manifest = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8'),
) as { features: ManifestFeature[] };

const exclusions = (
  JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'specs/ui/route-exclusions.json'), 'utf8'),
  ) as { exclusions: Exclusion[] }
).exclusions;

// A route is "covered" when its manifest feature has at least one active,
// automated, browser-layer scenario.
const covered = new Set<string>();
for (const feature of manifest.features) {
  const hasAutomatedScenario = feature.scenarios.some(
    (scenario) =>
      scenario.status === 'active' &&
      scenario.automation === 'automated' &&
      scenario.layer === 'browser',
  );
  if (hasAutomatedScenario) {
    for (const route of feature.routes) covered.add(route);
  }
}

const excluded = new Map(exclusions.map((exclusion) => [exclusion.route, exclusion]));
const failures: string[] = [];
const known = new Set(routes.map((route) => route.path));

for (const route of routes) {
  if (!covered.has(route.path) && !excluded.has(route.path)) {
    failures.push(
      `route ${route.path} has no automated browser coverage and no exclusion`,
    );
  }
}

for (const exclusion of exclusions) {
  if (!known.has(exclusion.route)) {
    failures.push(`stale route exclusion: ${exclusion.route} no longer exists`);
  }
  if (!exclusion.reason || !exclusion.owner) {
    failures.push(
      `route exclusion ${exclusion.route} must have a reason and owner`,
    );
  }
}

if (failures.length > 0) {
  console.error(`check-route-coverage: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `check-route-coverage: OK (${routes.length} route(s), ${exclusions.length} exclusion(s))`,
);
