# ICare - Requirements Document

**Project:** ICare Children's Care Home Management System
**Company:** BrightPath Children's Services Ltd
**Version:** 1.0 (Demo / MVP)
**Last updated:** 2026-08-08

---

## 1. Product Overview

ICare is a web-based care home management platform designed for children's residential care providers operating under Ofsted regulation. It provides role-based dashboards, shift management, resident tracking, approval workflows, and audit logging across multiple care homes.

The system serves six tiers of users - from frontline Care Workers to System Administrators - each seeing a tailored view of the data they need.

### 1.1 Business Goals

- Provide real-time visibility into staffing levels, incidents, and compliance across all homes
- Streamline approval workflows for leave, overtime, shift swaps, and overrides
- Maintain a tamper-proof audit trail for Ofsted and regulatory compliance
- Support children's care terminology: Ofsted ratings, Reg 44 visits, LAC reviews, PEP meetings, CAMHS referrals, safeguarding disclosures, placement plans
- Enable cross-home operations (staff swaps, escalations, consolidated reporting)

---

## 2. User Roles & Permissions

### 2.1 Role Hierarchy

| Tier | Role | Scope | Key Capabilities |
|------|------|-------|-----------------|
| 4 | Care Worker | Own schedule, own team | View schedule, submit leave/swap requests, view & comment on young people in care |
| 3 | Team Leader | Own team + manage tab | All Care Worker permissions + team schedule visibility, submit variances, access Manage hub |
| 2 | Deputy Manager | Single home | All Team Leader permissions + approve variances, edit resident records, configure rota/teams, view timesheets, audit log (own home) |
| 1 | Home Manager | One or more homes | All Deputy permissions + staff add/edit, grant permissions, audit export, multi-home scoped audit |
| SM | Senior Manager | All homes | All operational permissions across all homes + system admin permissions (super user for demo) |
| SA | System Admin | System-wide (master data only) | Company/home/work-pattern configuration, create Manager/Deputy accounts. No operational access |

### 2.2 Permission Model

- Flat permission array checked via `useAuth().can(permission)`
- UI hides inaccessible navigation items; `<RequirePermission>` provides defence-in-depth on routes
- `home.view` distinguishes executive-level users (Deputy+) from shift workers
- `system.company.edit` distinguishes Senior Manager from Home Manager/Deputy
- Scope filtering uses `user.homes` array for multi-home managers

### 2.3 Demo Users

| User | Role | Homes |
|------|------|-------|
| Amira O. (u-pro) | Care Worker | Willow House |
| Daniel T. (u-tl) | Team Leader | Willow House |
| Sam Ortega (u-ad) | Deputy Manager | Oakmoor House |
| Priya Amari (u-hm) | Home Manager | Willow House |
| Raj Kapoor (u-sm) | Senior Manager | All homes |
| Alex Chen (u-sys) | System Admin | N/A (master data only) |

---

## 3. Functional Requirements

### 3.1 Dashboard (FR-DASH)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-DASH-01 | Personal dashboard showing weekly hours tracking, upcoming shifts, and pending requests | Care Worker, Team Leader |
| FR-DASH-02 | Executive dashboard showing home health cards with staffing, incidents, escalations, and approval counts | Deputy+, Home Manager, Senior Manager |
| FR-DASH-03 | Single-home managers see "Staff on duty today" and "Today's schedule" panels alongside the home card | Deputy, Home Manager (single home) |
| FR-DASH-04 | Multi-home managers see a grid of all home health cards | Home Manager (multi-home), Senior Manager |
| FR-DASH-05 | Escalation panel showing items raised to the signed-in manager, sorted by severity | Deputy+, Home Manager, Senior Manager |
| FR-DASH-06 | Pending items panel showing leave/overtime/swap/variance requests awaiting action | Deputy+, Home Manager, Senior Manager |
| FR-DASH-07 | Dashboard routing: `home.view` holders see executive dashboard; others see personal dashboard | All |

### 3.2 Team (FR-TEAM)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-TEAM-01 | Request-centric table showing all leave, overtime, and swap requests with requester, counterparty, type, details, and status | All (scope varies) |
| FR-TEAM-02 | Filter by home, request type (Leave/Overtime, Swaps, All), and approval status (Pending default, Approved, All) | All |
| FR-TEAM-03 | Status column shows badge with dropdown arrow for actionable items | Deputy+, Home Manager, Senior Manager |
| FR-TEAM-04 | Dropdown menu offers: Approve, Reject, Ask for details, Forward request | Deputy+, Home Manager, Senior Manager |
| FR-TEAM-05 | Forward request opens modal with team member picker and optional note | Deputy+, Home Manager, Senior Manager |
| FR-TEAM-06 | Cross-home swap visibility: show home name for both requester and counterparty | All |
| FR-TEAM-07 | Team activity feed shown for non-SM roles (Care Worker, Team Lead, Deputy, Home Manager) | Care Worker, Team Lead, Deputy, Home Manager |
| FR-TEAM-08 | KPI stats row: Active this week, Pending swaps, Pending leave, Avg hours filled | Team Lead+ |
| FR-TEAM-09 | Override drafting from team member rows | Deputy+, Home Manager, Senior Manager |

