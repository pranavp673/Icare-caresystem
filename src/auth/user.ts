import type { Permission } from "./roles"

/**
 * The signed-in user. Matches the claims payload the backend will emit on
 * login — everything a page needs to render before any service call.
 *
 * The user's *permissions* come separately via `GET /api/me/permissions`
 * and live in `AuthContext.permissions`, NOT on this object. `CurrentUser`
 * is pure identity + scope metadata; it carries no authorisation state so
 * the auth model stays flat and testable.
 *
 * `teamId` identifies the working team the user belongs to. For an RSW
 * it's the cluster of teammates they'd swap shifts with; for a Team
 * Leader it's the team they run; for a Registered Manager it's the
 * primary team at their home (managers see across teams via
 * `team.view.all`, so the team_id is only used for "default to my team"
 * landings). RI and System Admin don't belong to any single team — their
 * `teamId` is the empty string, and scoping helpers treat them as "see
 * everything in scope".
 */
export type OrgRef = {
  id: string
  name: string
}

export type HomeRef = {
  id: string
  name: string
}

export type CurrentUser = {
  id: string
  name: string
  initials: string
  /** Display-only label from the backend (e.g. "RSW · 3 years"). */
  roleLabel: string
  /** Organisation the user belongs to. */
  org: OrgRef
  /** Primary home for default context. */
  primaryHome: HomeRef
  /** All homes the user has permission to act inside. */
  homes: HomeRef[]
  /** Working-team identifier (see TeamMember.teamId in team.mock). */
  teamId: string
}

/**
 * Mock-phase user bank.
 *
 * Each entry pairs identity with the *flat* permission set the backend
 * (AcsSvc) would resolve for that user. The `permissions` field lives
 * here — not on `CurrentUser` — because `identityService.getMyPermissions`
 * reads it separately (mirroring the real two-call bootstrap).
 *
 * Users can be switched at runtime via the dev-only user switcher in the
 * sidebar so the prototype can demonstrate RBAC without a real backend.
 *
 * Team assignments mirror `TEAM_MEMBERS` in `services/team/team.mock.ts`:
 *   • team-willow-day — Amira (HCA), Daniel (lead), Tomás, Priya (mgr),
 *     Hiroki, Beatrice.
 *   • team-oakmoor — Clara, Finn.
 * RI and System Admin are not part of any single team and carry an empty teamId.
 *
 * Role hierarchy (Tier 1 = broadest access):
 *   1. System Admin       — full, unrestricted access (system + operational)
 *   2. RI                 — Responsible Individual; all-homes view/oversight, no write access
 *   3. Registered Manager / Deputy Manager — full operational authority, single home
 *   4. Team Leader         — own team
 *   5. RSW                 — Resident Support Worker; own schedule
 */
export type MockUser = CurrentUser & { permissions: Permission[] }

/** Shared org — all demo users belong to the same organisation. */
const BRIGHTPATH_ORG: OrgRef = { id: "org-bp", name: "BrightPath Children's Services" }

const HOME_WILLOW: HomeRef = { id: "home-willow", name: "Willow House" }
const HOME_OAKMOOR: HomeRef = { id: "home-oakmoor", name: "Oakmoor House" }
const HOME_ROWAN: HomeRef = { id: "home-rowan", name: "Rowan Lodge" }

