# Library UI Redesign — Design Spec

**Date:** 2026-09-05
**Status:** Approved (all 17 screens reviewed)
**Related:** ADR-0001 (architecture), ADR-0002 (database migration), ADR-0008 (frontend split)

## Context

The library system frontend (`/frontend`) is a React 19 + Vite + TypeScript SPA serving three roles: Member, Librarian, and Admin. The current UI is functional but lacks visual polish and consistent responsive behavior. This redesign modernizes all 17 screens with a warm, scholarly design direction ("The Reading Room") and adds mobile-first responsive layouts.

Goal: rewrite the entire frontend UI layer — design tokens, layout shell, components, and all 17 screen implementations — while preserving all existing functionality and routing.

## Repository Rules

- **UAT E2E Tests:** Any PR that changes user-visible behavior must add or update tests in the matching `e2e/tests/<area>.spec.ts` in the same PR. For this redesign, the affected suites are likely `auth`, `librarian`, `member`, `admin-books`, and `admin-settings`.
- **ADR Maintenance:** Any architectural change (compose, ports, networks, CI/CD, DB schema) requires a new ADR entry. This UI-only change does not require a new ADR.
- **Documentation Maintenance:** This spec/plan replaces prior UI redesign guidance. Update `README.md` only if the high-level overview changes.

## Design Direction: "The Reading Room"

A warm, scholarly library aesthetic. Think: well-lit reading rooms, dark wood, cream paper, green lampshades.

**Palette:**
- Forest green (`#2D5016`) for primary actions and active states
- Amber (`#C4841D`) for accents, logo, and the sidebar active indicator
- Warm cream (`#F8F5EF`) for backgrounds
- Burgundy (`#8B2252`) for danger/destructive actions
- White surfaces on cream backgrounds for depth

**Typography:**
- Headings: Newsreader (serif) — warm, scholarly feel
- Body: Inter (sans-serif) — clean, readable

**Mood:** Professional, calm, trustworthy. Not corporate-cold, not playful-casual.

---

## 1. Design Tokens

All tokens defined as CSS custom properties on `:root`.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2D5016` | Primary buttons, active states, focus rings |
| `--color-primary-hover` | `#3A6A1E` | Primary button hover |
| `--color-primary-light` | `#E8F0E2` | Primary button hover, info badges, primary-light backgrounds |
| `--color-accent` | `#C4841D` | Logo, sidebar active indicator, accent buttons |
| `--color-accent-hover` | `#A6701A` | Accent button hover |
| `--color-bg` | `#F8F5EF` | Page background (warm cream) |
| `--color-surface` | `#FFFFFF` | Card, table, and form backgrounds |
| `--color-text` | `#1A1A1A` | Primary text |
| `--color-text-secondary` | `#5C5C5C` | Secondary/muted text |
| `--color-text-muted` | `#8A8A8A` | Placeholders, captions, timestamps |
| `--color-text-inverse` | `#FFFFFF` | Text on dark backgrounds |
| `--color-border` | `#E2DDD4` | Default borders |
| `--color-border-light` | `#EDE9E1` | Light dividers, table row separators |
| `--color-success` | `#2D7A3A` | Success badges, return icons |
| `--color-success-light` | `#E8F5E9` | Success alert/loading backgrounds |
| `--color-danger` | `#8B2252` | Danger buttons, destructive actions |
| `--color-danger-light` | `#F5E6EE` | Danger badge/alert backgrounds |
| `--color-warning` | `#B8860B` | Warning badges, amber KPI icons |
| `--color-warning-light` | `#FDF6E3` | Warning badge/alert backgrounds |
| `--color-info` | `#2D5080` | Info KPI icons |
| `--color-info-light` | `#E8EEF6` | Info KPI icon backgrounds |

### Sidebar

