import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { REPO_ROOT } from './lib/paths';

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

const featureRoots = new Map<string, Set<string>>();
for (const feature of (JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8')) as { features: ManifestFeature[] }).features) {
  const roots = new Set<string>();
  for (const route of feature.routes) {
    const modulePath = routeToModule.get(route);
    if (modulePath) roots.add(dirname(modulePath));
  }
  for (const component of feature.components) {
    const modulePath = componentToModule.get(component);
    if (modulePath) roots.add(dirname(modulePath));
  }
  featureRoots.set(feature.id, roots);
}

const features = (JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8')) as { features: ManifestFeature[] }).features;
const impacted = new Map<string, { feature: ManifestFeature; signal: string; files: string[] }>();

for (const file of changedFiles) {
  if (isTestFile(file)) continue;
  for (const feature of features) {
    const roots = featureRoots.get(feature.id) ?? new Set<string>();
    const inRoot = [...roots].some((root) => file.startsWith(`${root}/`));
    const namedComponent = feature.components.some((component) => file.endsWith(`${component}.tsx`) || file.endsWith(`${component}.ts`));
    if (inRoot || namedComponent) {
      const entry = impacted.get(feature.id) ?? { feature, signal: 'module-root', files: [] };
      entry.files.push(file);
      impacted.set(feature.id, entry);
    }
  }
}

const classifiable = changedFiles.filter((file) => !isTestFile(file));
const onlyStyles = classifiable.length > 0 && classifiable.every((file) => /\.(css|scss)$/.test(file));

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
