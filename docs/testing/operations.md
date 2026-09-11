# UI Testing Operations

## Ownership

| Role | Person/group | Responsibilities |
|---|---|---|
| Plan approver (product/QA) | @saurabhbilakhia | Approves `specs/ui/**`; changes to `status`, `priority`, `critical_journeys`, `requirement_refs` |
| Test owner | @saurabhbilakhia | Approves test changes tripping the lint; `test-weakening-approved`, `ui-test-impact: none`, `visual-baseline-update` labels; quarantine entries |
| Triage rota | @saurabhbilakhia | Responds to post-deploy regression and weekly reliability alerts within one business day |

Adding an approver: update `.github/CODEOWNERS`, this table, and the approver allowlist used by the label
workflows (`ui-tests-pr.yml`, Phase 3; `ui-visual-baseline-update.yml`, Phase 4) in the same PR.

## Alerting

- Deployed-UAT regression failure: Slack `SLACK_WEBHOOK_URL` immediately, naming failing scenario IDs and
  journey IDs with links to the run and the dashboard.
- Weekly reliability failure, expired quarantine, expired accessibility/console baseline entry, or an
  approved plan past its review window: Slack with links to the job and the dashboard.

## Dashboard

`test-reports` branch, generated `dashboard.md`: critical journey coverage and status for the latest
successful UAT regression, route and role coverage, reliability rate, flaky trend, quarantine list with
expiries, impact-gate bypass and false-positive rates, and plans past review window.

## Cadence

- Weekly: triage flaky tests and quarantine expiries; review gate bypasses and false positives.
- Per release: execute the manual accessibility checklist for critical journeys; confirm critical-journey
  coverage on the dashboard.
- Quarterly: review the critical-journey list, gate thresholds, and plans nearing the review window.

## UAT data hygiene and reset (adaptation D3/section 4.4)

Test data is run-namespaced (`pw-<runid>-*`, branch `PW <runid>`) and is never deleted by automation:
there is no test-support API, CI has no database access, `audit_log` is append-only, and parent deletes
cascade (`book_issue`, `book_reservation`, and `login` cascade; deleting a branch cascades its book
copies). The dashboard data-hygiene section reports run-namespaced users, books, categories, and branches
by run age. When run-namespaced users exceed 150 (about 50 runs), the owner performs the manual UAT reset
out of band:

1. Announce the reset; confirm no regression run is in progress.
2. Take a pre-reset dump if in doubt (`deploy/scripts/backup.sh`), then drop and recreate the `library`
   database on the centralized `uat-postgres` instance (or restore a clean dump) using the
   nanobyte-services infra runbooks.
3. Restart the UAT stack so Flyway migrations (`V1`–`V3`) re-seed the committed data.
4. Dispatch the deployed UI workflow (`UI Tests — Deployed (UAT)` from Phase 1; `UAT E2E` until then) and
   confirm green before promoting anything to prod.

The exact infra commands live with the nanobyte-services runbooks; this file records the trigger,
sequence, and verification.

## Measured thresholds (recorded after 30 days)

| Metric | Target | Measured | Decision |
|---|---|---|---|
| Impact-gate bypass rate | at most 1 bypass per 10 PRs | from dashboard | confirm or adjust |
| Impact-gate false-positive rate | at most 20% of gate failures | from dashboard | confirm or adjust |
| Smoke reliability | at least 99% clean runs over 30 days | from reliability.json | confirm or adjust |
| Quarantine limit | at most 5 entries | from specs/ui/quarantine.json | confirm or adjust |

Change these values only through an owner-reviewed PR with a recorded reason.
