# Library System — Infrastructure Replication & Autonomous Library Capabilities

**Date:** 2026-08-23
**Status:** Approved design (pending implementation plan)
**Approach:** Mirror-pc infra + stabilize-first backend, parallel Phase 0/1 lanes, sequential feature phases

---

## 1. Goals

1. Replicate the `pc` repo's home-server infrastructure for library-system: Postgres DB with Flyway migrations, GitHub Actions CI/CD deploying to the home server, HashiCorp Vault secrets, two deployed environments (dev + prod), containerized React frontend.
2. Evolve library-system into a full autonomous library: mobile-first UI for search, QR-scan checkout/return, email notifications and reminders, self-registration, admin management — plus bulk import, overdue tracking, reading stats, and analytics.

## 2. Current State (verified by codebase scan)

**Backend** (`api/`, Kotlin 1.9.25, Spring Boot 3.3.5, JDK 17, port 8082): 10 entities (books, user, login, book_copies w/ unique barcodes, book_issue, book_reservation, branch, category, email_log [unused], audit_log [writer never invoked]). Flyway `V1__create_tables.sql` exists (MySQL dialect). APIs: JWT login, book CRUD/search/OpenLibrary-autofill/QR-gen, copy mgmt + transfer, checkout/return/renew/scan (3-book cap + 21-day loan enforced server-side), FIFO reservations w/ 3-day holds, branches/categories CRUD.

**Frontend** (`frontend/`): React 19 + Vite + TS + TanStack Query + Zustand + AG Grid + html5-qrcode, ~20 routes, client-side-only role gating.

**Critical defects:** stale legacy controllers (`BooksController`, `UserController`, `BooksDbService`, `UserDbService`) reference dead symbols → module likely does not compile; `SecurityConfiguration.authenticationManager(null)` startup bug; zero server-side role enforcement; scan endpoints require spoofable `X-User-Id` header that frontend never sends; generated QRs encode book-level JSON so scans cannot resolve copies; no email path; no scheduled jobs; no self-registration; no admin issued-books view; no book DELETE; one empty test; no Docker anywhere; docs describe obsolete architecture.

**Existing printed assets:** ~2000+ book-level QR stickers already in circulation encoding JSON `{id, bookName, author, isbn}`. **These must never require re-printing.**

## 3. Decisions Log

