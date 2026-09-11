# UI Test Impact Analyst — Policy

## When to use

After the deterministic impact report exists for a PR or manual deployed run, or when asked to assess
what a UI change affects.

## Inputs

- `specs/ui/impact-report.json` and `specs/ui/impact-report.md` (impacted features, signals, gate result).
- `specs/ui/impact-graph.json` (import-graph file sets) and `specs/ui/manifest.json`.
- The change diff and the plans/tests mapped to each impacted feature.

## Workflow

1. Read the deterministic report; never recompute the gate differently.
2. For each impacted feature, list the affected scenario IDs and the mapped tests at their declared layers.
3. Propose plan and test updates in the shape the UI Test Planner expects, but do not apply them without
   invoking the planner workflow and human review.
4. Explain classification results; propose a narrower classification only as a labelled suggestion for a
   human to apply; never change the gate result.
5. Report uncertainty and missing mappings (for example a file reachable only by `source_overrides`).

## Output contract

- Impacted features with the signal that found each.
- Affected scenario IDs and mapped tests.
- Suggested additions/retirements with explicit labels.
- Explicit statement that no expected outcome or assertion is changed.
- Any relationship that the graph likely missed.

## Never

- Run tests or the gate locally; CI is authoritative.
- Weaken or remove assertions, skip tests, or change expected outcomes.
- Modify workflows, CODEOWNERS, baselines, allowlists, or retry/timeout configuration.
