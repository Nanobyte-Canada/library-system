import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Node, Project, SyntaxKind, type JsxAttribute } from 'ts-morph';
import { REPO_ROOT } from './lib/paths';

const appFile = resolve(REPO_ROOT, 'frontend/src/App.tsx');
const project = new Project({
  compilerOptions: { jsx: 1 /* JsxEmit.Preserve */, allowJs: true },
});
const source = project.addSourceFileAtPath(appFile);

/**
 * Walk up from a JsxAttribute to determine whether the enclosing Route is
 * nested inside a <ProtectedRoute> layout route.
 *
 * React Router v6 layout pattern:
 *   <Route element={<ProtectedRoute roles={…}><Layout /></ProtectedRoute>}>
 *     <Route path="/admin/books" … />
 *   </Route>
 *
 * The path attribute lives on the inner <Route>. Walking ancestors we find the
 * outer <Route> whose element prop text includes "ProtectedRoute".
 */
function isGuarded(attribute: JsxAttribute): boolean {
  let node: Node | undefined = attribute.getParent();
  while (node) {
    if (
      Node.isJsxElement(node) &&
      node.getOpeningElement().getText().includes('ProtectedRoute')
    ) {
      return true;
    }
    node = node.getParent();
  }
  return false;
}

const seen = new Map<string, boolean>();

for (const attribute of source.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
  if (attribute.getNameNode().getText() !== 'path') continue;
  const initializer = attribute.getInitializer();
  const path = initializer?.getText().replace(/^['"]|['"]$/g, '');
  if (!path) continue;
  seen.set(path, (seen.get(path) ?? false) || isGuarded(attribute));
}

const routes = [...seen.entries()]
  .map(([path, guarded]) => ({ path, guarded }))
  .sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(
  resolve(REPO_ROOT, 'specs/ui/routes.json'),
  `${JSON.stringify({ generatedFrom: 'frontend/src/App.tsx', routes }, null, 2)}\n`,
);
console.log(`discover-routes: ${routes.length} route(s)`);