export const MOCK_USERS: MockUser[] = [
  /**
   * Tier 5 — RSW (Amira O.)
   * Self-service only: own schedule, own timesheet, submit own variances,
   * read-only on residents they care for, write comments on residents.
   */
  {
    id: "u-pro",
    name: "Amira O.",
    initials: "AO",
    roleLabel: "RSW · 3 years",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW],
    teamId: "team-willow-day",
    permissions: [
      "me.view",
      "leave.request",
      "swap.request",
      "variance.submit",
      "team.view",
      "residents.view",
      "residents.comments.write",
      "commonFiles.view",
      "commonFiles.log",
    ],
  },

  /**
   * Tier 4 — Team Leader (Daniel T.)
   * Manages own team: can see all team members' schedule, submit variances
   * on behalf of team members, view (but not approve) team timesheets,
   * read and comment on residents. No audit log or manage hub access.
   */
  {
    id: "u-tl",
    name: "Daniel T.",
    initials: "DT",
    roleLabel: "Team Leader · Willow Ward",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW],
    teamId: "team-willow-day",
    permissions: [
      "me.view",
      "leave.request",
      "swap.request",
      "variance.submit",
      "team.view",
      "team.view.all",
      "team.analytics.view",
      "manage.view",
      "residents.view",
      "residents.comments.write",
      "commonFiles.view",
      "commonFiles.log",
    ],
  },

  /**
   * Tier 3 — Deputy Manager (Sam Ortega)
   * Full operational access scoped to their assigned home. Can approve
   * variances, view all timesheets, edit residents, configure teams and
   * rota pattern. Same tier as Registered Manager; the exact set of
   * capabilities Deputy Manager is excluded from (relative to Registered
   * Manager) is still an open question upstream — this permission set is
   * carried forward unchanged from before the rename.
   */
  {
    id: "u-ad",
    name: "Sam Ortega",
    initials: "SO",
    roleLabel: "Deputy Manager · Willow House",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW],
    teamId: "",
    permissions: [
      "me.view",
      "leave.request",
      "variance.submit",
      "variance.approve",
      "team.view",
      "team.view.all",
      "team.analytics.view",
      "home.view",
      "home.analytics.view",
      "people.view",
      "manage.view",
      "approvals.review",
      "rota.publish",
      "rota.config.edit",
      "teams.edit",
      "residents.view",
      "residents.edit",
      "residents.comments.write",
      "timesheets.view.all",
      "audit.view",
      "audit.view.all",
      "commonFiles.view",
      "commonFiles.log",
    ],
  },

  /**
   * Tier 3 — Registered Manager (Priya Amari)
   * Full operational authority for Willow House. Can manage teams, approve
   * variances, export audit logs, and grant permissions within her home.
   * Works Mon–Fri 9–5 — not on shift rota. Always single-home — Registered
   * Manager no longer spans multiple homes (resolved: only RI and System
   * Admin do). Cannot touch system-level master data — that is Admin's
   * domain.
   */
  {
    id: "u-hm",
    name: "Priya Amari",
    initials: "PA",
    roleLabel: "Registered Manager · Willow House",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW],
    teamId: "team-willow-day",
    permissions: [
      "me.view",
      "leave.request",
      "variance.submit",
      "variance.approve",
      "team.view",
      "team.view.all",
      "team.overrideAssign",
      "team.analytics.view",
      "home.view",
      "home.analytics.view",
      "people.view",
      "people.edit",
      "staff.add",
      "manage.view",
      "approvals.review",
      "permissions.grant",
      "rota.publish",
      "rota.config.edit",
      "teams.edit",
      "residents.view",
      "residents.edit",
      "residents.comments.write",
      "timesheets.view.all",
      "audit.view",
      "audit.view.all",
      "audit.export",
      "commonFiles.view",
      "commonFiles.log",
      "commonFiles.edit",
    ],
  },

  /**
   * Tier 2 — RI / Responsible Individual (Raj Kapoor)
   * Cross-home oversight, not an operational super user. Sees every home's
   * staffing, residents, timesheets, and audit trail — including export,
   * for company-wide incident/accident reporting — but holds no write or
   * approval permissions and no system.* master-data access. RI and System
   * Admin sit outside the "operational chain" that creates day-to-day
   * records (leave/variance/override/residents edits); they view and
   * oversee rather than act.
   */
  {
    id: "u-sm",
    name: "Raj Kapoor",
    initials: "RK",
    roleLabel: "RI · All Homes",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW, HOME_OAKMOOR, HOME_ROWAN],
    teamId: "",
    permissions: [
      // Personal — no swap.request (Mon–Fri 9–5, not on rota)
      "me.view",
      "leave.request",
      "variance.submit",
      // Team — view only
      "team.view",
      "team.view.all",
      "team.analytics.view",
      // Home / operational — view only
      "home.view",
      "home.analytics.view",
      "people.view",
      // Residents — view only, no edit/comment (outside the operational chain)
      "residents.view",
      // Timesheets — view only
      "timesheets.view.all",
      // Management — view only, no approve/grant/publish/edit
      "manage.view",
      // Audit — full view + export, for company-wide oversight reporting
      "audit.view",
      "audit.view.all",
      "audit.export",
      // Common Files — view only, cannot log entries (outside the operational chain)
      "commonFiles.view",
      // No system.* — that's System Admin's domain now
    ],
  },

  /**
   * Tier 1 — System Admin (Alex Chen)
   * Full, unrestricted access — every permission in the system. Configures
   * master data (company, homes, work patterns, Manager/Deputy accounts)
   * AND holds full operational access across all homes, so they can act as
   * the top-level control point for cross-home access delegation and
   * generate reports for RI/senior stakeholders. The organisation's true
   * super user.
   */
  {
    id: "u-sys",
    name: "Alex Chen",
    initials: "AC",
    roleLabel: "System Admin",
    org: BRIGHTPATH_ORG,
    primaryHome: HOME_WILLOW,
    homes: [HOME_WILLOW, HOME_OAKMOOR, HOME_ROWAN],
    teamId: "",
    permissions: [
      "me.view",
      "leave.request",
      "swap.request",
      "variance.submit",
      "team.view",
      "team.view.all",
      "team.overrideAssign",
      "team.analytics.view",
      "home.view",
      "home.analytics.view",
      "people.view",
      "people.edit",
      "staff.add",
      "residents.view",
      "residents.edit",
      "residents.comments.write",
      "timesheets.view.all",
      "variance.approve",
      "manage.view",
      "approvals.review",
      "permissions.grant",
      "rota.publish",
      "rota.config.edit",
      "teams.edit",
      "audit.view",
      "audit.view.all",
      "audit.export",
      "commonFiles.view",
      "commonFiles.log",
      "commonFiles.edit",
      "system.company.edit",
      "system.home.edit",
      "system.workpatterns.edit",
      "system.staff.createSenior",
    ],
  },
]

/** Lookup helper for mock-phase identity resolution. */
export const DEFAULT_MOCK_USER = MOCK_USERS[5] // Alex — System Admin (super user)
export const findMockUser = (id: string): MockUser | undefined =>
  MOCK_USERS.find((u) => u.id === id)
