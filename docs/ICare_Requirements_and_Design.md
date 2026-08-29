# ICare - Requirements & Design Document

**Project:** ICare Children's Care Home Management System
**Company:** BrightPath Children's Services Ltd
**Version:** 1.0 (Demo / MVP)
**Last updated:** 2026-08-09

---

# Part 1: Requirements

## 1. Product Overview

ICare is a web-based care home management platform designed for children's residential care providers operating under Ofsted regulation. It provides role-based dashboards, shift management, resident tracking, approval workflows, and audit logging across multiple care homes.

The system serves six tiers of users - from frontline RSWs to System Administrators - each seeing a tailored view of the data they need.

### 1.1 Business Goals

- Provide real-time visibility into staffing levels, incidents, and compliance across all homes
- Streamline approval workflows for leave, overtime, shift swaps, and overrides
- Maintain a tamper-proof audit trail for Ofsted and regulatory compliance
- Support children's care terminology: Ofsted ratings, Reg 44 visits, LAC reviews, PEP meetings, CAMHS referrals, safeguarding disclosures, placement plans
- Enable cross-home operations (staff swaps, escalations, consolidated reporting)

---

## 2. User Roles & Permissions

### 2.1 Role Hierarchy

> **Status: revised 2026-08-09** based on stakeholder feedback. This hierarchy governs **staff/operational data** (schedules, timesheets, approvals, supervision records, home configuration) only. It does **not** restrict visibility into resident (young person) data — see 2.2.

| Tier | Role | Operational Scope | Key Capabilities |
|------|------|-------|-----------------|
| 1 | System Admin | All homes — full, unrestricted access | Full operational + master data access system-wide; company/home/work-pattern configuration; creates Registered Manager/Deputy accounts; generates reports for the RI and senior stakeholders; top-level control point for cross-home access delegation (see 2.1.1) |
| 2 | RI (Responsible Individual) | All homes — view + audit support | Cross-home visibility for oversight; can access any home's files to support on-site/regulatory audits; generates company-wide incident/accident overviews across all homes |
| 3 | Registered Manager | Own home only — single home, no multi-home span | Staff add/edit, grant permissions, approve variances, configure rota/teams, view timesheets, audit log, audit export (own home); delegates temporary access to covering staff (see 2.1.1) |
| 3 | Deputy Manager | Own home | Can create and edit any file at their home (full CRUD on resident/home records) — *scope of what Deputy Manager is excluded from is still TBD, see note below* |
| 4 | Team Leader | Own home (own team) | Team schedule visibility, submit variances, access Manage hub, approve shift swaps, decide monthly sleeps for own team |
| 5 | RSW (Resident Support Worker) | Own home (own schedule) | View schedule, submit leave/swap requests |

**Resolved:** Registered Manager is always scoped to a single home, no exceptions. Only System Admin and RI can span multiple/all homes — this replaces the old Home Manager multi-home capability entirely.

**Open question:** the Deputy Manager description was cut off mid-sentence ("Deputy manager won't have the access...") — need the rest of that requirement to know what, if anything, is withheld from Deputy Manager.

### 2.1.1 Cross-Home Access Delegation

When staff are rostered to cover a shift at a home other than their usual assignment, they need access to that home's children's files for the day. Requirement as described:

1. System Admin holds unrestricted access to all homes and is the top-level control point.
2. System Admin hands over home-level access to that home's Registered Manager.
3. The Registered Manager grants the covering staff member (RSW, Deputy Manager, or Team Leader) access to that home's resident files for the shift they're working.

**Resolved — hybrid model:** access follows the rota automatically; the Registered Manager can revoke/restrict for a specific person or shift as a safety valve.

- The moment a cross-home covering shift appears on the rota, that staff member is automatically recognized as on-duty at the covering home for the shift window — no manual grant step for the normal case.
- Registered Manager (or System Admin) can revoke or restrict a specific person's delegated access for a specific shift when there's a reason not to extend it (e.g. an active safeguarding concern).

**Reconciling with §2.2's universal resident-data visibility:** reading any resident's file at any home is already unrestricted for every role (§2.2) — so this delegation mechanism can't be gating *read* access, or it would be redundant. It governs **write access** instead: whether a covering staff member is recognized as on-duty at that home and can create/log entries there (Daily Record, Incidents, etc. — §3.5.1) for the shift they're covering. This is the interpretation used for the design in §11.7 below.

### 2.2 Permission Model

- Flat permission array checked via `useAuth().can(permission)`
- UI hides inaccessible navigation items; `<RequirePermission>` provides defence-in-depth on routes
- `home.view` distinguishes executive-level users (Registered Manager+) from shift workers
- `system.company.edit` distinguishes System Admin from Registered Manager/Deputy
- Scope filtering uses `user.homes` array for multi-home roles (System Admin, RI)
- **Resident data is universally visible:** reports, incidents, and any record concerning a young person in care are visible to **every role**, regardless of home or team scope. The tiered scope above applies only to staff-facing operational data — it never gates access to a child's records or a home's incident/safeguarding activity.
- **File creation spans the operational chain:** the process to create a file (checks, logs, reports, etc.) is available to everyone from Registered Manager down to RSW — Registered Manager, Deputy Manager, Team Leader, and RSW can all create/log records. System Admin and RI sit outside this chain — their role is administrative/oversight (see §2.1), not day-to-day record creation.

### 2.3 Demo Users

