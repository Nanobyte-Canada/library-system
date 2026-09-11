import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

export interface Scenario {
  id: string;
  title: string;
  priority: string;
  type: string;
  layer: string;
  target: string;
  automation: string;
}

export interface FeaturePlan {
  file: string;
  data: Record<string, unknown>;
  scenarios: Scenario[];
  retired: string[];
}

export function listPlanFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.md') && entry !== '_template.md') out.push(full);
    }
  };
  walk(root);
  return out.sort();
}

const SCENARIO_HEADING = /^### ([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}) — (.+)$/;

export function parsePlan(file: string): FeaturePlan {
  const parsed = matter(readFileSync(file, 'utf8'));
  const scenarios: Scenario[] = [];
  const retired: string[] = [];
  let current: Scenario | null = null;
  let inRetiredTable = false;

  for (const line of parsed.content.split('\n')) {
    if (line.startsWith('## Retired scenarios')) {
      inRetiredTable = true;
      continue;
    }
    if (line.startsWith('## ') && !line.startsWith('## Retired')) {
      inRetiredTable = false;
    }
    const heading = SCENARIO_HEADING.exec(line);
    if (heading) {
      if (current) scenarios.push(current);
      current = { id: heading[1], title: heading[2], priority: '', type: '', layer: '', target: '', automation: '' };
      continue;
    }
    const field = /^(Priority|Type|Layer|Target|Automation):\s*(.+)$/.exec(line);
    if (current && field) {
      switch (field[1]) {
        case 'Priority': current.priority = field[2].trim(); break;
        case 'Type': current.type = field[2].trim(); break;
        case 'Layer': current.layer = field[2].trim(); break;
        case 'Target': current.target = field[2].trim(); break;
        case 'Automation': current.automation = field[2].trim(); break;
      }
      continue;
    }
    if (inRetiredTable && line.startsWith('|')) {
      const id = line.split('|')[1]?.trim() ?? '';
      if (/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}$/.test(id)) retired.push(id);
    }
  }
  if (current) scenarios.push(current);
  return { file, data: parsed.data as Record<string, unknown>, scenarios, retired };
}
