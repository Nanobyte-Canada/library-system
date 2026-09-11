# Library Management System — Sprint Plan Design

**Date:** 2026-07-26
**Status:** Approved
**Approach:** Vertical Slices (7 sprints)

---

## 1. System Overview

A full-stack library management system for physical libraries with multiple branches. Admins and librarians manage books, users, and operations. Members browse the catalog, self-checkout via QR scanning, and reserve books.

### 1.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin, Spring Boot 3.x, Java 17, Spring Security + JWT |
| Database | MySQL 8.x with Flyway migrations |
| Frontend | React 18, Vite, TypeScript, Zustand, TanStack Query, AG Grid, AG Charts |
| Styling | Custom CSS with CSS custom properties (matching PC repo patterns) |
| Testing | JUnit 5 (backend), Vitest + Testing Library (frontend), Playwright (E2E) |
| Deployment | Docker Compose (backend + frontend + MySQL) |

### 1.2 User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full system access: manage books, users, branches, view reports, manage reservations |
| **Librarian** | Branch-scoped: manage books/copies at their branch, process checkouts/returns, view branch reports |
| **Member** | Self-service: browse catalog, checkout/return via QR, reserve books, view profile/history |

### 1.3 Business Rules

- **Borrowing limit:** 3 books per member
- **Loan period:** 21 days
- **Reservation hold:** 3 days after notification
- **Reservation queue:** FIFO (first come, first served)
- **No fine system:** Overdue tracked but no monetary penalties

---

## 2. Database Schema

### 2.1 Tables

```
branch
├── id (UUID, PK)
├── name (VARCHAR 100)
├── address (TEXT)
├── phone (VARCHAR 20)
├── email (VARCHAR 100)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

books
├── id (UUID, PK)
├── isbn (VARCHAR 13)
├── book_name (VARCHAR 200)
├── author (VARCHAR 200)
├── publication (VARCHAR 200)
├── language (VARCHAR 50)
├── category_id (UUID, FK → category)
├── description (TEXT)
├── cover_image_url (VARCHAR 500)
├── location (VARCHAR 100)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

book_copies
├── id (UUID, PK)
├── book_id (UUID, FK → books)
├── branch_id (UUID, FK → branch)
├── barcode (VARCHAR 50, UNIQUE)
├── status (ENUM: AVAILABLE, LOANED, LOST, DAMAGED)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

category
├── id (UUID, PK)
├── name (VARCHAR 100)
├── parent_id (UUID, FK → category, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

user
├── id (UUID, PK)
├── membership_id (VARCHAR 20, UNIQUE)
├── first_name (VARCHAR 100)
├── last_name (VARCHAR 100)
├── email (VARCHAR 100)
├── phone_number (VARCHAR 20)
├── role (ENUM: ADMIN, LIBRARIAN, MEMBER)
├── membership_type (ENUM: STUDENT, FACULTY, PUBLIC)
├── branch_id (UUID, FK → branch)
├── is_active (BOOLEAN, default true)
├── created_by (UUID, FK → user)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

login
├── id (UUID, PK)
├── user_id (UUID, FK → user, UNIQUE)
├── username (VARCHAR 50, UNIQUE)
├── password (VARCHAR 255)
├── is_locked (BOOLEAN, default false)
├── failed_attempts (INT, default 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

book_issue
├── id (UUID, PK)
├── user_id (UUID, FK → user)
├── copy_id (UUID, FK → book_copies)
├── issue_date (TIMESTAMP)
├── due_date (TIMESTAMP)
├── return_date (TIMESTAMP, nullable)
├── renewed (BOOLEAN, default false)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

book_reservation
├── id (UUID, PK)
├── user_id (UUID, FK → user)
├── book_id (UUID, FK → books)
├── branch_id (UUID, FK → branch)
├── status (ENUM: PENDING, READY, EXPIRED, CANCELLED, FULFILLED)
├── queue_position (INT)
├── reserved_at (TIMESTAMP)
├── notified_at (TIMESTAMP, nullable)
├── expires_at (TIMESTAMP, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

email_log
├── id (UUID, PK)
├── user_id (UUID, FK → user)
├── email_type (ENUM: DUE_REMINDER, OVERDUE_NOTICE, RESERVATION_AVAILABLE, RESERVATION_EXPIRING, WELCOME)
├── subject (VARCHAR 200)
├── sent_at (TIMESTAMP)
├── status (ENUM: SENT, FAILED)
└── error_message (TEXT, nullable)

audit_log
├── id (UUID, PK)
├── user_id (UUID, FK → user)
├── action (VARCHAR 50)
├── entity_type (VARCHAR 50)
├── entity_id (UUID)
├── details (JSON)
├── created_at (TIMESTAMP)
```

