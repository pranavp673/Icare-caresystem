# ICare - Design Document

**Project:** ICare Children's Care Home Management System
**Version:** 1.0 (Demo / MVP)
**Last updated:** 2026-08-08

---

## 1. Architecture Overview

### 1.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build tool | Vite 7 |
| Styling | SCSS modules (BEM naming) |
| Animations | Framer Motion |
| Routing | React Router v7 |
| State | React hooks (useState, useMemo, useCallback) |
| Auth | Custom context (`useAuth()`) with mock users |
| Dev environment | Docker (Colima) on macOS ARM |

### 1.2 Application Type

Single-page application (SPA) with client-side routing. No backend — all data is served from mock service modules during the demo/MVP phase.

### 1.3 Project Structure

```
src/
├── components/          # Shared UI components
│   ├── Layout/          # AppShell, Sidebar, Header
│   ├── Toast/           # Toast notification system
│   ├── PageHeader/      # Reusable page header
│   ├── Modal/           # Modal dialog
│   ├── Motion/          # Animation wrappers
│   └── DateTimeField/   # Date/time input
├── context/             # React contexts
│   └── AuthContext.tsx   # Auth provider + useAuth hook
├── pages/               # Route-level page components
│   ├── Auth/            # Login + passcode gate
│   ├── Dashboard/       # Personal + executive dashboards
│   ├── Senior/          # Senior Manager dashboard
│   ├── Team/            # Team overview + requests
│   ├── Calendar/        # Shift calendar
│   ├── Homes/           # Home cards + detail
│   ├── Residents/       # Young people list + detail
│   ├── Manage/          # Approval/override/swap hub
│   ├── Rota/            # Rota timeline
│   ├── Metrics/         # KPI dashboard
│   ├── Audit/           # Audit log
│   ├── Admin/           # System admin pages
│   └── Settings/        # Theme/accessibility
├── services/            # Data layer (mock services)
│   ├── auth/            # Auth service + mock users
│   ├── team/            # Team members + stats
│   ├── home/            # Homes + residents
│   ├── manage/          # Approvals, swaps, overrides
│   ├── rota/            # Rota generation
│   ├── calendar/        # Calendar events
│   └── audit/           # Audit events
├── App.tsx              # Router + layout
├── main.tsx             # Entry point
└── index.scss           # Global styles + CSS variables
```

---

## 2. Routing & Navigation

