export function scenarioTag(id: string, ...suites: string[]): string[] {
  return [`@${id}`, ...suites.map((suite) => `@${suite}`)];
}
