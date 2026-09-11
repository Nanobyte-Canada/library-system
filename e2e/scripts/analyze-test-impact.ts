import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { REPO_ROOT } from './lib/paths';
import { isStyleOnlyChange } from './lib/style-classifier';

// JsxEmit is not directly exported from ts-morph; use the numeric literal (Preserve = 1)
const JSX_PRESERVE = 1;

interface ManifestFeature {
  id: string;
  plan: string;
  status: string;
  priority: string;
  routes: string[];
  components: string[];
  sourceOverrides: string[];
  scenarios: Array<{ id: string; automation: string; status: string; layer: string }>;
}

const base = process.env.BASE_SHA ?? process.argv[2] ?? 'origin/master';
const git = (args: string) => execSync(`git ${args}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const mergeBase = git(`merge-base ${base} HEAD`);
const changedFiles = git(`diff --name-only ${mergeBase} HEAD`).split('\n').filter(Boolean);

function isTestFile(file: string): boolean {
  return (
    file.startsWith('e2e/') ||
    /\.test\.(ts|tsx)$/.test(file) ||
    file.startsWith('specs/ui/') ||
    file === 'frontend/vitest.config.ts' ||
    file === 'e2e/playwright.config.ts'
  );
}

const planChanged = changedFiles.some((file) => file.startsWith('specs/ui/') && file.endsWith('.md'));
const testChanged = changedFiles.some((file) => (file.startsWith('e2e/') || /\.test\.(ts|tsx)$/.test(file)) && !file.startsWith('e2e/scripts/'));

if (!planChanged && !testChanged) {
  const testishOnly = changedFiles.filter(isTestFile);
  if (testishOnly.length === changedFiles.length) {
    console.log('analyze-test-impact: test-only change');
  }
}

const appFile = resolve(REPO_ROOT, 'frontend/src/App.tsx');
const project = new Project({ compilerOptions: { jsx: JSX_PRESERVE, allowJs: true } });
const source = project.addSourceFileAtPath(appFile);

const componentToModule = new Map<string, string>();
for (const importDeclaration of source.getImportDeclarations()) {
  const specifier = importDeclaration.getModuleSpecifierValue();
  if (!specifier.startsWith('.')) continue;
  const importPath = resolve(dirname(appFile), specifier).replace(`${REPO_ROOT}/`, '');
  for (const named of importDeclaration.getNamedImports()) {
    componentToModule.set(named.getName(), importPath);
  }
}

const routeToModule = new Map<string, string>();
for (const attribute of source.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
  if (attribute.getNameNode().getText() !== 'path') continue;
  const parent = attribute.getParent();
  if (!parent) continue;
  // parent is JsxAttributes; grandparent is JsxSelfClosingElement/JsxOpeningElement
  const element = parent.getParent() as import('ts-morph').JsxSelfClosingElement | import('ts-morph').JsxOpeningElement | undefined;
  if (!element) continue;
  const elementAttribute = element.getAttributes().find((entry) => {
    if (!Node.isJsxAttribute(entry)) return false;
    return entry.getNameNode().getText() === 'element';
  });
  const elementMatch = elementAttribute && Node.isJsxAttribute(elementAttribute) ? /<([A-Za-z0-9_]+)/.exec(elementAttribute.getText()) : null;
  const path = attribute.getInitializer()?.getText().replace(/^['"]|['"]$/g, '');
  if (path && elementMatch) {
    const modulePath = componentToModule.get(elementMatch[1]);
    if (modulePath) routeToModule.set(path, modulePath);
  }
}

const graphFile = resolve(REPO_ROOT, 'specs/ui/impact-graph.json');
const graph = existsSync(graphFile)
  ? (JSON.parse(readFileSync(graphFile, 'utf8')) as { features: Array<{ id: string; files: string[] }> })
  : null;

const features = (JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8')) as { features: ManifestFeature[] }).features;
const impacted = new Map<string, { feature: ManifestFeature; signal: string; files: string[] }>();

for (const file of changedFiles) {
  if (isTestFile(file)) continue;
  let matchedByGlob = false;
  for (const feature of features) {
    const overrides = feature.sourceOverrides ?? [];
    const overrideMatch = overrides.some((pattern) => new RegExp(`^${pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`).test(file));
    if (!overrideMatch) continue;
    matchedByGlob = true;
    const entry = impacted.get(feature.id) ?? { feature, signal: 'source-override', files: [] };
    entry.files.push(file);
    impacted.set(feature.id, entry);
  }
  if (matchedByGlob || !graph) continue;
  for (const graphFeature of graph.features) {
    if (!graphFeature.files.includes(file)) continue;
    const feature = features.find((entry) => entry.id === graphFeature.id);
    if (!feature) continue;
    const entry = impacted.get(feature.id) ?? { feature, signal: 'import-graph', files: [] };
    entry.files.push(file);
    impacted.set(feature.id, entry);
  }
}

const changedLineNumbers = new Map<string, number[]>();
for (const line of git(`diff -U0 --unified=0 ${mergeBase} HEAD`).split('\n')) {
  const match = /^\+\+\+ b\/(.+)$/.exec(line);
  if (match) {
    changedLineNumbers.set(match[1], []);
    continue;
  }
  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
  if (hunk) {
    const start = Number(hunk[1]);
    const count = Number(hunk[2] ?? 1);
    const file = [...changedLineNumbers.keys()].pop();
    if (file) {
      for (let offset = 0; offset < Math.max(count, 1); offset += 1) {
        changedLineNumbers.get(file)?.push(start + offset);
      }
    }
  }
}

const classifiable = changedFiles.filter((file) => !isTestFile(file) && !file.startsWith('.github/') && file !== 'docs/adr.md');
const onlyStyles =
  classifiable.length > 0 &&
  classifiable.every((file) => isStyleOnlyChange(file, changedLineNumbers.get(file) ?? []));

const lines: string[] = ['# UI test impact report', '', `Merge base: \`${mergeBase}\``, ''];
const failures: string[] = [];

for (const [id, entry] of impacted) {
  const critical = entry.feature.priority === 'critical';
  lines.push(`## ${id} (${entry.feature.priority})`, '', `Changed files: ${entry.files.map((file) => `\`${file}\``).join(', ')}`, '');
  if (!planChanged && !testChanged) {
    const message = `${id}: ${critical ? 'critical' : 'normal'} feature impacted with no plan or test change`;
    if (critical) failures.push(message);
    lines.push(`- ${message}`);
  } else {
    lines.push('- plan/test changes present');
  }
}
if (impacted.size === 0) lines.push('No manifest feature was impacted by this change.');
if (onlyStyles) lines.push('', 'Classification: style-only (visual-impact disposition required).');

writeFileSync(resolve(REPO_ROOT, 'specs/ui/impact-report.json'), `${JSON.stringify({ mergeBase, changedFiles, impacted: [...impacted.keys()], onlyStyles, failures }, null, 2)}\n`);
writeFileSync(resolve(REPO_ROOT, 'specs/ui/impact-report.md'), `${lines.join('\n')}\n`);

if (failures.length > 0 && process.env.IMPACT_BYPASS !== 'true') {
  console.error(`analyze-test-impact: ${failures.length} gate failure(s)`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`analyze-test-impact: ${impacted.size} impacted feature(s)${process.env.IMPACT_BYPASS === 'true' ? ' (bypassed)' : ''}`);
