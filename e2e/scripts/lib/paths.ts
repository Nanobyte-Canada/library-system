import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// scripts/lib -> scripts -> e2e -> repository root (three levels up)
export const REPO_ROOT = resolve(here, '..', '..', '..');
