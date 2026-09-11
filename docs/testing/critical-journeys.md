# Critical User Journeys

Specified by the design spec (section 6.5); owner approval is recorded here during the Phase 0 sign-off
(step 5 of Task 0.7). This list fixes the denominator for critical requirement coverage. Adding journeys
is unrestricted; removing or demoting one requires owner sign-off recorded below.

| ID | Journey | Features and roles | Why critical |
|---|---|---|---|
| CJ-01 | Authentication lifecycle: login, guard, logout, session expiry | authentication feature; anonymous, MEMBER, LIBRARIAN, ADMIN | Gates account access for every role |
| CJ-02 | Catalog discovery: search -> book detail -> branch availability and reserve entry | catalog; MEMBER, LIBRARIAN, ADMIN | Primary member value path; drives all circulation |
| CJ-03 | Self-service circulation: scanned checkout/return -> my books -> renew | circulation, self-checkout; MEMBER | Members self-serve the core circulation loop |
| CJ-04 | Staff circulation desk: member lookup, barcode checkout/return, renew | circulation desk; LIBRARIAN, ADMIN | Library operations depend on correct loan state |
| CJ-05 | Reservations: reserve -> ready -> fulfill or cancel -> expiry | reservations; MEMBER + LIBRARIAN/ADMIN | Holds gate fair access to limited copies |
| CJ-06 | Catalog administration: book + copies + categories; user, branch, and role administration; audit trail | admin; ADMIN, LIBRARIAN (books/categories only) | Wrong admin changes corrupt the catalog and access control |
| CJ-07 | Authorization boundaries: role x route matrix, positive and negative access including direct navigation | authorization across all features; all roles | Wrong-role access exposes admin functions |

Fines, reports/dashboard APIs, and settings backends are not critical journeys (feature-absent or
mock-only).

## Change history

| Date | Change | Approved by |
|---|---|---|
| 2026-09-11 | Initial list (proposed; owner approval pending in Phase 0) | @saurabhbilakhia |
