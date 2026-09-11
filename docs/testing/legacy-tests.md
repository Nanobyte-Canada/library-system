# Legacy UI Test Disposition

Decision D6: the 32-test `e2e/` suite is rewritten into the new structure feature by feature.
Old specs are deleted only when the replacement is green in CI. Until then the coverage report lists
these tests as unmapped; they do not count toward requirement coverage.

| File | Tests | Disposition | Replacement phase | Status |
|---|---|---|---|---|
| e2e/tests/auth.spec.ts | 6 | Migrate to tests/regression/auth-login.spec.ts + auth-session.spec.ts; health/root cases become route smoke | Phase 2 | migrated (Phase 2) |
| e2e/tests/admin-books.spec.ts | 6 | Migrate to specs/ui/admin/books.md + specs/ui/admin/catalog-metadata.md browser regression | Phase 3 | migrated (Phase 3) |
| e2e/tests/admin-settings.spec.ts | 7 | Migrate to specs/ui/admin/catalog-metadata.md + specs/ui/admin/users.md (Phase 3), then specs/ui/admin/branches.md + specs/ui/admin/audit.md (Phase 6) | Phase 3/6 | migrated (Phase 6) |
| e2e/tests/librarian.spec.ts | 4 | Migrate to specs/ui/circulation/desk.md + specs/ui/authorization/role-route-matrix.md | Phase 3 | migrated (Phase 3) |
| e2e/tests/roles.spec.ts | 2 | Migrate to tests/regression/authz-role-matrix.spec.ts (specs/ui/authorization/role-route-matrix.md) | Phase 3 | migrated (Phase 3) |
| e2e/tests/member.spec.ts | 7 | Migrate to specs/ui/circulation/{self-checkout,my-books}.md + specs/ui/reservations/lifecycle.md | Phase 6 | migrated (Phase 6) |
| e2e/tests/helpers/shared.ts | n/a | Superseded by fixtures/data.fixture.ts; delete at parity | Phase 6 | migrated (Phase 6) |

Rules: a Migrate row is complete when the replacement spec is green in the deployed UAT workflow
(verified pre-merge by dispatching the workflow on the PR branch with
`gh workflow run ui-tests-deployed.yml --ref <branch>`) and the old test is deleted in the same PR.
A Retire row requires the reason above and leaves no replacement.
