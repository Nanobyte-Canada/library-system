export function runId(): string {
  const id = process.env.GITHUB_RUN_ID ?? process.env.E2E_RUN_ID ?? `debug-${Date.now().toString(36)}`;
  const attempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
  return `${id}-${attempt}`;
}

export function identity(suffix: string, domain = 'library.test'): string {
  return `pw-${runId()}-${suffix}@${domain}`;
}

export function branchName(): string {
  return `PW ${runId()}`;
}
