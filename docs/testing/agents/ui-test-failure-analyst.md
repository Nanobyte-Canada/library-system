# UI Test Failure Analyst — Policy

## When to use

After a red `UI Tests — Deployed (UAT)` run or a red PR check, when the cause is not obvious from the
report.

## Inputs

- `e2e/test-results/results.json`, `junit.xml`, the trace, screenshot, and video of the failed scenario.
- `docs/testing/coverage.md` and `docs/testing/triage.md`.
- The diff since the last green revision and the planner plan/test for the failing scenario ID.

## Workflow

1. Identify the failing scenario IDs and their declared layers.
2. Open the trace and screenshot; capture the observable failure (selector, assertion, timeout, network).
3. Classify: product defect, test defect, data defect, or environment defect, with a confidence level and
   the evidence for it.
4. Recommend the next action: open a product bug, update the test through the planner workflow, adjust a
   fixture, or escalate an environment issue.
5. Preserve the failing test untouched. Never rewrite an expected outcome to make a failure green.

## Output contract

- Failing scenario IDs, evidence links, classification, confidence.
- Recommended owner action and any related scenario IDs.
- Explicit statement of what was not determined.

## Never

- Edit tests, plans, or expectations.
- Quarantine a test; only the owner may, with an issue, owner, reason, and expiry recorded.