| User | Role | Homes |
|------|------|-------|
| Amira O. (u-pro) | RSW | Willow House |
| Daniel T. (u-tl) | Team Leader | Willow House |
| Sam Ortega (u-ad) | Deputy Manager | Oakmoor House |
| Priya Amari (u-hm) | Registered Manager | Willow House |
| Raj Kapoor (u-sm) | RI | All homes |
| Alex Chen (u-sys) | System Admin | All homes |

---

## 3. Functional Requirements

### 3.1 Dashboard (FR-DASH)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-DASH-01 | Personal dashboard showing weekly hours tracking, upcoming shifts, and pending requests | RSW, Team Leader |
| FR-DASH-02 | Executive dashboard showing home health cards with staffing, incidents, escalations, and approval counts | Registered Manager+ |
| FR-DASH-03 | Registered Manager and Deputy Manager see "Staff on duty today" and "Today's schedule" panels alongside their home card — they are always single-home (§2.1, resolved) | Registered Manager, Deputy Manager |
| FR-DASH-04 | RI and System Admin see a grid of all home health cards — the only roles that span multiple homes | RI, System Admin |
| FR-DASH-05 | Escalation panel showing items raised to the signed-in manager, sorted by severity | Registered Manager+ |
| FR-DASH-06 | Pending items panel showing leave/overtime/swap/variance requests awaiting action | Registered Manager+ |
| FR-DASH-07 | Dashboard routing: `home.view` holders see executive dashboard; others see personal dashboard | All |

### 3.2 Team (FR-TEAM)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-TEAM-01 | Request-centric table showing all leave, overtime, and swap requests with requester, counterparty, type, details, and status | All (scope varies) |
| FR-TEAM-02 | Filter by home, request type (Leave/Overtime, Swaps, All), and approval status (Pending default, Approved, All) | All |
| FR-TEAM-03 | Status column shows badge with dropdown arrow for actionable items | Registered Manager+ |
| FR-TEAM-04 | Dropdown menu offers: Approve, Reject, Ask for details, Forward request | Registered Manager+ |
| FR-TEAM-05 | Forward request opens modal with team member picker and optional note | Registered Manager+ |
| FR-TEAM-06 | Cross-home swap visibility: show home name for both requester and counterparty | All |
| FR-TEAM-07 | Team activity feed shown for non-oversight roles, hidden for RI/System Admin | RSW, Team Leader, Deputy Manager, Registered Manager |
| FR-TEAM-08 | KPI stats row: Active this week, Pending swaps, Pending leave, Avg hours filled | Team Leader+ |
| FR-TEAM-09 | Override drafting from team member rows | Registered Manager+ |

### 3.3 Calendar (FR-CAL)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-CAL-01 | Personal calendar view showing own shifts, leave, swaps, overtime | All |
| FR-CAL-02 | Coverage view showing all shifts and unfilled/vacant slots | Team Leader+ |
| FR-CAL-03 | Day detail panel with per-event breakdown | All |
| FR-CAL-04 | Draft overtime coverage from vacant slot | Registered Manager+ |

### 3.4 Homes (FR-HOME)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-HOME-01 | Grid of care home cards showing name, location, capacity, residents, staffing, coverage %, Ofsted rating | Registered Manager+ |
| FR-HOME-02 | Home detail modal with occupancy, coverage, activity log | Registered Manager+ |
| FR-HOME-03 | Activity feed per home: incidents, admissions, discharges, audit notes | Registered Manager+ |

### 3.5 Residents / Young People (FR-RES)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-RES-01 | List of young people with name, home, keyworker, status, last review | RSW+ |
| FR-RES-02 | Resident detail page with profile, service history, and comments | RSW+ |
| FR-RES-03 | Threaded comments on resident records (top-level + replies) | RSW+ |
| FR-RES-04 | Every young person has the full file structure defined in §3.5.1 — one complete set per resident, sized to the home's registered capacity (e.g. a home licensed for 3 children maintains 3 full sets of files) | RSW+ |
| FR-RES-05 | New resident admission form | Registered Manager+ |
| FR-RES-06 | Edit resident records | Registered Manager+ |

#### 3.5.1 Young Person File Structure

