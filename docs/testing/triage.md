# UI Test Triage Guide

## Reading a red run

1. Open the run: `gh run list --workflow "UI Tests — Deployed (UAT)"` then `gh run view <id>`.
2. Download artifacts: `gh run download <id> -n ui-deployed-<id>`.
3. Read `e2e/test-results/results.json` for failing scenario IDs and error messages.
4. Open `e2e/report/index.html` locally for the HTML report; open the trace with
   `npx playwright show-trace <trace.zip>` (viewing only; never run the suite).
5. Check `docs/testing/coverage.md` for whether the failure is gating (approved critical scenario).

## First questions

- Is the failure a product regression, a test defect, a data collision, or an environment problem?
- Did the same scenario pass in the previous run? Check the `test-reports` dashboard history.
- Is the failure flaky (retry pass)? The JSON report marks it.

## Escalation

- Product defect: open an issue with the scenario ID, trace, screenshot, and revision.
- Test defect: invoke the `ui-test-planner` skill to update the plan, then use the failure analyst's
  recommendation; never weaken an assertion without the `test-weakening-approved` label.
- Data collision or environment: inspect run-namespaced data and the UAT stack; record it in the run
  report.
- Quarantine only with an issue, owner, reason, and expiry in `specs/ui/quarantine.json`.