### 2.1 Route Table

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/passcode` | PasscodeGate | None | Demo access gate |
| `/login` | LoginPage | Passcode | Role selection (persona switcher) |
| `/` | Dashboard | Auth | Redirects based on role |
| `/dashboard` | PersonalDashboard | Auth | Care Worker / Team Lead view |
| `/senior` | SeniorDashboard | Auth + `home.view` | Executive dashboard |
| `/team` | TeamOverview | Auth | Team requests & activity |
| `/calendar` | CalendarPage | Auth | Shift calendar |
| `/homes` | HomesPage | Auth + `home.view` | Care home grid |
| `/residents` | ResidentsList | Auth | Young people list |
| `/residents/:id` | ResidentDetail | Auth | Individual resident |
| `/manage` | ManageHub | Auth + `manage.view` | Approvals & overrides |
| `/rota` | RotaPage | Auth + `rota.view` | Rota timeline |
| `/metrics` | MetricsPage | Auth + `home.view` | KPI dashboard |
| `/audit` | AuditLog | Auth + `audit.read` | Audit events |
| `/admin/*` | AdminPages | Auth + `system.*` | System setup |
| `/settings` | SettingsPage | Auth | Theme & accessibility |

### 2.2 Sidebar Navigation

The sidebar adapts to the user's permissions:

| Group | Items | Visible to |
|-------|-------|-----------|
| Main | Dashboard | All |
| Operations | Team, Calendar | All |
| Management | Homes, Residents | `home.view` (Deputy+) for Homes; All for Residents |
| Planning | Manage, Rota | `manage.view` / `rota.view` (Team Lead+) |
| Oversight | Metrics, Audit | `home.view` / `audit.read` (Deputy+) |
| System | Admin, Settings | `system.*` for Admin; All for Settings |

---

## 3. Authentication & Authorization

### 3.1 Auth Flow (Demo)

1. User enters passcode (shared demo gate)
2. User selects a persona from the login screen
3. `AuthContext` stores user object with `id`, `name`, `role`, `homes[]`, `permissions[]`
4. `useAuth()` hook exposes `user`, `can(permission)`, `login()`, `logout()`

### 3.2 Permission Checks

```
useAuth().can("home.view")       → Deputy+
useAuth().can("system.company.edit") → Senior Manager / System Admin
useAuth().can("manage.view")     → Team Lead+
useAuth().can("rota.view")       → Team Lead+
useAuth().can("audit.read")      → Deputy+
```

### 3.3 Route Protection

- `<RequirePermission perm="...">` wrapper component on protected routes
- Sidebar items hidden when user lacks the required permission
- No server-side enforcement in MVP (all data is client-side mock)

---

## 4. Data Layer

### 4.1 Mock Architecture

All services follow this pattern:

```typescript
// service.ts — public API
export const fooService = {
  getAll: () => mockResponse(MOCK_DATA),
  getById: (id) => mockResponse(MOCK_DATA.find(d => d.id === id)),
}

// service.mock.ts — seed data + types
export type Foo = { id: string; name: string; ... }
export const MOCK_DATA: Foo[] = [...]
```

`mockResponse()` wraps data in a `Promise` to simulate async API calls.

### 4.2 Service Inventory

| Service | Module | Key Types | Records |
|---------|--------|-----------|---------|
| Auth | `services/auth/` | `User`, `Permission` | 6 users |
| Team | `services/team/` | `TeamMember`, `TeamStat` | 8 members, 4 stats |
| Homes | `services/home/homes` | `Home`, `HomeActivity` | 3 homes, 4 activities |
| Residents | `services/home/residents` | `SubjectRow` | 8 residents |
| Manage | `services/manage/` | `Approval`, `SwapRequest`, `Override`, `PermissionGrant` | 5 + 4 + 3 + 4 |
| Rota | `services/rota/` | `RotaWeek`, `RotaEntry`, `TeamRoster` | Generated weekly |
| Calendar | `services/calendar/` | `CalendarEvent` | 26 events |
| Audit | `services/audit/` | `AuditEvent` | 12 events |
| Senior | `pages/Senior/senior.mock` | `HomeHealth`, `Escalation`, `PendingItem`, `StaffOnDuty`, `TodayEvent` | 3 + 5 + 4 + 13 + 8 |

### 4.3 Key Data Relationships

```
Company (1)
  └── Home (many)
       ├── TeamMember (many)
       │    └── Approval / SwapRequest / Override
       ├── SubjectRow (young people, many)
       │    ├── Comment (many, threaded)
       │    └── ServiceHistory (many)
       └── HomeActivity (many)
```

---

## 5. Page Designs

### 5.1 Personal Dashboard (Care Worker / Team Lead)

- **Weekly hours** progress bar (hours worked / contracted)
- **Upcoming shifts** list (next 3-5 shifts)
- **Pending requests** badge count (leave, swaps awaiting response)

### 5.2 Executive Dashboard (Deputy / Home Manager / Senior Manager)

**Single-home view (Deputy / single-home HM):**
- Home health card (staffing ratio, incidents, coverage %)
- Staff on duty today (avatar list with shift times and status)
- Today's schedule (meetings, visits, reviews)
- Escalations panel
- Pending items panel

**Multi-home view (multi-home HM / Senior Manager):**
- Grid of home health cards (one per home)
- Escalations panel (aggregated across all homes)
- Pending items panel (aggregated)

### 5.3 Team Overview

- **KPI stats row**: Active this week, Pending swaps, Pending leave, Avg hours filled
- **Filter bar**: Home selector, Type chips (Leave/Overtime, Swaps, All), Approval status chips (Pending, Approved, All)
- **Search**: Full-text search across requester names and summaries
- **Request table**: Columns — Who (requester avatar + name + role), With (counterparty, for swaps), Type (badge), Summary (text), Status (badge + dropdown)
- **Status dropdown** (for actionable items): Approve, Reject, Ask for details, Forward request
- **Forward modal**: Team member picker + note textarea
- **Team activity feed** (hidden for Senior Manager): Recent team events

### 5.4 Calendar

- **Month grid** with event dots per day
- **Day detail sidebar** listing all events for the selected day
- **Event types**: shift (blue), swap (purple), overtime (orange), leave (green), unfilled (red)
- **Coverage toggle** to switch between personal and team-wide views

### 5.5 Homes

- **Card grid**: One card per home showing name, location, capacity bar, staffing ratio, Ofsted badge, coverage %, highlight text
- **Detail modal**: Occupancy chart, coverage breakdown, recent activity feed

### 5.6 Residents / Young People

**List view:**
- Table with columns: Code, Name, Home, Keyworker, Status badge, Last review date
- Search by name/code

**Detail view:**
- **Profile header**: Name, code, home, keyworker, room, DOB/age, admission date, primary contact
- **Service history timeline**: Chronological events (admissions, placement plans, health reviews, incidents, appointments, notes) with kind badges and actor attribution
- **Comments section**: Threaded discussion (top-level + nested replies), author avatars, timestamps, role badges

### 5.7 Manage Hub

- **Tab bar**: All, Overrides, Approvals, Swaps, Permissions
- **Overrides tab**: Cards showing shift slot, original staff, replacement, reason, status (draft/ready)
- **Approvals tab**: Cards showing request type, requester, summary, approve/decline actions
- **Swaps tab**: Cards showing requester <-> counterparty, shift details, status
- **Permissions tab**: Table of staff with access level dropdown and scope

### 5.8 Rota

- **24-hour timeline** (vertical axis = hours 00-24, horizontal = days Mon-Sun)
- **Shift bars** colour-coded by type (shift/overtime/leave/swap)
- **Night shift handling**: Bars that cross midnight shown as two segments (pre/post midnight)
- **Team roster sidebar**: Grouped by team, showing members with role labels
- **Week navigation**: Previous/next week arrows with week label

### 5.9 Metrics

- **KPI cards**: Staff coverage %, incidents this week, reviews due, hours variance
- **7-day strip**: Daily bars for coverage, incidents, and reviews
- **Scope indicator**: Shows which home(s) the metrics cover based on user role

### 5.10 Audit Log

- **Domain tabs**: All, Home, Team, People, Professional
- **Event list**: Timestamp, actor (avatar + name + role), action, target, severity badge
- **Severity colours**: info (grey), notice (blue), warning (amber), critical (red)
- **Scope filtering**: Deputy sees own home only; Manager/SM sees all homes

### 5.11 Admin Pages

- **Company**: Legal name, address, Companies House number (form)
- **Homes**: CRUD for care homes (name, address, registration, manager)
- **Teams**: Team name, leader assignment, member count
- **Rota patterns**: Rotation order, cadence, shift block definitions
- **Work patterns**: Named patterns (e.g. Mon-Fri 09:00-17:00)
- **Staff**: People records with role, schedule type, home assignment
- **Residents**: Master data editor for young people records

### 5.12 Settings

- **Theme toggle**: Light/dark mode switch
- **Colour accessibility**: Preset colour schemes for colour-blind users
- **Persistence**: All settings saved to `localStorage`

---

## 6. Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AppShell | `components/Layout/` | Sidebar + header + main content area |
| Sidebar | `components/Layout/` | Permission-aware navigation |
| PageHeader | `components/PageHeader/` | Page title + breadcrumb + actions |
| Toast | `components/Toast/` | Notification toasts (success, error, info) |
| Modal | `components/Modal/` | Dialog overlay with backdrop |
| Motion | `components/Motion/` | Framer Motion animation wrappers (FadeIn, SlideUp, StaggerList) |
| DateTimeField | `components/DateTimeField/` | Date and time input with formatting |
| RequirePermission | `context/` | Route guard component |

---

## 7. Styling

### 7.1 Approach

- SCSS with BEM naming convention (`.block__element--modifier`)
- CSS custom properties for theming (defined in `index.scss`)
- No CSS-in-JS or utility-first framework
- Component-scoped `.scss` files co-located with components

### 7.2 Responsive Breakpoints

| Breakpoint | Width | Behaviour |
|-----------|-------|-----------|
| Desktop | > 1180px | Full sidebar + multi-column layouts |
| Tablet | 960px - 1180px | Collapsed sidebar, adjusted grids |
| Mobile | 640px - 960px | Stacked layouts, hamburger menu |
| Small | < 640px | Single-column, simplified views |

### 7.3 Theme System

- Light and dark themes via CSS custom properties
- Theme toggle in Settings page
- Theme stored in `localStorage` and applied on `<body>` class

---

## 8. Development & Deployment

### 8.1 Local Development

```bash
# Start Colima (macOS ARM Docker runtime)
colima start

# Start the application
docker compose up -d

# Access at http://localhost:5173
```

### 8.2 Type Checking

```bash
docker compose exec -T app sh -c "cd /app && npx tsc --noEmit"
```

### 8.3 Docker Setup

- `Dockerfile` — Node 22 Alpine, Vite dev server
- `docker-compose.yml` — Single service, port 5173 mapped, volume mount for live reload

---

## 9. Future Considerations

These items are out of scope for MVP but documented for planning:

1. **Backend API**: Replace mock services with REST/GraphQL endpoints
2. **Database**: PostgreSQL for relational data, audit log append-only table
3. **Real authentication**: OAuth2 / SAML integration for SSO
4. **File uploads**: Document attachments on resident records
5. **Notifications**: Push notifications for approvals, escalations
6. **Reporting**: PDF/Excel export for Ofsted reports, Reg 44 packs
7. **Multi-tenancy**: Support multiple care organisations on one instance
8. **Mobile app**: React Native or PWA for care workers on shift
9. **Integration**: HR systems, payroll, Ofsted portal API
10. **Offline support**: Service worker for connectivity gaps in care homes