| # | Decision | Choice |
|---|---|---|
| D1 | "dev" environment | Second deployed stack on home server (like pc's uat), not local-only |
| D2 | Branch model | Keep multi-branch entities/scoping |
| D3 | Database | Postgres 16 (match pc); rewrite migrations in PG dialect; no legacy data migration needed |
| D4 | Email | SMTP relay (app password in Vault) |
| D5 | Registration | Instant activation (no admin approval) |
| D6 | QR labeling | Book-level QR (existing stickers); checkout auto-assigns an available copy |
| D7 | Extra features in scope | Bulk book import, overdue tracking, user reading stats, admin analytics |
| D8 | Location model | Generic self-referencing location tree per branch (arbitrary depth/terminology), NOT fixed rack/aisle columns |
| D9 | Duplicate titles | Block checking out a second copy of a title already on loan to the member |
| D10 | Approach | Stabilize-first; infra ∥ stabilization lanes in parallel, then sequential feature phases |

## 4. §1 Infrastructure Design

Repo layout additions:

```
library-system/
├── .github/workflows/
│   ├── build.yml        # PRs: test api + frontend · push→main: Buildx → ghcr.io/nanobyte-canada/library-{api,frontend}:main-<sha> + latest
│   └── deploy.yml       # workflow_dispatch(environment: dev|prod, tag) → Vault AppRole login → render tiered .env → scp over Cloudflare-Tunnel SSH → docker compose pull && up -d → health gate → Slack notify
├── api/Dockerfile       # 2-stage: gradle dependency-warm build → temurin JRE, non-root appuser, curl healthcheck
├── frontend/Dockerfile  # 3-stage: development (hot-reload) / build (VITE_* args at CI time) / production (nginx SPA)
├── frontend/nginx.conf  # gzip, security headers, SPA try_files, proxy /api → api:8082
├── docker-compose.yml   # local dev: builds from source, no local JDK needed
└── deploy/
    ├── dev/docker-compose.yml    # prebuilt ${IMAGE_TAG} images, 1xxxx port range
    ├── prod/docker-compose.yml   # prebuilt ${IMAGE_TAG} images, 2xxxx port range
    ├── scripts/vault-init-library.sh   # policy library-deploy (read-only secret/data/library/*) + AppRole on EXISTING vault server
    ├── scripts/backup.sh               # nightly pg_dump, daily/weekly retention
    └── cloudflared/config.yml          # routes: library.nanobyte.ca (prod), dev-library.nanobyte.ca (dev)
```

- **Vault:** reuses running vault instance. KV-v2 tiers: `secret/library/common` (POSTGRES_*, JWT_SIGNING_KEY, SMTP_HOST/PORT/USER/PASS, MAIL_FROM) then `secret/library/<env>` overrides (per-env DB creds, public URLs). GitHub holds only `VAULT_ROLE_ID`, `VAULT_SECRET_ID`, pinned `SSH_KNOWN_HOSTS`. AppRole `library-deploy`, token_ttl 10m/max 30m. Nothing reads Vault at runtime; secrets land as compose env vars.
- **Database:** `postgres:16-alpine` per env stack (separate containers/networks/volumes). Flyway authoritative; nightly pg_dump with retention.
- **Environments:** local (root compose, source builds) / dev stack (`dev-library.nanobyte.ca`) / prod stack (`library.nanobyte.ca`). Manual-dispatch deploys with explicit tag; rollback = re-dispatch previous tag. Health gate on `/actuator/health`; unhealthy = failed deploy. Monitoring reuses existing Prometheus/Grafana/Loki/Uptime-Kuma stack with added scrape targets.

## 5. §2 Backend Capability Design

### 5.1 Stabilization sprint (prerequisite)
- Delete stale legacy controllers/services (unblocks compilation).
- Fix `authenticationManager(null)` bug.
- **Identity from JWT principal**, replacing every `X-User-Id` header (fixes broken scan endpoints, closes spoofing hole).
- Server-side role enforcement via `@PreAuthorize`: ADMIN on users/branches/audit/import/analytics/delete-book; LIBRARIAN on circulation desk operations; MEMBER endpoints principal-scoped.
- Add `POST /api/auth/register` (public); remove phantom `/auth/refresh` call from frontend (re-login on expiry).
- Wire audit-log writer into checkout/return/admin mutations.
- Unit tests for loan rules (cap, due date, renewal, duplicates).

### 5.2 Schema evolution (Flyway V2+, Postgres dialect)
| Change | Detail |
|---|---|
| `location` table | `(id, branch_id FK, parent_id FK nullable, name, display_order)` — generic tree, arbitrary depth/terminology (D8) |
| `book_copies.location_id` | Copies attach to leaf location nodes only |
| Location data migration | Parse existing free-text `books.location` strings ("Rack 2 - Aisle 5" → nodes Rack 2 › Aisle 5); unparseable strings become single-level nodes; seed default branch with Rack › Aisle levels |
| `book_issue.reminder_sent_at` | Idempotent T-3d reminder tracking |
| `book_issue.overdue_notified_at` | Idempotent overdue notice tracking |
| Self-registration | Creates active MEMBER `user` + `login` (email = username, bcrypt password chosen at signup) |

### 5.3 APIs (new/changed)
- `POST /api/auth/register` — public self-registration (D5).
- Enhanced `/api/books/search` — availability count + breadcrumb paths of available copies per branch.
- `POST /api/checkout/scan` — body: scanned payload → tolerant parser: expected book-level JSON `{id,...}` first, fallback raw ISBN/barcode lookup → resolve book → auto-assign available copy → enforce 3-book cap AND duplicate-title block (D9) → create issue → confirmation email with due date.
- `POST /api/return/scan` — same tolerant parse → list caller's active issues for that book (picker only needed for edge cases; duplicates blocked at checkout so ≤1 expected) → confirm return → copy freed → response carries placement breadcrumbs.
- `GET /api/admin/issues` — all active loans with member info; `GET /api/issues/overdue` — overdue report.
- `DELETE /api/books/{id}` — ADMIN only; blocked while any copy is on loan.
- `POST /api/books/import` — CSV bulk import, OpenLibrary ISBN autofill, creates books + N copies (auto-barcodes) + optional location assignment; preview/dry-run mode.
- `GET /api/me/stats` — books read this year, history timeline data.
- `GET /api/admin/analytics` — most-borrowed, circulation trends, dead stock, category distribution.

### 5.4 Email & scheduling
`spring-boot-starter-mail` + `EmailService` (SMTP creds from Vault env vars); every send logged to `email_log`. Two `@Scheduled` jobs: due reminders sent once when exactly 3 days remain until due date (daily sweep, guarded by `reminder_sent_at`) and daily overdue sweep + notices (guarded by `overdue_notified_at`). Configurable loan period `library.loan.days=21`.

### 5.5 Error handling
Existing `ResponseModel` envelope kept; proper 401 vs 403 semantics; transactional checkout/return with row-level copy locking (double-scan safe); friendly messages for cap-reached / duplicate-title / no-copies / not-your-loan cases.

### 5.6 QR compatibility guarantee
Existing ~2000 stickers keep working unchanged: payload format is preserved as primary parse target; tolerant fallback handles mixed generations; new prints use identical format. No re-printing ever required (D6).

## 6. §3 Frontend & Mobile-First UX

Same stack as pc (React + Vite + TS + Zustand + TanStack Query); gains pc's Dockerfile/nginx treatment.

- **Mobile shell:** bottom tab bar — Search · Scan · My Books; sidebar on desktop; thumb-reachable CTAs.
- **Search:** single bar + filter chips (author/language/title); result cards show cover, availability dot, "N of M available", location breadcrumbs per branch; book detail page.
- **Scan:** full-screen camera; scan → bottom-sheet book card → Check out → confirmation with due date; plain-language cap/duplicate messages.
- **My Books:** active loans with countdown chips (due-in-N-days / overdue red), Renew where allowed; Return flow → scan or pick → placement screen with large breadcrumbs ("Place on Rack 2 › Aisle B").
- **Register/Login:** name + email + password + optional membership id; instant activation into Search.
- **Stats:** yearly counter + borrowing timeline.
- **Admin:** book CRUD + CSV import w/ preview; issued-books overview (overdue highlighted); analytics dashboard; locations tree editor per branch; users/branches management.
- Role gating stays client-side for UX, backed by real server enforcement. Visual polish/motion designed during implementation by UI specialist; this section fixes structure and flows.

## 7. §4 Testing, Verification & Rollout

| Layer | Tooling | Focus |
|---|---|---|
| Backend unit | JUnit5 + MockK | Loan rules: 3-cap, duplicate-title block, 21-day computation, renewals, reservation interplay |
| Backend integration | Testcontainers Postgres | Checkout/return/scan/search/registration against real PG |
| Frontend | Vitest (light) | Scan-flow state machine, search filters |
| CI gates | GitHub Actions | PRs: full suite + lint/build green before main image builds |

Deploy verification: health gate post-deploy; smoke check (login + search + catalog GET) after each deploy; rollback = re-dispatch previous tag.

Rollout order:
- **Phase 0 ∥ Phase 1 (parallel):** Stabilization (api/src) alongside Infra replication (deploy/, workflows, Dockerfiles, Vault init, backups, tunnel routes → dev + prod stacks live).
- **Phase 2 — Core capabilities:** location-tree migration, registration, enhanced search, QR checkout/return flows, EmailService + confirmations.
- **Phase 3 — Scheduled notifications:** T-3d reminders, overdue sweep.
- **Phase 4 — Admin power tools:** issued-books view, delete, bulk import, analytics, stats.

Each phase ends verified (tests green, deploy healthy) before next starts.

Implementation planning proceeds **per phase**: each phase gets its own implementation plan (writing-plans) and execution cycle, starting with Phase 0 ∥ Phase 1.

## 8. Out of Scope (deferred)

PWA support, inventory audit mode, reservation pickup emails, membership-type-specific loan rules, fines, email verification at registration, refresh tokens.

## 9. Assumptions & Risks

- No production data exists yet; Postgres switch is a clean rewrite of migrations (V1 rewritten in PG dialect).
- Subdomains `library.nanobyte.ca` / `dev-library.nanobyte.ca` on existing Cloudflare tunnel; adjust if user prefers different names.
- SMTP relay requires an existing mailbox/app-password supplied into Vault by user.
- Legacy free-text location strings follow mostly-parseable patterns; unparseable ones degrade gracefully to single-level nodes.
- Compile status unverified locally; stabilization phase starts by making `./gradlew build` green inside Docker.
- Slack deploy notifications reuse the existing webhook already configured for pc's pipelines.