---

## 3. API Endpoints

### 3.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | JWT login |
| POST | `/api/auth/refresh` | Authenticated | Refresh access token |
| POST | `/api/auth/logout` | Authenticated | Invalidate token |

### 3.2 Books

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/books` | ADMIN, LIBRARIAN | Add new book |
| PUT | `/api/books/{id}` | ADMIN, LIBRARIAN | Update book details |
| DELETE | `/api/books/{id}` | ADMIN | Soft delete book |
| GET | `/api/books/{id}` | All | Get book details |
| GET | `/api/books` | All | List books (paginated, sorted) |
| GET | `/api/books/search` | All | Search with filters |
| GET | `/api/books/isbn/{isbn}` | ADMIN, LIBRARIAN | Auto-fetch from Open Library |
| POST | `/api/books/{id}/copies` | ADMIN, LIBRARIAN | Add physical copies |
| GET | `/api/books/{id}/copies` | All | List copies with status |
| POST | `/api/books/{id}/transfer` | ADMIN | Transfer copy between branches |
| GET | `/api/books/{id}/qr` | All | Generate QR code |

### 3.3 Users

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/users` | ADMIN, LIBRARIAN | Create user |
| PUT | `/api/users/{id}` | ADMIN | Update user |
| GET | `/api/users/{id}` | ADMIN, LIBRARIAN | Get user details |
| GET | `/api/users` | ADMIN | List users (paginated) |
| DELETE | `/api/users/{id}` | ADMIN | Deactivate user |
| PUT | `/api/users/{id}/role` | ADMIN | Change user role |
| PUT | `/api/users/{id}/branch` | ADMIN | Assign to branch |
| GET | `/api/users/me` | All | Get own profile |
| PUT | `/api/users/me` | All | Update own profile |
| PUT | `/api/users/me/password` | All | Change password |
| GET | `/api/users/{id}/qr` | All | Generate user QR |

### 3.4 Checkout / Return

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/checkout` | LIBRARIAN, MEMBER | Issue book (validates limits) |
| GET | `/api/checkout/my` | All | My active checkouts |
| GET | `/api/checkout/history` | All | Checkout history (paginated) |
| POST | `/api/return` | LIBRARIAN, MEMBER | Return book |
| POST | `/api/return/batch` | LIBRARIAN | Return multiple books |
| POST | `/api/checkout/{id}/renew` | All | Renew (extend 21 days) |
| POST | `/api/checkout/scan` | MEMBER | Checkout via QR scan |
| POST | `/api/return/scan` | MEMBER | Return via QR scan |

### 3.5 Reservations

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/reservations` | MEMBER | Place hold on book |
| GET | `/api/reservations/my` | All | My reservations |
| DELETE | `/api/reservations/{id}` | All | Cancel reservation |
| GET | `/api/reservations/book/{bookId}` | ADMIN, LIBRARIAN | View queue for book |