### 3.3 Calendar (FR-CAL)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-CAL-01 | Personal calendar view showing own shifts, leave, swaps, overtime | All |
| FR-CAL-02 | Coverage view showing all shifts and unfilled/vacant slots | Team Lead+ |
| FR-CAL-03 | Day detail panel with per-event breakdown | All |
| FR-CAL-04 | Draft overtime coverage from vacant slot | Deputy+, Home Manager |

### 3.4 Homes (FR-HOME)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-HOME-01 | Grid of care home cards showing name, location, capacity, residents, staffing, coverage %, Ofsted rating | Deputy+, Home Manager, Senior Manager |
| FR-HOME-02 | Home detail modal with occupancy, coverage, activity log | Deputy+, Home Manager, Senior Manager |
| FR-HOME-03 | Activity feed per home: incidents, admissions, discharges, audit notes | Deputy+, Home Manager, Senior Manager |

### 3.5 Residents / Young People (FR-RES)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-RES-01 | List of young people with name, home, keyworker, status, last review | Care Worker+ |
| FR-RES-02 | Resident detail page with profile, service history, and comments | Care Worker+ |
| FR-RES-03 | Threaded comments on resident records (top-level + replies) | Care Worker+ |
| FR-RES-04 | Service history timeline: admissions, placement plans, health reviews, incidents, appointments, notes | Care Worker+ |
| FR-RES-05 | New resident admission form | Deputy+, Home Manager |
| FR-RES-06 | Edit resident records | Deputy+, Home Manager |

### 3.6 Manage Hub (FR-MGR)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-MGR-01 | Tabbed view: All, Overrides, Approvals, Swaps, Permissions | Team Lead+ |
| FR-MGR-02 | Override drafting: reassign shifts with replacement, reason, and time slot | Deputy+, Home Manager |
| FR-MGR-03 | Approval queue: leave and overtime requests with approve/decline actions | Deputy+, Home Manager |
| FR-MGR-04 | Swap feed: observe-only visibility of shift swap requests between team members | Team Lead+ |
| FR-MGR-05 | Permissions panel: grant/revoke access levels per staff member | Home Manager, Senior Manager |

### 3.7 Rota (FR-ROTA)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-ROTA-01 | 24-hour timeline view of team coverage for the current week | Team Lead+ |
| FR-ROTA-02 | Per-day breakdown showing individual staff shifts, overtime, leave, swaps | Team Lead+ |
| FR-ROTA-03 | Night shift continuations displayed correctly across day boundaries | Team Lead+ |
| FR-ROTA-04 | Team roster sidebar showing team groupings and members | Team Lead+ |

### 3.8 Metrics (FR-MET)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-MET-01 | KPI dashboard with coverage, incident, and review metrics | Deputy+, Home Manager, Senior Manager |
| FR-MET-02 | 7-day daily strip showing staff coverage, incidents logged, reviews due | Deputy+, Home Manager, Senior Manager |
| FR-MET-03 | Metric scope scales with role: team-level vs home vs multi-home | Varies by role |

### 3.9 Audit Log (FR-AUD)

| ID | Requirement | Roles |
|----|------------|-------|
| FR-AUD-01 | Append-only event log of all system actions | Deputy+, Home Manager, Senior Manager |
| FR-AUD-02 | Domain tabs: All, Home, Team, People, Professional | Deputy+, Home Manager, Senior Manager |
| FR-AUD-03 | Severity levels: info, notice, warning, critical | Deputy+, Home Manager, Senior Manager |
| FR-AUD-04 | Scoped visibility: own-home for Deputy, all-homes for Manager/SM | Varies |
| FR-AUD-05 | Audit export capability | Home Manager, Senior Manager |

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
| Escalations | SM escalation items | 5 |
| Pending Items | SM pending queue | 4 |
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
| RCW | Residential Care Worker |
| EBD | Emotional and Behavioural Difficulties |
| LAC | Looked After Child |
| PEP | Personal Education Plan |
| CAMHS | Child and Adolescent Mental Health Services |
| Reg 44 | Regulation 44 monthly independent visit |
| Ofsted | Office for Standards in Education, Children's Services and Skills |
| Placement Plan | Document outlining care arrangements for a young person |
| Keyworker | Staff member with primary responsibility for a young person |
| Safeguarding | Protecting children from harm, abuse, and neglect |