| Token | Value |
|-------|-------|
| `--sidebar-bg` | `#1E3A0F` |
| `--sidebar-text` | `#C8D4BE` |
| `--sidebar-text-active` | `#FFFFFF` |
| `--sidebar-hover` | `rgba(255,255,255,0.08)` |
| `--sidebar-active` | `rgba(255,255,255,0.12)` |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(30,58,15,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(30,58,15,0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(30,58,15,0.12)` |

### Radii

| Token | Value |
|-------|-------|
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `16px` |
| `--radius-full` | `9999px` |

### Spacing Scale

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

---

## 2. Typography

| Class | Font | Weight | Size | Line Height | Usage |
|-------|------|--------|------|-------------|-------|
| `.display` | Newsreader | 600 | 2rem | 1.2 | Page titles |
| `.heading` | Newsreader | 500 | 1.25rem | 1.3 | Section headings |
| `.label` | Inter | 500 | 0.875rem | — | Form labels |
| `.caption` | Inter | 400 | 0.75rem | — | Timestamps, hints |
| Body | Inter | 400 | 1rem | 1.6 | Default text |

On mobile (≤639px): `.display` shrinks to 1.5rem, `.heading` to 1.1rem.

---

## 3. Responsive Breakpoints & Layout

### Three viewports

| Viewport | Width | Sidebar | Header | Tab Bar |
|----------|-------|---------|--------|---------|
| Desktop | ≥1024px | 240px full (icons + text) | Search bar + actions | Hidden |
| Tablet | 640–1023px | 60px icon-only | Search bar + actions | Hidden |
| Mobile | <640px | Hidden | Compact logo + actions | Bottom tab bar |

### App Shell Structure

```
┌──────────────────────────────────────────┐
│  Sidebar (240px)  │  Header (sticky)     │
│  - Logo           │  - Search + Actions  │
│  - Main nav       ├──────────────────────│
│  - Admin nav      │  Content (scrollable)│
│  - User footer    │  - Page title        │
│                   │  - Page body         │
└──────────────────────────────────────────┘
```

**Mobile layout (flex column):**
```
┌──────────────┐
│ Mobile Header│ (sticky)
├──────────────┤
│   Content    │ (flex: 1, min-height: 0, overflow-y: auto)
│   (scrolls)  │
├──────────────┤
│ Bottom Tabs  │ (position: absolute; bottom: 0)
└──────────────┘
```

The mobile layout uses `display: flex; flex-direction: column` on the device frame. The `.main-wrapper` gets `flex: 1; min-height: 0; display: flex; flex-direction: column` and the `.content` area gets `flex: 1; min-height: 0; overflow-y: auto` so content scrolls while the tab bar stays pinned at the bottom. The bottom tab bar uses `position: absolute; bottom: 0; left: 0; right: 0` inside a relatively positioned `.app-layout`.

### Bottom Tab Bar (mobile only)

5 tabs: Home, Catalog, My Books, Checkout, Profile. Uses `justify-content: space-evenly` with `flex: 1` on each tab for equal spacing. Hidden on desktop/tablet. The Checkout tab always links to `/scan`; the admin `/checkout-desk` is reached via the sidebar only.

### Sidebar

- **Desktop (≥1024px):** 240px wide, icon + text labels, `position: absolute`
- **Tablet (640–1023px):** 60px wide, icon-only, text labels hidden, `position: absolute`
- **Mobile (<640px):** Hidden entirely

Active state: amber left border (`3px solid var(--color-accent)`), lighter background, white text.

### Sidebar Navigation Structure

**Main section (all authenticated users):**
- Dashboard → `/dashboard`
- Catalog → `/catalog`
- My Books → `/checkouts`
- QR Scanner → `/scan`

**Admin section (role-conditional):**
- Books → `/admin/books` (ADMIN + LIBRARIAN)
- Categories → `/admin/categories` (ADMIN + LIBRARIAN)
- Users → `/admin/users` (ADMIN only)
- Branches → `/admin/branches` (ADMIN only)
- Audit Log → `/admin/audit-logs` (ADMIN only)
- Checkout Desk → `/checkout-desk` (ADMIN only)

### Bottom Tab Bar (mobile only)

5 tabs visible to all authenticated users:
1. **Home** → `/dashboard`
2. **Catalog** → `/catalog`
3. **My Books** → `/checkouts`
4. **Checkout** → `/scan`
5. **Profile** → `/profile`

Admin-only links (Checkout Desk, Users, Branches, Audit Log) appear only in the sidebar, not the bottom tab bar.

---

## 4. Components

### Buttons

| Variant | BG | Text | Hover | Usage |
|---------|-----|------|-------|-------|
| `.btn-primary` | `var(--color-primary)` | white | `var(--color-primary-hover)` | Primary actions |
| `.btn-accent` | `var(--color-accent)` | white | `var(--color-accent-hover)` | Secondary CTA (e.g., Process Return) |
| `.btn-outline` | `var(--color-surface)` | text | primary border | Secondary actions |
| `.btn-danger` | `var(--color-danger)` | white | — | Destructive actions |
| `.btn-ghost` | transparent | text-secondary | bg | Tertiary actions |

Sizes: `.btn-sm` (30px height), default (36px), `.btn-lg` (44px).

Use `:focus-visible` (not `:focus`) for focus rings to avoid persistent focus boxes after mouse clicks.

### Cards

White surface, `border-radius: var(--radius-md)`, light border (`--color-border-light`), `--shadow-sm`. Hover lifts to `--shadow-md`.

### KPI Cards

Dashboard stat cards. Grid: `repeat(auto-fit, minmax(220px, 1fr))`. Mobile: 2-column grid. Each card has a colored icon circle (green/amber/red/blue), a serif value (1.75rem), and a muted label.

### Tables

Standard HTML tables with sticky headers. Alternating row hover. On mobile: `font-size: 0.8rem`, reduced padding. Admin list screens (books, users, branches, audit log) switch to **card layout** on mobile/tablet.

### Forms

- `.form-group` with label + input + optional hint
- `.form-row`: 2-column grid, collapses to 1-column on mobile/tablet
- Inputs: 40px min-height, border focus ring (primary color + 3px glow)
- `.form-section` with section title (serif heading + bottom border)

Use `:focus-visible` for inputs and buttons to show focus rings only during keyboard navigation.

### Badges

Pill-shaped (`border-radius: var(--radius-full)`). Variants: success (green), danger (burgundy), warning (amber), info (primary green), neutral (gray).

### Tabs

Bottom-bordered tab bar. Active: primary color text + bottom border. Used on My Books, Reservations.

### Toggle Group

Inline toggle with bordered segments. Active segment gets primary background + white text. Used on Checkout & Return (Checkout/Return toggle).

### Empty State

Centered column with large muted icon + text. Used when lists have no data.

### Alerts

Colored background + border + icon. Variants: success, danger, warning.

### Loading State

A centered spinner or skeleton placeholder used while data is fetching. Prefer a subtle cream overlay or inline skeleton cards rather than blocking the entire page.

### Error State

A centered alert card with a danger icon, concise message, and a retry action. Used when data fetching fails.

---

## 5. Screen Specifications

### 5.1 Login (`/login`)

**Layout:** Standalone centered card, no sidebar or header. Dark green background gradient.

**Elements:**
- Book icon + "The Reading Room" title (serif)
- Subtitle: "Library Management System"
- Username field
- Password field (with show/hide toggle)
- "Sign In" button (full width, primary)
- "Forgot password?" link
- Demo credentials note (admin/jane/john)

**Mobile:** Same centered card, full-width with padding.

### 5.2 Dashboard (`/dashboard`)

**Layout:** Welcome banner + 4 KPI cards + 2 content sections.

**Desktop:**
- Welcome banner with user name, role badge, last login timestamp
- KPI grid: 4 columns (Total Books, Active Checkouts, Pending Reservations, Overdue Books)
- Two-column bottom: Recent Activity (table) + My Branch Stats (mini KPIs)

**Tablet:** KPI grid → 2 columns. Bottom section → stacked.

**Mobile:**
- KPI grid → 2 columns (smaller cards)
- Recent Activity → card list (not table)
- My Branch Stats → card list

### 5.3 Book Catalog (`/catalog`)

**Layout:** Search bar + category filter pills + book cover grid.

**Desktop:**
- Full-width search input
- Category filter pills (scrollable row): All, Fiction, Science, History, etc.
- Book grid: 4 columns
- Each book card: cover image, title, author, availability badge, branch count
- Load More button at bottom

**Tablet:** Book grid → 3 columns.

**Mobile:**
- Search bar full width
- Category pills horizontally scrollable
- Book grid → 2 columns (smaller cards)
- Book cards: cover, title (truncated), author, availability dot

### 5.4 Book Detail (`/catalog/:id`)

**Desktop:** Two-column layout.
- Left: Book cover (large), branch availability table
- Right: Title, author, ISBN, categories, description, "Reserve This Book" button

**Tablet:** Same two-column, narrower.

**Mobile:** Vertically sequential layout.
- Cover image (centered, max-width constrained)
- Title + author
- Metadata (ISBN, categories)
- Description
- Branch availability (compact list)
- Reserve button (full width)

### 5.5 My Books (`/checkouts`)

**Layout:** Tabs (Active Checkouts / History) + checkout cards.

**Desktop:** Two-column tab content. Each checkout card: book cover thumbnail, title, author, checkout date, due date, status badge (Overdue/Due Soon/Active), Return button.

**Tablet:** Same layout.

**Mobile:** Single column. Cards stack vertically. Return button full width on each card.

### 5.6 Reservations (`/reservations`)

**Layout:** Tab bar (All/Active/Expired) + reservation cards.

**Desktop:** Card grid, 2 columns. Each card: book info, queue position, status badge, expiry date, Cancel button.

**Mobile:** Single column cards.

### 5.7 QR Scanner / User Checkout & Return (`/scan`)

**Layout:** Checkout/Return toggle + barcode input + QR camera + recent activity.

**Desktop:**
- Toggle group: Checkout | Return
- Checkout mode: Book Barcode input + "Scan QR" button + "Issue Book" button
- Return mode: Book Barcode input + "Scan QR" button + "Process Return" button
- QR Camera section (dark viewfinder with corner markers)
- Success/error banner (appears after action)
- Recent Activity list (icon + text + timestamp)

**Mobile:**
- Toggle group
- Barcode input + scan button (stacked)
- Full-width action button
- QR camera (smaller, 250px height)
- Activity list

**No Member ID field** — checks out to the logged-in user's own account.

### 5.8 Checkout Desk / Admin Checkout & Return (`/checkout-desk`)

**Layout:** Same as user view but with an additional **Member ID or Name** field at the top.

**Desktop:**
- "Checkout & Return" title with green "Admin" badge
- Member ID or Name field (text input, placeholder: "Enter member ID or search by name")
- Book Barcode input + Scan QR
- Issue Book / Process Return button
- QR Camera
- Recent Activity

**Mobile:** Member field and barcode field stack vertically.

**Key difference from user view:** Admin can issue books to any member by searching for them first. Regular users check out under their own account automatically.

### 5.9 Profile (`/profile`)

**Desktop:** Two-column layout.
- Left: Profile info card (avatar, name, email, phone, role badge, member since)
- Right: Edit form (name, email, phone, password change)

**Tablet:** Same two-column.

**Mobile:** Single column — profile card on top, edit form below.

### 5.10 Admin — Book List (`/admin/books`)

**Desktop:** Full data table with columns: Cover, Title, Author, ISBN, Category, Available/Total, Actions (Edit/QR).

**Tablet:** Table with reduced columns (hide Category).

**Mobile:** Card layout. Each card shows: title, author, availability badge, action buttons.

### 5.11 Admin — Book Form (`/admin/books/new | /:id`)

**Desktop:** Two-column form. Left: title, author, ISBN, categories. Right: description, branch assignment, cover upload.

**Mobile:** Single column, all fields stacked.

### 5.12 Admin — Categories (`/admin/categories`)

**Desktop:** Card grid of categories. Each card: name, book count, edit/delete buttons.

**Mobile:** Single column cards.

### 5.13 Admin — User List (`/admin/users`)

**Desktop:** Data table: Name, Email, Phone, Role badge, Status badge, Branch, Actions.

**Mobile:** Card layout with role/status badges.

### 5.14 Admin — User Form (`/admin/users/new | /:id`)

**Desktop:** Two-column form. Left: name, email, phone. Right: role select, branch select, password.

**Mobile:** Single column.

### 5.15 Admin — Branch List (`/admin/branches`)

**Desktop:** Data table: Name, Address, Phone, Email, Actions.

**Mobile:** Card layout.

### 5.16 Admin — Branch Form (`/admin/branches/new | /:id`)

**Desktop:** Two-column form. Left: name, address. Right: phone, email.

**Mobile:** Single column, all fields stacked.

### 5.17 Admin — Audit Log (`/admin/audit-logs`)

**Desktop:** Data table: Timestamp, User, Action badge, Entity, Details, IP Address.

**Mobile:** Card layout with timestamp, user, action badge, and truncated details.

---

## 6. Navigation Rules

### Role-based access

| Route | Member | Librarian | Admin |
|-------|--------|-----------|-------|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/catalog` | ✅ | ✅ | ✅ |
| `/catalog/:id` | ✅ | ✅ | ✅ |
| `/checkouts` | ✅ | ✅ | ✅ |
| `/reservations` | ✅ | ✅ | ✅ |
| `/scan` | ✅ | ✅ | ✅ |
| `/checkout-desk` | — | — | ✅ |
| `/profile` | ✅ | ✅ | ✅ |
| `/admin/books` | — | ✅ | ✅ |
| `/admin/books/new` | — | ✅ | ✅ |
| `/admin/books/:id` | — | ✅ | ✅ |
| `/admin/categories` | — | ✅ | ✅ |
| `/admin/users` | — | — | ✅ |
| `/admin/users/new` | — | — | ✅ |
| `/admin/users/:id` | — | — | ✅ |
| `/admin/branches` | — | — | ✅ |
| `/admin/branches/new` | — | — | ✅ |
| `/admin/branches/:id` | — | — | ✅ |
| `/admin/audit-logs` | — | — | ✅ |

### Bottom Tab Bar (mobile)

5 tabs visible to all authenticated users:
1. **Home** → `/dashboard`
2. **Catalog** → `/catalog`
3. **My Books** → `/checkouts`
4. **Checkout** → `/scan`
5. **Profile** → `/profile`

Admin section links (Checkout Desk, Users, Branches, Audit Log) only appear in the sidebar (desktop/tablet), not in the bottom tab bar.

---

## 7. File Structure

```
frontend/src/
├── index.html                   # Google Fonts preconnect + stylesheet
├── index.css                    # Global reset + design tokens + component styles
├── components/
│   ├── Layout.tsx               # App shell (sidebar + header + content + bottom tabs)
│   ├── Layout.css
│   ├── ui/                      # Reusable primitives (Button, Card, Badge, etc.)
│   │   ├── button.tsx / button.css
│   │   ├── card.tsx / card.css
│   │   ├── badge.tsx / badge.css
│   │   └── ...
│   ├── dashboard/               # KpiCard, RecentActivity
│   ├── catalog/                 # BookCard, CategoryPill
│   ├── checkout/                # CheckoutForm, QRScanner, ActivityList
│   └── admin/                   # AdminTable, AdminCard (mobile), FormSection
├── pages/
│   ├── auth/LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── member/
│   │   ├── CatalogPage.tsx
│   │   ├── BookDetailPage.tsx
│   │   ├── MyBooksPage.tsx
│   │   ├── ReservationsPage.tsx
│   │   ├── QRScannerPage.tsx     # User checkout/return at /scan
│   │   └── ProfilePage.tsx
│   ├── admin/
│   │   ├── BookListPage.tsx
│   │   ├── BookFormPage.tsx
│   │   ├── CategoryListPage.tsx
│   │   ├── UserListPage.tsx
│   │   ├── UserFormPage.tsx
│   │   ├── BranchListPage.tsx
│   │   ├── BranchFormPage.tsx
│   │   └── AuditLogPage.tsx
│   └── librarian/
│       └── CheckoutDeskPage.tsx  # Admin checkout/return at /checkout-desk
└── App.tsx                       # Router
```

### Styling approach

- Plain CSS with CSS custom properties (matching PC repo at `/pc/frontend`)
- Co-located `.css` files per component/page
- `cn()` utility with `clsx` for conditional class merging
- No CSS modules, no Tailwind, no CSS-in-JS
- All design tokens in `:root` of `index.css`
- Responsive overrides via CSS media queries (not container queries)
- Admin list screens use card layout on mobile/tablet via media queries

---

## 8. Implementation Priority

1. **Design tokens + global CSS** — `index.css` with all tokens, reset, component styles
2. **Layout shell** — Sidebar, header, mobile header, bottom tab bar, responsive behavior
3. **Shared UI components** — Button, Card, Badge, KpiCard, Form components in `src/components/ui/`
4. **Login page** — Standalone, no layout dependencies
5. **Member screens** — Dashboard, Catalog, Book Detail, My Books, Reservations, QR Scanner (/scan), Profile
6. **Admin screens** — Book List, Book Form, Categories, User List, User Form, Branch List, Branch Form, Audit Log
7. **Checkout Desk** — `/checkout-desk` with Member ID/Name field for ADMIN only

---

## 9. Loading, Error, and Empty States

Every data-driven screen must handle three non-ideal states in addition to its success state.

### Loading state

- Use a centered `.spinner` or inline skeleton cards while fetching.
- Avoid full-page overlays; keep the page shell visible.
- Skeleton color: `var(--color-border-light)`.

### Error state

- Display a centered alert card with a danger icon and a short message.
- Include a **Retry** button when retry logic is available.
- Log unexpected errors to the console for debugging.

### Empty state

- Use the `.empty-state` component: large muted icon, title, optional subtitle, and CTA button where appropriate.
- Examples:
  - Catalog: "No books match your search" + "Clear filters"
  - My Books: "You have no active checkouts" + "Browse catalog"
  - Reservations: "No reservations yet"
  - Admin lists: "No records found" + "Add new" button

---

## 10. Non-Goals

- **No new features** — this is a UI-only redesign; all existing functionality is preserved
- **No backend changes** — API contracts remain identical
- **No new routing** — existing route structure is maintained
- **No state management changes** — Zustand stores remain as-is
- **No testing framework changes** — existing test setup is preserved
- **No animation/motion design** — transitions are limited to hover/focus state changes
- **No dark mode** — single "Reading Room" theme only
- **No i18n/localization** — English only

---

## 11. Verification

After implementation, verify:

1. All 17 screens render correctly at Desktop (1280px), Tablet (768px), and Mobile (375px)
2. Sidebar collapses correctly at each breakpoint
3. Bottom tab bar appears only on mobile
4. Admin screens show card layout on mobile/tablet
5. Forms collapse to single column on mobile
6. Login page renders centered card with no sidebar
7. All existing routes still work (no broken navigation)
8. Role-based access is preserved (member can't see admin links)
9. QR Scanner (`/scan`) has no member field; Checkout Desk (`/checkout-desk`) has member field
10. Build succeeds with no TypeScript errors
11. `npm run lint` passes with no errors

(End of file)

## UI requirement markers

- <a id="rq-authz-001"></a> RQ-AUTHZ-001: Role-based access rules are enforced in the UI (navigation, pages, controls) and by the API, including direct navigation to a forbidden route.
- <a id="rq-authz-002"></a> RQ-AUTHZ-002: `/checkout-desk` is ADMIN-only in the sidebar while its route guard is authentication-only; the current behavior is asserted as-is.
- <a id="rq-ui-001"></a> RQ-UI-001: User-visible outcomes of core flows (login, catalog, circulation, reservations, administration) match the redesigned UI described in this spec.
- <a id="rq-ui-002"></a> RQ-UI-002: Navigation exposes only the sections the current role can use.