### 3.6 Branches

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/branches` | ADMIN | Create branch |
| PUT | `/api/branches/{id}` | ADMIN | Update branch |
| GET | `/api/branches` | All | List branches |
| GET | `/api/branches/{id}` | All | Branch details |
| GET | `/api/branches/{id}/inventory` | ADMIN, LIBRARIAN | Branch inventory |

### 3.7 Reports

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/dashboard/stats` | ADMIN, LIBRARIAN | Dashboard statistics |
| GET | `/api/dashboard/recent-activity` | ADMIN, LIBRARIAN | Recent activity |
| GET | `/api/reports/circulation` | ADMIN | Circulation over time |
| GET | `/api/reports/popular-books` | ADMIN | Most borrowed books |
| GET | `/api/reports/popular-categories` | ADMIN | Category popularity |
| GET | `/api/reports/user-activity` | ADMIN | Active users |
| GET | `/api/reports/inventory` | ADMIN | Inventory by category |
| GET | `/api/reports/availability` | ADMIN | Availability breakdown |
| GET | `/api/reports/low-stock` | ADMIN | Low stock alerts |

### 3.8 Categories

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/categories` | ADMIN | Create category |
| GET | `/api/categories` | All | List categories |

---

## 4. Sprint Plan

### Sprint 1: Foundation

**Goal:** Working backend on modern stack + working frontend with login

**Backend:**
- Upgrade Spring Boot 2.4.3 → 3.x, Java 11 → 17
- Migrate `WebSecurityConfigurerAdapter` → `SecurityFilterChain` bean
- Redesign DB schema with Flyway migrations and proper FK constraints
- Create all tables: branch, books, book_copies, category, user, login, book_issue, book_reservation, email_log, audit_log
- Implement JWT auth with role-based access control
- Seed data: admin user, 3 branches, sample books, sample users

**Frontend:**
- Scaffold React 18 + Vite + TypeScript project
- Set up React Router 6, Zustand stores, TanStack Query
- Login page with JWT token handling
- Layout shell: sidebar nav + header with role-based menu
- Axios interceptor for auth header injection

**Exit criteria:** Backend starts on Java 17. Frontend login works. DB has proper constraints.

---

### Sprint 2: Book Management (Full Stack)

**Goal:** Admin/Librarians can manage books. Members can browse and search.

**Backend:**
- Book CRUD with validation
- Book copy management with barcodes
- ISBN auto-fetch from Open Library API
- Full-text catalog search with filters
- Category management

**Frontend:**
- Admin: Book list (AG Grid), Add/Edit form with ISBN lookup, Category management
- Member: Catalog browse with search + filters, Book detail with availability

**Exit criteria:** ISBN auto-fill works. Catalog search with filters works. Copies tracked per branch.

---

### Sprint 3: User Management (Full Stack)

**Goal:** Admin can manage users and roles. Members can manage profiles.

**Backend:**
- User CRUD with role and branch assignment
- Profile management endpoints
- Password change with validation

**Frontend:**
- Admin: User list (AG Grid), Add/Edit with role assignment, User detail with history
- Member: My Profile, Change password, Borrowing history

**Exit criteria:** Role-based access enforced. Users assigned to branches.

---

### Sprint 4: Checkout/Return + QR Self-Checkout (Full Stack)

**Goal:** QR-based self-checkout and return. Desk operations for librarians.

**Backend:**
- Checkout with validation (limits, availability, reservations)
- Return with copy status update and reservation check
- QR code generation and scan endpoints
- Renewal with reservation check
- Due date = issue date + 21 days

**Frontend:**
- Member: My Books (active checkouts with due date badges), QR Scanner page, Renew button
- Librarian: Checkout/Return desk, Active checkouts overview
- Components: QR display, QR scanner (html5-qrcode)

**Exit criteria:** QR scan checkout works. 3-book limit enforced. Due dates tracked.

---

### Sprint 5: Reservations + Email Notifications (Full Stack)

**Goal:** FIFO reservation queue. Automated email notifications.

**Backend:**
- Reservation CRUD with FIFO queue logic
- Auto-notify on book return, auto-expire after 3 days
- Email service (Spring Mail): due reminders, overdue notices, reservation alerts, welcome
- Scheduled tasks: daily overdue check, daily reminders, hourly reservation expiry

**Frontend:**
- Member: Reserve button, My Reservations with queue position, Cancel reservation
- Admin: Reservation queue viewer, Email preview/test

**Exit criteria:** Reserve → return → notify next in queue works. Overdue emails sent daily.

---

### Sprint 6: Multi-Branch + Reports (Full Stack)

**Goal:** Multi-branch operations. Admin dashboards with analytics.

**Backend:**
- Branch CRUD and management
- Inter-branch book transfer
- Dashboard stats endpoints (aggregated + per-branch)
- Circulation and inventory report endpoints

**Frontend:**
- Admin: Branch management, Transfer books, Dashboard with AG Charts (line, bar, pie), Reports pages
- Member: Branch selector, Availability shown per branch

**Exit criteria:** Dashboard charts render with real data. Reports filterable by branch/date.

---

### Sprint 7: Polish + Deploy

**Goal:** Production-ready system with testing and deployment.

**Backend:**
- Global exception handler with proper HTTP status codes
- Swagger/OpenAPI documentation
- Flyway migrations with seed data scripts
- Security hardening (rate limiting, CORS, env-based JWT secret)
- Spring Actuator health checks
- Structured logging with audit trail

**Frontend:**
- Responsive design (mobile, tablet, desktop)
- Dark mode (CSS custom properties)
- Loading skeletons, error boundaries, toast notifications
- Empty states, accessibility (ARIA, keyboard nav)
- Playwright E2E tests for all major flows
- Docker Compose for full stack

**E2E flows tested:**
1. Admin creates branch → adds books → adds copies
2. Admin creates librarian and member users
3. Member logs in → searches → views book → scans QR → checks out
4. Member reserves checked-out book
5. Book returned → email sent to next in queue
6. Admin views dashboard with correct stats
7. Admin transfers book between branches
8. Admin views reports

**Exit criteria:** `docker compose up` starts full stack. E2E tests pass. Swagger accessible. Mobile layout works.

---

## 5. Architecture Decisions

### 5.1 Book Copies vs Book Count

Current system tracks `numberOfCopies` as an integer. New design tracks individual `book_copies` with unique barcodes and status. This enables:
- QR-based checkout (each copy has a barcode)
- Per-copy status tracking (available, loaned, lost, damaged)
- Inter-branch transfer of specific copies
- Accurate availability reporting

### 5.2 Branch-Scoped Data

All borrowing operations (checkout, reservation) are branch-scoped. A member borrows from a specific branch. Reservations are per-branch. This supports multi-branch operations while keeping the model simple.

### 5.3 Email via Spring Mail

Using Spring's mail abstraction with SMTP configuration. Emails sent synchronously during the request for immediate feedback. Failed emails logged in `email_log` table for retry/debugging. No message queue for MVP — acceptable at library scale.

### 5.4 QR Code Generation

QR codes encode JSON with book/user metadata. Generated via external API (api.qrserver.com) for simplicity. Can be replaced with local QR library (ZXing) later if needed.

### 5.5 Frontend State Management

- **Zustand:** Auth store (token, user, role), theme store, branch selector
- **TanStack Query:** All server state (books, users, checkouts, reservations, reports)
- **React Router:** Route definitions with lazy-loaded pages

---

## 6. Out of Scope

- Fine/fee management (no monetary penalties)
- Digital resource/e-book management
- SIP2 protocol integration
- Z39.50 catalog queries
- Mobile app (responsive web only)
- Multi-language UI (English only)
- Barcode label printing
- SIP2/LAN integration with physical scanners

## UI requirement markers

These IDs are consumed by the UI testing platform (`specs/ui/`, `docs/testing/requirements-index.json`).
Do not renumber. Add new markers at the end of the area lists. The session/token delivery markers
(RQ-AUTH-005/006) live with the infrastructure decisions in
`docs/superpowers/specs/2026-08-23-library-system-infrastructure-and-capabilities-design.md`.

- <a id="rq-auth-001"></a> RQ-AUTH-001: Login with valid credentials issues a JWT and lands the user on `/dashboard`.
- <a id="rq-auth-002"></a> RQ-AUTH-002: Login with invalid credentials shows a generic error and stays on `/login`.
- <a id="rq-auth-003"></a> RQ-AUTH-003: Protected routes redirect unauthenticated visitors to `/login` and wrong-role visitors to `/dashboard`.
- <a id="rq-auth-004"></a> RQ-AUTH-004: Logout clears the client session (`token`/`user`) and returns to `/login`.
- <a id="rq-auth-007"></a> RQ-AUTH-007: The login form enforces required Username and Password fields before submission.
- <a id="rq-cat-001"></a> RQ-CAT-001: A visitor or member can search the public catalog and see matching books.
- <a id="rq-cat-002"></a> RQ-CAT-002: Book availability (copies and loan state) is exposed consistently on the book detail page and the copies API.
- <a id="rq-cat-003"></a> RQ-CAT-003: Book detail shows metadata, copies, and the reserve entry point for an authenticated member.
- <a id="rq-circ-001"></a> RQ-CIRC-001: A member can hold at most 3 active loans; a 4th checkout is rejected.
- <a id="rq-circ-002"></a> RQ-CIRC-002: A loan is due 21 days after checkout.
- <a id="rq-circ-003"></a> RQ-CIRC-003: A loan can be renewed once, and renewal is blocked while a PENDING reservation exists.
- <a id="rq-circ-004"></a> RQ-CIRC-004: Staff can return a loan by copy (`POST /api/return` takes the copy id).
- <a id="rq-circ-005"></a> RQ-CIRC-005: An authenticated member can self-checkout by scanning a barcode, bound to the authenticated principal; self-return (`/api/return/scan`) accepts any barcode without a principal check — recorded as a product gap and asserted as-is.
- <a id="rq-circ-006"></a> RQ-CIRC-006: A member can view current loans (`/api/checkout/my`) and checkout history.
- <a id="rq-rsv-001"></a> RQ-RSV-001: A member can reserve an unavailable book; duplicate reservations are rejected.
- <a id="rq-rsv-002"></a> RQ-RSV-002: Reservations carry a FIFO queue position, but `markReady` enforces only PENDING status — a front-of-queue gate and automatic allocation are not implemented, and staff can mark any pending reservation ready.
- <a id="rq-rsv-003"></a> RQ-RSV-003: A pending reservation expires after 7 days and a ready hold after 3 days, per the documented (unswept) policy.
- <a id="rq-rsv-004"></a> RQ-RSV-004: A member can cancel their own reservation (cancel is owner-only); staff can mark a reservation ready and fulfill it.
- <a id="rq-book-001"></a> RQ-BOOK-001: ADMIN/LIBRARIAN can create and update books.
- <a id="rq-book-002"></a> RQ-BOOK-002: ADMIN/LIBRARIAN can add copies to a book.
- <a id="rq-book-003"></a> RQ-BOOK-003: ADMIN/LIBRARIAN can transfer copies between branches.
- <a id="rq-book-004"></a> RQ-BOOK-004: A book QR code is available through `/api/books/{id}/qr`.
- <a id="rq-user-001"></a> RQ-USER-001: An ADMIN can create users with a role and optional branch, and the created account can log in.
- <a id="rq-user-002"></a> RQ-USER-002: An ADMIN can list, search, and update users, including role and status changes.
- <a id="rq-user-003"></a> RQ-USER-003: An authenticated user can view and update their own profile and change their own password.
- <a id="rq-br-001"></a> RQ-BR-001: An ADMIN can create, update, and delete branches; branch deletion cascades copies (tests never delete branches).
- <a id="rq-br-002"></a> RQ-BR-002: Branch listing and detail are available to authenticated users.
- <a id="rq-aud-001"></a> RQ-AUD-001: An ADMIN can query the append-only audit trail by entity type and limit.
