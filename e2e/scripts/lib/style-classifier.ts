import { resolve } from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import ts from 'typescript';
import { REPO_ROOT } from './paths';

const project = new Project({ compilerOptions: { jsx: ts.JsxEmit.Preserve, allowJs: true } });

function styleLineRanges(file: string): Array<[number, number]> {
  const absolute = resolve(REPO_ROOT, file);
  const source = project.getSourceFile(absolute) ?? project.addSourceFileAtPath(absolute);
  const ranges: Array<[number, number]> = [];
  for (const attribute of source.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    const name = attribute.getNameNode().getText();
    if (name !== 'className' && name !== 'style') continue;
    ranges.push([attribute.getStartLineNumber(), attribute.getEndLineNumber()]);
  }
  return ranges;
}

export function isStyleOnlyChange(file: string, changedLines: number[]): boolean {
  if (/\.(css|scss)$/.test(file)) return true;
  if (!/\.(tsx|jsx)$/.test(file)) return false;
  const ranges = styleLineRanges(file);
  return changedLines.every((line) => ranges.some(([start, end]) => line >= start && line <= end));
}