Replaces the earlier generic "service history timeline." Each document type below is per-resident. Visibility follows §2.2 (universal — every role can see any resident's files); "Updated By" reflects who typically logs it, per the operational-chain principle in §2.2.

| Document | Cadence / Trigger | Updated By |
|----------|-------------------|-----------|
| Care Plan (history, family info, health needs/disabilities, education, previous & ongoing treatments) | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| Behaviour Support Plan | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| Daily Logs | Daily | RSW, Team Leader |
| Daily Education | Daily | RSW, Team Leader |
| Reflective (young person's feedback for the day) | Daily | RSW, Team Leader |
| Risk Assessments | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| Family Tree | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| Activity | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| Accident Reports | Event-triggered — created when an accident occurs | Registered Manager, Deputy Manager, Team Leader, RSW |
| Missing Reports | Event-triggered — created when a missing episode occurs | Registered Manager, Deputy Manager, Team Leader, RSW |
| Incidents | Event-triggered — created when an incident occurs at the home | Registered Manager, Deputy Manager, Team Leader, RSW |
| EHCP (Education, Health & Care Plan) | As required | Registered Manager, Deputy Manager, Team Leader, RSW |
| LAC Minutes | Event-triggered — updated when a LAC (Looked After Child) review meeting happens | Registered Manager, Deputy Manager, Team Leader, RSW |
| Health Reports and Appointments | As required / event-triggered on appointment | Registered Manager, Deputy Manager, Team Leader, RSW |

### 3.6 Manage Hub (FR-MGR)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-MGR-01 | Tabbed view: All, Overrides, Approvals, Swaps, Permissions | Team Leader+ |
| FR-MGR-02 | Override drafting: reassign shifts with replacement, reason, and time slot | Registered Manager+ |
| FR-MGR-03 | Approval queue: leave and overtime requests with approve/decline actions | Registered Manager+ |
| FR-MGR-04 | Swap feed: observe-only visibility of shift swap requests between team members | Team Leader+ |
| FR-MGR-05 | Permissions panel: grant/revoke access levels per staff member | Registered Manager+ |

*Open question (unchanged from §2.1): FR-MGR-03 gives overtime approval to Registered Manager+ only; the feedback explicitly excludes RSW from accepting overtime but doesn't say whether Team Leader should also get approval rights — still pending confirmation.*

#### 3.6.1 Supervision (FR-SUP)

One-on-one supervision meeting records — personal/confidential by default. An employee's supervision record is not shared with anyone except the people who conducted their supervisions, **and** everyone above that employee in the management chain at their home (visibility cascades upward, not just to the direct supervisor). System Admin has full access to all records regardless (per §2.1).

**Supervision chain (who conducts whose supervision):**
- RI supervises Registered Manager
- Registered Manager supervises Deputy Manager
- Registered Manager **and** Deputy Manager supervise Team Leader
- Team Leader supervises their own team members (RSW)

**Visibility (cascades upward through the chain):**
- Registered Manager can see the supervision records of **all** their employees (Deputy Manager, Team Leaders, RSW) at their home
- Deputy Manager can see the supervision records of Team Leaders and RSW
- Team Leader can see the supervision records of their own team members (RSW) only
- Never visible laterally (peers) or to unrelated staff

| ID | Requirement | Roles |
|----|------------|-------|
| FR-SUP-01 | Supervision record: supervisor, supervisee, date, notes, following the chain above | Per chain |
| FR-SUP-02 | A supervision record is visible to: the supervisee, whoever conducted it, and every role above the supervisee in the management chain at that home. Never visible to peers or unrelated staff | All (scoped per record) |
| FR-SUP-03 | Team Leader cannot view Deputy Manager's supervision record, or any other Team Leader's supervision record (including that other TL's own team members' supervision) | Team Leader |
| FR-SUP-04 | RSW cannot view any supervision record other than their own | RSW |
| FR-SUP-05 | RSW cannot accept/approve overtime requests | RSW |

### 3.7 Rota (FR-ROTA)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-ROTA-01 | 24-hour timeline view of team coverage for the current week | Team Leader+ |
| FR-ROTA-02 | Per-day breakdown showing individual staff shifts, overtime, leave, swaps | Team Leader+ |
| FR-ROTA-03 | Night shift continuations displayed correctly across day boundaries | Team Leader+ |
| FR-ROTA-04 | Team roster sidebar showing team groupings and members | Team Leader+ |

### 3.8 Metrics (FR-MET)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-MET-01 | KPI dashboard with coverage, incident, and review metrics | Registered Manager+ |
| FR-MET-02 | 7-day daily strip showing staff coverage, incidents logged, reviews due | Registered Manager+ |
| FR-MET-03 | Metric scope scales with role: team-level vs home vs multi-home | Varies by role |

### 3.9 Audit Log (FR-AUD)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-AUD-01 | Append-only event log of all system actions | Registered Manager+ |
| FR-AUD-02 | Domain tabs: All, Home, Team, People, Professional | Registered Manager+ |
| FR-AUD-03 | Severity levels: info, notice, warning, critical | Registered Manager+ |
| FR-AUD-04 | Scoped visibility: own-home for Registered Manager/Deputy Manager, all-homes for RI/System Admin | Varies |
| FR-AUD-05 | Audit export capability | Registered Manager+ |

*Note: FR-AUD-05 and FR-MGR-05 previously excluded Deputy Manager from the old text ("Home Manager, Senior Manager" only). Normalized here to Registered Manager+ (which includes Deputy Manager), since Registered Manager and Deputy Manager are now the same tier (§2.1). Revisit if the still-open "what is Deputy Manager excluded from" question resolves to exclude these specifically.*

### 3.10 Admin / System Setup (FR-ADM)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-ADM-01 | Company information management (legal name, address, Companies House number) | System Admin |
| FR-ADM-02 | Home configuration (name, address, registration, manager assignment) | System Admin |
| FR-ADM-03 | Team setup (team names, leaders, sizes) | System Admin |
| FR-ADM-04 | Rota pattern configuration (rotation order, cadence, shift blocks) | System Admin |
| FR-ADM-05 | Work pattern definition (e.g. Mon-Fri 09:00-17:00) | System Admin |
| FR-ADM-06 | Staff record management (people, roles, schedule types) | System Admin |
| FR-ADM-07 | Resident master data editor | System Admin |

### 3.11 Settings (FR-SET)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-SET-01 | Theme toggle: light/dark mode | All |
| FR-SET-02 | Colour accessibility presets | All |
| FR-SET-03 | Settings persisted to localStorage | All |

### 3.12 Common Files (FR-COM)

Home-level compliance documents and checks. Unlike other functional areas, these are **viewable by every role** regardless of tier — the role hierarchy in §2.1 does not restrict this section. "Performed by" indicates who completes/logs the check, not who can view it.

| ID | Requirement | Roles |
|----|------------|-------|
| FR-COM-01 | Statement of Purpose: defines the home's registered type (e.g. Learning Disability home or EBD home) and the services/support provided to residents; shared by the Registered Manager as part of the home's Ofsted registration | Shared by Registered Manager; viewable by All |
| FR-COM-02 | Daily checks: fridge and freezer temperature checks | Performed by Registered Manager, Deputy Manager, Team Leader, RSW; viewable by All |
| FR-COM-03 | Weekly checks: building & security checks, water checks, medication audit, fire and safety checks, first aid checks, car maintenance check, bedroom checks | Performed by Registered Manager, Deputy Manager, Team Leader, RSW; viewable by All |
| FR-COM-04 | Monthly Team Meetings | All |
| FR-COM-05 | Location Risk Assessment | All |
| FR-COM-06 | Young People's Weekly Meetings | All |
| FR-COM-07 | Daily Handovers and Debriefs | All |

### 3.13 Time Sheet (FR-TS)

Standalone top-level navigation section (own icon), separate from Team and Manage Hub.

| ID | Requirement | Roles |
|----|------------|-------|
| FR-TS-01 | Time Sheet is a standalone top-level nav section, distinct from Team and Manage Hub | All |
| FR-TS-02 | Monthly Rota view | All |
| FR-TS-03 | Annual leave requests are submitted to the Registered Manager | RSW, Team Leader, Deputy Manager |
| FR-TS-04 | On receiving a leave request, the Registered Manager arranges and shares the resulting overtime opportunity to cover the shift, and accepts the staff member who takes it up | Registered Manager |
| FR-TS-05 | Shift swap requests require two-step approval: Team Leader approves first, then Registered Manager. This confirms the covering staff member is appropriately qualified/trained to support the children on that shift | Team Leader, Registered Manager |
| FR-TS-06 | On-call scheduling is managed by the Registered Manager | Registered Manager |
| FR-TS-07 | Registered Manager double-checks the Time Sheet — built from leave, overtime, and swaps across the month — before submitting payroll to the Accounts team | Registered Manager |

**Visibility (cascades upward through the management chain, same pattern as Supervision in §3.6.1):**

| ID | Requirement | Roles |
|----|------------|-------|
| FR-TS-08 | Registered Manager can see the time sheets of all staff at their home — Deputy Manager, Team Leaders, and RSW | Registered Manager |
| FR-TS-09 | Deputy Manager can see the time sheets of all employees under them — Team Leaders and RSW | Deputy Manager |
| FR-TS-10 | Team Leader can see the time sheets of the RSWs on their own team | Team Leader |
| FR-TS-11 | RSW can only view, manage, and create their own time sheet | RSW |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-01 | Single-page application (SPA) — no full-page reloads |
| NFR-02 | Responsive design: desktop-first with mobile breakpoints at 1180px, 960px, 640px |
| NFR-03 | Role-based access control on every route and UI element |
| NFR-04 | All data changes logged to audit trail |
| NFR-05 | Ofsted-compliant terminology throughout the UI |
| NFR-06 | Demo mode with persona switcher for stakeholder walkthroughs |
| NFR-07 | Passcode gate for public-facing demo access |
| NFR-08 | Dark/light theme support with CSS custom properties |
| NFR-09 | Smooth page transitions and list animations (Framer Motion) |

---

## 5. Data Model Summary

An Excel template (`ICare_Data_Template.xlsx`) is provided with 18 sheets covering all data entities:

| Sheet | Entity | Records (sample) |
|-------|--------|-----------------|
| Homes | Care home details | 3 |
| Young People | Residents in care | 8 |
| Staff | Team members | 8 |
| Approvals | Leave/overtime requests | 5 |
| Swap Requests | Shift swaps | 4 |
| Overrides | Shift overrides | 3 |
| Rota Shifts | Individual shift entries | Generated |
| Calendar Events | Calendar view events | 26 |
| Home Activity | Home-level activity log | 4 |
| Escalations | RI/System Admin escalation items | 5 |
| Pending Items | RI/System Admin pending queue | 4 |
| Staff On Duty | Today's on-duty staff | 13 |
| Today Schedule | Today's events | 8 |
| Audit Log | System audit events | 12 |
| Permissions | Staff access levels | 4 |
| YP Comments | Resident comments | 12 |
| Service History | Resident timeline | 18 |
| Company | Organisation info | 1 |

---

## 6. Glossary

| Term | Meaning |
|------|---------|
| RSW | Resident Support Worker — frontline staff role, replaces the earlier "Care Worker" / "RCW" terminology |
| RI | Responsible Individual — statutory Ofsted oversight role with visibility across all homes |
| Registered Manager | The person registered with Ofsted as manager of a children's home; scoped to their own home in ICare |
| EBD | Emotional and Behavioural Difficulties |
| LAC | Looked After Child |
| PEP | Personal Education Plan |
| CAMHS | Child and Adolescent Mental Health Services |
| Reg 44 | Regulation 44 monthly independent visit |
| Ofsted | Office for Standards in Education, Children's Services and Skills |
| Placement Plan | Document outlining care arrangements for a young person |
| Statement of Purpose | Regulatory document defining a home's registered type (e.g. Learning Disability or EBD home) and the services it provides; required for Ofsted registration |
| Keyworker | Staff member with primary responsibility for a young person |
| Safeguarding | Protecting children from harm, abuse, and neglect |

---
---

# Part 2: Design

## 7. Architecture

### 7.1 Tech Stack

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

### 7.2 Application Type

Single-page application (SPA) with client-side routing. No backend — all data is served from mock service modules during the demo/MVP phase.

### 7.3 Project Structure

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
│   ├── Dashboard/       # Personal dashboard (RSW / Team Leader)
│   ├── Executive/       # Executive dashboard (Registered Manager/Deputy Manager single-home; RI/System Admin multi-home) — renamed from Senior/
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

## 8. Routing & Navigation

### 8.1 Route Table

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/passcode` | PasscodeGate | None | Demo access gate |
| `/login` | LoginPage | Passcode | Role selection (persona switcher) |
| `/` | Dashboard | Auth | Redirects based on role |
| `/dashboard` | PersonalDashboard | Auth | RSW / Team Leader view |
| `/executive` | ExecutiveDashboard | Auth + `home.view` | Executive dashboard — single-home render for Registered Manager/Deputy Manager, multi-home grid for RI/System Admin. Renamed from `/senior`; no Senior Manager role in the new model |
| `/team` | TeamOverview | Auth | Team requests & activity |
| `/calendar` | CalendarPage | Auth | Shift calendar |
| `/common-files` | CommonFilesPage | Auth | Home-level compliance documents & checks (FR-COM) — viewable by every role, no tier gate |
| `/timesheet` | TimeSheetPage | Auth | Time Sheet — standalone section (FR-TS): Monthly Rota, leave/overtime/swap requests, on-call, payroll prep, and Supervision (FR-SUP). Visibility scoped per-tab (FR-TS-08 to -11 / FR-SUP-02), not a route-level permission gate |
| `/homes` | HomesPage | Auth + `home.view` | Care home grid |
| `/residents` | ResidentsList | Auth | Young people list |
| `/residents/:id` | ResidentDetail | Auth | Individual resident |
| `/manage` | ManageHub | Auth + `manage.view` | Approvals & overrides |
| `/rota` | RotaPage | Auth + `rota.view` | Rota timeline |
| `/metrics` | MetricsPage | Auth + `home.view` | KPI dashboard |
| `/audit` | AuditLog | Auth + `audit.read` | Audit events |
| `/admin/*` | AdminPages | Auth + `system.*` | System setup |
| `/settings` | SettingsPage | Auth | Theme & accessibility |

### 8.2 Sidebar Navigation

The sidebar adapts to the user's permissions:

| Group | Items | Visible to |
|-------|-------|-----------|
| Main | Dashboard | All |
| Operations | Team, Calendar, Common Files, Time Sheet | All |
| Management | Homes, Residents | `home.view` (Registered Manager+) for Homes; All for Residents |
| Planning | Manage, Rota | `manage.view` / `rota.view` (Team Leader+) |
| Oversight | Metrics, Audit | `home.view` / `audit.read` (Registered Manager+) |
| System | Admin, Settings | `system.*` for Admin; All for Settings |

---

## 9. Authentication & Authorization

### 9.1 Auth Flow (Demo)

1. User enters passcode (shared demo gate)
2. User selects a persona from the login screen
3. `AuthContext` stores user object with `id`, `name`, `role`, `homes[]`, `permissions[]`
4. `useAuth()` hook exposes `user`, `can(permission)`, `login()`, `logout()`

`role` is one of: `System Admin`, `RI`, `Registered Manager`, `Deputy Manager`, `Team Leader`, `RSW` (§2.1). For System Admin and RI, `homes[]` covers every home — either populated with all home IDs or an `all: true` sentinel; exact representation is a §10 data-layer decision (task #14).

### 9.2 Permission Checks

```
useAuth().can("home.view")           → Registered Manager+
useAuth().can("system.company.edit") → System Admin only
useAuth().can("manage.view")         → Team Leader+
useAuth().can("rota.view")           → Team Leader+
useAuth().can("audit.read")          → Registered Manager+
```

### 9.3 Route Protection

- `<RequirePermission perm="...">` wrapper component on protected routes
- Sidebar items hidden when user lacks the required permission
- No server-side enforcement in MVP (all data is client-side mock)

---

## 10. Data Layer

### 10.1 Mock Architecture

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

### 10.2 Service Inventory

| Service | Module | Key Types | Records |
|---------|--------|-----------|---------|
| Auth | `services/auth/` | `User` (role: System Admin \| RI \| Registered Manager \| Deputy Manager \| Team Leader \| RSW), `Permission` | 6 users |
| Team | `services/team/` | `TeamMember` (+ new `supervisorId` field, §10.2.1), `TeamStat` | 8 members, 4 stats |
| Homes | `services/home/homes` | `Home`, `HomeActivity` | 3 homes, 4 activities |
| Residents | `services/home/residents` | `SubjectRow` + 14 document sub-types (§10.2.1, replaces flat `ServiceHistory`) | 8 residents |
| Manage | `services/manage/` | `Approval`, `SwapRequest`, `Override`, `PermissionGrant` | 5 + 4 + 3 + 4 |
| Rota | `services/rota/` | `RotaWeek`, `RotaEntry` (+ new `coveringHomeId` field, §10.2.1), `TeamRoster` | Generated weekly |
| Calendar | `services/calendar/` | `CalendarEvent` | 26 events |
| Audit | `services/audit/` | `AuditEvent` | 12 events |
| Executive | `pages/Executive/executive.mock` | `HomeHealth`, `Escalation`, `PendingItem`, `StaffOnDuty`, `TodayEvent` | 3 + 5 + 4 + 13 + 8 |
| Common Files | `services/commonFiles/` | `CommonFileDoc`, `CheckEntry`, `MeetingRecord`, `HandoverEntry` | Per home — 1 SoP, ~8 check types, meetings, daily handovers |
| Supervision | `services/supervision/` | `SupervisionRecord` | Per supervisor–supervisee pair (§3.6.1) |
| Time Sheet | `services/timeSheet/` | `OnCallEntry`, `PayrollPeriod` — leave/overtime/swaps are **not** duplicated here, this service reads `Approval`/`SwapRequest` from Manage and aggregates them by the FR-TS-08–11 scope | New + aggregated |
| Access | `services/access/` | `HomeAccessGrant` | Auto-derived from cross-home `RotaEntry` (§2.1.1) |

#### 10.2.1 New & Extended Entity Types

| Type | Key Fields | Notes |
|------|-----------|-------|
| `CommonFileDoc` | id, homeId, homeRegisteredType, servicesProvided, updatedBy, updatedAt | Statement of Purpose — FR-COM-01 |
| `CheckEntry` | id, homeId, checkType (building-security \| water \| medication-audit \| fire-safety \| first-aid \| car-maintenance \| bedroom \| fridge-freezer), cadence (daily \| weekly), completedBy, completedAt | FR-COM-02/03 |
| `MeetingRecord` | id, homeId, kind (monthly-team \| location-risk-assessment \| yp-weekly), date, attendees, notes | FR-COM-04/05/06 |
| `HandoverEntry` | id, homeId, shiftId, date, notes, loggedBy | FR-COM-07 |
| `CarePlan`, `BehaviourSupportPlan`, `RiskAssessment`, `FamilyTree`, `EHCP` | id, residentId, content, version, updatedBy, updatedAt | §3.5.1, "as required" cadence — Plans & Assessments tab |
| `DailyRecordEntry` | id, residentId, date, dailyLog, dailyEducation, reflective, loggedBy | Combines Daily Logs + Daily Education + Reflective into one entry per §11.6's UI decision |
| `Activity` | id, residentId, date, description, loggedBy | §3.5.1 |
| `AccidentReport`, `MissingReport`, `Incident` | id, residentId, homeId, occurredAt, description, severity, reportedBy | Event-triggered — Incidents & Reports tab |
| `LACMinutes` | id, residentId, meetingDate, attendees, notes, loggedBy | Event-triggered |
| `HealthReport` | id, residentId, type (report \| appointment), date, notes, loggedBy | As-required / event-triggered |
| `SupervisionRecord` | id, supervisorId, superviseeId, homeId, date, notes | §3.6.1. **Service must filter server-side by the FR-SUP-02 cascade before returning** — never fetched unfiltered and hidden client-side |
| `OnCallEntry` | id, homeId, staffId, date, notes | FR-TS-06 |
| `PayrollPeriod` | id, homeId, month, staffSummaries[], signedOffBy, signedOffAt | FR-TS-07 |
| `HomeAccessGrant` | id, staffId, homeId, rotaEntryId, status (active \| revoked), revokedBy, revokedReason, revokedAt | §2.1.1 hybrid model — auto-created whenever a `RotaEntry.coveringHomeId` is set; governs write access only, not read (§2.2) |

`TeamMember.supervisorId` and `RotaEntry.coveringHomeId` are the two small additions to existing types that the new features hang off of — the supervision chain resolves via `supervisorId`, and a `HomeAccessGrant` is created automatically whenever `coveringHomeId` is set on a rota entry.

### 10.3 Key Data Relationships

```
Company (1)
  └── Home (many)
       ├── TeamMember (many)
       │    ├── supervisorId → TeamMember (self-reference, drives Supervision cascade)
       │    ├── Approval / SwapRequest / Override
       │    ├── SupervisionRecord (as supervisor and/or supervisee)
       │    └── OnCallEntry
       ├── SubjectRow (young people, many — visible cross-home per §2.2)
       │    ├── Comment (many, threaded)
       │    ├── CarePlan / BehaviourSupportPlan / RiskAssessment / FamilyTree / EHCP (1 each, versioned)
       │    ├── DailyRecordEntry (many, daily)
       │    ├── Activity (many)
       │    ├── AccidentReport / MissingReport / Incident (many, event-triggered)
       │    ├── LACMinutes (many, event-triggered)
       │    └── HealthReport (many)
       ├── HomeActivity (many)
       ├── CommonFileDoc (1 — Statement of Purpose)
       ├── CheckEntry (many — daily/weekly checks)
       ├── MeetingRecord (many)
       ├── HandoverEntry (many, daily)
       └── PayrollPeriod (many, monthly)

RotaEntry.coveringHomeId (when set) → auto-creates HomeAccessGrant (staff, covering Home, shift)
```

---

## 11. Page Designs

### 11.1 Personal Dashboard (RSW / Team Leader)

- **Weekly hours** progress bar (hours worked / contracted)
- **Upcoming shifts** list (next 3-5 shifts)
- **Pending requests** badge count (leave, swaps awaiting response)

### 11.2 Executive Dashboard (Registered Manager / Deputy Manager / RI / System Admin)

**Single-home view (Registered Manager / Deputy Manager — always single-home per §2.1):**
- Home health card (staffing ratio, incidents, coverage %)
- Staff on duty today (avatar list with shift times and status)
- Today's schedule (meetings, visits, reviews)
- Escalations panel
- Pending items panel

**Multi-home view (RI / System Admin — the only roles that span multiple homes):**
- Grid of home health cards (one per home)
- Escalations panel (aggregated across all homes)
- Pending items panel (aggregated)

### 11.3 Team Overview

- **KPI stats row**: Active this week, Pending swaps, Pending leave, Avg hours filled
- **Filter bar**: Home selector, Type chips (Leave/Overtime, Swaps, All), Approval status chips (Pending, Approved, All)
- **Search**: Full-text search across requester names and summaries
- **Request table**: Columns — Who (requester avatar + name + role), With (counterparty, for swaps), Type (badge), Summary (text), Status (badge + dropdown)
- **Status dropdown** (for actionable items): Approve, Reject, Ask for details, Forward request
- **Forward modal**: Team member picker + note textarea
- **Team activity feed** (hidden for RI/System Admin): Recent team events

### 11.4 Calendar

- **Month grid** with event dots per day
- **Day detail sidebar** listing all events for the selected day
- **Event types**: shift (blue), swap (purple), overtime (orange), leave (green), unfilled (red)
- **Coverage toggle** to switch between personal and team-wide views

### 11.5 Homes

- **Card grid**: One card per home showing name, location, capacity bar, staffing ratio, Ofsted badge, coverage %, highlight text
- **Detail modal**: Occupancy chart, coverage breakdown, recent activity feed

### 11.6 Residents / Young People

Unlike Common Files, Time Sheet, and Supervision (§11.13, §11.14), this page carries **no home selector and no scope gate** — per §2.2, resident data is universally visible to every role at every home. List and detail views show all residents, all homes, regardless of who's signed in.

**List view:**
- Table with columns: Code, Name, Home, Keyworker, Status badge, Last review date
- Search by name/code

**Detail view — replaces the old flat "service history timeline" with §3.5.1's 14 document types, grouped into 5 tabs by cadence/nature rather than shown as one undifferentiated feed:**

- **Profile header**: Name, code, home, keyworker, room, DOB/age, admission date, primary contact
- **Daily Record tab**: Daily Logs, Daily Education, Reflective — one combined entry per day (three fields on the same entry, not three separate feeds), since all three share the daily cadence and are typically filled in together by the RSW/Team Leader on shift
- **Plans & Assessments tab**: Care Plan, Behaviour Support Plan, Risk Assessments, EHCP, Family Tree — longer-lived reference documents, each shown as latest-version-plus-edit-history rather than a chronological feed
- **Incidents & Reports tab**: Accident Reports, Missing Reports, Incidents — event-triggered, newest first, each with a "+ New [type]" action; visually flagged (severity styling similar to Audit Log, §11.10) given the safeguarding weight of this category
- **Health & Reviews tab**: Health Reports and Appointments, LAC Minutes — clinical and statutory-review records together, since both are periodic/event-triggered and health-adjacent
- **Activity tab**: Activity records — kept separate from Daily Record since its cadence is "as required," not strictly daily, so it shouldn't imply a same-day expectation
- **Comments section**: Threaded discussion (top-level + nested replies), author avatars, timestamps, role badges — stays as a persistent panel below the tabs, not a tab itself, since it's cross-cutting discussion rather than a document type

Creation follows the operational-chain rule from §2.2 for every tab except Comments, which anyone with page access can post to: Registered Manager, Deputy Manager, Team Leader, and RSW can all log new entries; System Admin and RI are read/oversight only here, consistent with their role elsewhere in the app.

### 11.7 Manage Hub

- **Tab bar**: All, Overrides, Approvals, Swaps, Permissions
- **Overrides tab**: Cards showing shift slot, original staff, replacement, reason, status (draft/ready)
- **Approvals tab**: Cards showing request type, requester, summary, approve/decline actions
- **Swaps tab**: Cards showing requester <-> counterparty, shift details, status
- **Permissions tab**: Table of staff with access level dropdown and scope
  - **Delegated Access panel** (§2.1.1): auto-populated from this week's cross-home rota assignments — columns: staff member, covering home, shift date/time, status (Active/Revoked). Registered Manager and System Admin can revoke a specific entry (adds a reason field, e.g. an active safeguarding concern); RI sees the list for oversight but cannot revoke. This governs write access only — everyone can already read any resident's file at any home per §2.2

### 11.8 Rota

- **24-hour timeline** (vertical axis = hours 00-24, horizontal = days Mon-Sun)
- **Shift bars** colour-coded by type (shift/overtime/leave/swap)
- **Night shift handling**: Bars that cross midnight shown as two segments (pre/post midnight)
- **Team roster sidebar**: Grouped by team, showing members with role labels
- **Week navigation**: Previous/next week arrows with week label

### 11.9 Metrics

- **KPI cards**: Staff coverage %, incidents this week, reviews due, hours variance
- **7-day strip**: Daily bars for coverage, incidents, and reviews
- **Scope indicator**: Shows which home(s) the metrics cover based on user role

### 11.10 Audit Log

- **Domain tabs**: All, Home, Team, People, Professional
- **Event list**: Timestamp, actor (avatar + name + role), action, target, severity badge
- **Severity colours**: info (grey), notice (blue), warning (amber), critical (red)
- **Scope filtering**: Registered Manager/Deputy Manager see own home only; RI/System Admin see all homes

### 11.11 Admin Pages

- **Company**: Legal name, address, Companies House number (form)
- **Homes**: CRUD for care homes (name, address, registration, manager)
- **Teams**: Team name, leader assignment, member count
- **Rota patterns**: Rotation order, cadence, shift block definitions
- **Work patterns**: Named patterns (e.g. Mon-Fri 09:00-17:00)
- **Staff**: People records with role, schedule type, home assignment
- **Residents**: Master data editor for young people records

### 11.12 Settings

- **Theme toggle**: Light/dark mode switch
- **Colour accessibility**: Preset colour schemes for colour-blind users
- **Persistence**: All settings saved to `localStorage`

### 11.13 Common Files

Home-scoped like every other operational page (§2.1) — RSW through Registered Manager/Deputy Manager see their own home's files automatically; RI and System Admin get a home selector since they span multiple homes. "Viewable by every role" (FR-COM) means no tier gate *within* a home, not cross-home visibility — that still follows the normal operational scope.

- **Section tabs**: Statement of Purpose | Daily Checks | Weekly Checks | Meetings & Assessments | Handovers & Debriefs
- **Statement of Purpose tab**: read-only document view (home's registered type, services provided); edit action visible only to Registered Manager
- **Daily Checks tab**: fridge & freezer temperature entry form (today's slot) + history list below; each entry stamped with who logged it and when
- **Weekly Checks tab**: one entry per week across the 7 check types (building & security, water, medication audit, fire & safety, first aid, car maintenance, bedroom); same completed-by/timestamp pattern as Daily Checks
- **Meetings & Assessments tab**: list view for Monthly Team Meetings, Location Risk Assessment, and Young People's Weekly Meetings — each entry has date, attendees, and notes
- **Handovers & Debriefs tab**: chronological daily log feed, tagged by shift

Any role in the operational chain (Registered Manager, Deputy Manager, Team Leader, RSW — §2.2) can log a new entry in any tab except Statement of Purpose, which is Registered-Manager-only.

### 11.14 Time Sheet

Its own top-level nav icon (FR-TS-01) — not nested inside Team or Manage Hub, even though it covers similar ground (leave, swaps, overtime). Defaults to "My Time Sheet"; roles with broader visibility (Team Leader+) get a **staff scope selector** that respects the upward-cascading visibility rule (FR-TS-08 to -11 — same pattern as Supervision in §3.6.1):

- RSW: own time sheet only, no selector shown
- Team Leader: selector toggles between own and their team's RSWs
- Deputy Manager: selector covers Team Leaders + RSW under them
- Registered Manager: selector covers everyone at their home
- RI / System Admin: full visibility per their existing all-homes scope

**Tabs:**
- **Monthly Rota**: month-grid view of shifts, scoped by the staff selector above (FR-TS-02)
- **Leave & Overtime**: leave request form + status (submitted to Registered Manager, FR-TS-03); overtime opportunities the Registered Manager has shared appear here for eligible staff to accept (FR-TS-04)
- **Swaps**: swap request form + a two-stage status pill — *Pending Team Leader → Pending Registered Manager → Approved* — surfacing the qualification-check rationale from FR-TS-05 directly in the UI (e.g. a tooltip: "confirms the covering staff member is appropriately qualified for this shift")
- **On-Call**: read view of the on-call schedule for everyone in scope; edit action visible only to Registered Manager (FR-TS-06)
- **Payroll** (Registered Manager only, hidden for everyone else): month-end summary rolling up leave/OT/swaps per staff member, with a double-check/sign-off action before sending to the Accounts team (FR-TS-07)
- **Supervision** (FR-SUP, §3.6.1): placed here rather than Manage Hub — Manage Hub is gated `manage.view` (Team Leader+), which would leave RSW unable to see their own supervision record as the supervisee (FR-SUP-02 requires they can). Time Sheet is already Auth-only with the identical cascading-visibility pattern, so it reuses that machinery instead of building a second one.
  - Two sub-sections when applicable: **My Supervision** (records where the user is the supervisee) and **Team Supervision** (records where the user is the supervisor, or that cascade down to them) — kept visually separate so it's clear which relationship each record belongs to
  - Record fields: supervisor, supervisee, date, notes. Only the supervisor for a given relationship can create/edit that record (e.g. a Team Leader creates records for their own RSWs, a Registered Manager for their Deputy Manager and Team Leaders)
  - **Confidentiality is enforced at the data layer, not the UI**: the mock service must pre-filter which records it returns per FR-SUP-02 before the client ever sees them — never fetch the full set and hide rows client-side, since this is personal/confidential data (carries into task #14's data layer design)
  - RI / System Admin get the same home selector as elsewhere; being above every role in the chain, they see all supervision records at the selected home

---

## 12. Shared Components

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

## 13. Styling

### 13.1 Approach

- SCSS with BEM naming convention (`.block__element--modifier`)
- CSS custom properties for theming (defined in `index.scss`)
- No CSS-in-JS or utility-first framework
- Component-scoped `.scss` files co-located with components

### 13.2 Responsive Breakpoints

| Breakpoint | Width | Behaviour |
|-----------|-------|-----------|
| Desktop | > 1180px | Full sidebar + multi-column layouts |
| Tablet | 960px - 1180px | Collapsed sidebar, adjusted grids |
| Mobile | 640px - 960px | Stacked layouts, hamburger menu |
| Small | < 640px | Single-column, simplified views |

### 13.3 Theme System

- Light and dark themes via CSS custom properties
- Theme toggle in Settings page
- Theme stored in `localStorage` and applied on `<body>` class

---

## 14. Development & Deployment

### 14.1 Local Development

```bash
# Start Colima (macOS ARM Docker runtime)
colima start

# Start the application
docker compose up -d

# Access at http://localhost:5173
```

### 14.2 Type Checking

```bash
docker compose exec -T app sh -c "cd /app && npx tsc --noEmit"
```

### 14.3 Docker Setup

- `Dockerfile` — Node 22 Alpine, Vite dev server
- `docker-compose.yml` — Single service, port 5173 mapped, volume mount for live reload

---

## 15. Future Considerations

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
11. **Budget & Expense Sheet**: A separate folder/section from Time Sheet for tracking daily expenses (so Accounts can top up funds against them). Explicitly deferred by stakeholder request — for now this stays an **external Excel-based process**: expenses logged daily, then reports and receipts sent to the Accounts team weekly, outside the app. Revisit as an in-app feature post-MVP.
