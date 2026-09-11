import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { Node, Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement } from 'ts-morph';
import ts from 'typescript';
import { REPO_ROOT } from './lib/paths';

interface ManifestFeature {
  id: string;
  routes: string[];
  components: string[];
}

const project = new Project({
  compilerOptions: { jsx: ts.JsxEmit.Preserve, allowJs: true },
  tsConfigFilePath: resolve(REPO_ROOT, 'frontend/tsconfig.app.json'),
});

const appFile = resolve(REPO_ROOT, 'frontend/src/App.tsx');
const appSource = project.getSourceFile(appFile) ?? project.addSourceFileAtPath(appFile);

const componentModule = new Map<string, string>();
for (const declaration of appSource.getImportDeclarations()) {
  const specifier = declaration.getModuleSpecifierValue();
  if (!specifier.startsWith('.')) continue;
  const modulePath = resolve(dirname(appFile), specifier);
  for (const named of declaration.getNamedImports()) componentModule.set(named.getName(), modulePath);
}

const routeModule = new Map<string, string>();
for (const attribute of appSource.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
  if (attribute.getNameNode().getText() !== 'path') continue;
  const parent = attribute.getParent();
  if (!parent) continue;
  const elementAttribute = (Node.isJsxOpeningElement(parent) || Node.isJsxSelfClosingElement(parent))
    ? parent.getAttributes().find((entry) => Node.isJsxAttribute(entry) && entry.getNameNode().getText() === 'element')
    : undefined;
  const elementMatch = elementAttribute && Node.isJsxAttribute(elementAttribute) ? /<([A-Za-z0-9_]+)/.exec(elementAttribute.getText()) : null;
  const path = attribute.getInitializer()?.getText().replace(/^['"]|['"]$/g, '');
  if (path && elementMatch) {
    const modulePath = componentModule.get(elementMatch[1]);
    if (modulePath) routeModule.set(path, modulePath);
  }
}

function resolveImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? resolve(REPO_ROOT, 'frontend/src', specifier.slice(2))
    : resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
    const source = project.getSourceFile(candidate);
    if (source) return candidate;
  }
  return null;
}

function transitiveFiles(entry: string): string[] {
  const visited = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    const source = project.getSourceFile(current);
    if (!source) continue;
    for (const declaration of source.getImportDeclarations()) {
      const resolved = resolveImport(current, declaration.getModuleSpecifierValue());
      if (resolved) queue.push(resolved);
    }
  }
  return [...visited].map((file) => relative(REPO_ROOT, file));
}

const manifest = JSON.parse(readFileSync(resolve(REPO_ROOT, 'specs/ui/manifest.json'), 'utf8')) as { features: ManifestFeature[] };
const features = manifest.features.map((feature) => {
  const entries = new Set<string>();
  for (const route of feature.routes) {
    const modulePath = routeModule.get(route);
    if (modulePath) entries.add(modulePath);
  }
  for (const component of feature.components) {
    const modulePath = componentModule.get(component);
    if (modulePath) entries.add(modulePath);
  }
  const files = new Set<string>();
  for (const entry of entries) {
    for (const file of transitiveFiles(entry)) files.add(file);
  }
  return { id: feature.id, files: [...files].sort() };
});

writeFileSync(
  resolve(REPO_ROOT, 'docs/testing/impact-graph.json'),
  `${JSON.stringify({ generatedFrom: 'frontend/src', features }, null, 2)}\n`,
);
console.log(`build-impact-graph: ${features.length} feature(s)`);
