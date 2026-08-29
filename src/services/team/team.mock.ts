/**
 * TeamSvc mock — source of truth for `TeamMember`, `TeamStat`, and the
 * `TEAM_MEMBERS` / `TEAM_STATS` seed rows. Lives inside the services
 * tree so `teamService` can own its dependencies without reaching back
 * into `src/pages/Team/*`.
 *
 * There is no matching `pages/Team/team.mock.ts` shim — that file was
 * deleted during the boundary cleanup because nothing on the page side
 * imported from it directly (TeamOverview imports types via the service
 * types barrel and data via `teamService`).
 *
 * Team identifiers
 * ────────────────
 * Each member carries a `teamId` so the service layer can scope who the
 * signed-in user is allowed to see. For the mock we use two teams:
 *   • team-willow-day — Willow House daytime cluster
 *     (Amira, Daniel, Tomás, Priya, Hiroki, Beatrice)
 *   • team-oakmoor   — Oakmoor House (Clara, Finn)
 * A third team can be added for Rowan Lodge when the mock grows, but
 * the same fields cover every scope decision today.
 */
export type StaffTier = "rsw" | "team_lead" | "deputy_manager" | "registered_manager"

export type TeamMember = {
  id: string
  name: string
  initials: string
  role: string
  home: string
  /** Working team — used by same-team scope filters. */
  teamId: string
  /**
   * Filterable role tier — added for the Time Sheet/Supervision staff-scope
   * cascade (see services/team/staffScope.ts). Distinct from `role`, which
   * is a free-text display string (e.g. "Senior RSW · 6y") that can't be
   * reliably filtered on.
   */
  tier: StaffTier
  /** Who conducts this person's supervision (their direct manager's TeamMember id, if modeled). */
  supervisorId?: string
  hoursThisWeek: number
  hoursRequired: number
  leavesPending: number
  swapsPending: number
  status: "on_shift" | "off" | "on_leave"
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "Amira O.",
    initials: "AO",
    role: "RSW · 3y",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "rsw",
    supervisorId: "tm-2",
    hoursThisWeek: 24,
    hoursRequired: 40,
    leavesPending: 0,
    swapsPending: 1,
    status: "on_shift",
  },
  {
    id: "tm-2",
    name: "Daniel T.",
    initials: "DT",
    // Was mistagged "RSW · 4y" — Daniel is the Team Leader persona (u-tl)
    // everywhere else in the app. Fixed here since the staff-scope cascade
    // depends on this being correct.
    role: "Team Leader · 4y",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "team_lead",
    supervisorId: "tm-5",
    hoursThisWeek: 32,
    hoursRequired: 40,
    leavesPending: 1,
    swapsPending: 0,
    status: "on_shift",
  },
  {
    id: "tm-3",
    name: "Clara F.",
    initials: "CF",
    role: "RSW · 1y",
    home: "Oakmoor House",
    teamId: "team-oakmoor",
    tier: "rsw",
    // No Team Leader modeled at Oakmoor yet — pre-existing gap, not fixed in this phase.
    hoursThisWeek: 16,
    hoursRequired: 32,
    leavesPending: 0,
    swapsPending: 1,
    status: "off",
  },
  {
    id: "tm-4",
    name: "Tomás R.",
    initials: "TR",
    role: "Senior RSW · 6y",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "rsw",
    supervisorId: "tm-2",
    hoursThisWeek: 40,
    hoursRequired: 40,
    leavesPending: 1,
    swapsPending: 0,
    status: "on_shift",
  },
  {
    id: "tm-5",
    name: "Priya A.",
    initials: "PA",
    role: "Registered Manager",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "registered_manager",
    // Supervised by RI (Raj Kapoor), who isn't a TeamMember row.
    hoursThisWeek: 36,
    hoursRequired: 40,
    leavesPending: 0,
    swapsPending: 0,
    status: "on_shift",
  },
  {
    id: "tm-6",
    name: "Finn O.",
    initials: "FO",
    role: "RSW · 2y",
    home: "Oakmoor House",
    teamId: "team-oakmoor",
    tier: "rsw",
    hoursThisWeek: 0,
    hoursRequired: 40,
    leavesPending: 0,
    swapsPending: 0,
    status: "on_leave",
  },
  {
    id: "tm-7",
    name: "Hiroki T.",
    initials: "HT",
    role: "RSW · 5y",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "rsw",
    supervisorId: "tm-2",
    hoursThisWeek: 28,
    hoursRequired: 40,
    leavesPending: 0,
    swapsPending: 1,
    status: "off",
  },
  {
    id: "tm-8",
    name: "Beatrice M.",
    initials: "BM",
    role: "RSW · 2y",
    home: "Willow House",
    teamId: "team-willow-day",
    tier: "rsw",
    supervisorId: "tm-2",
    hoursThisWeek: 24,
    hoursRequired: 40,
    leavesPending: 0,
    swapsPending: 0,
    status: "off",
  },
]

export type TeamStat = {
  label: string
  value: string
  delta?: string
  tone: "info" | "success" | "warning" | "danger"
}

export const TEAM_STATS: TeamStat[] = [
  { label: "Active this week", value: "7 / 8", delta: "1 on leave", tone: "info" },
  { label: "Pending swaps", value: "3", delta: "2 need decision", tone: "warning" },
  { label: "Pending leave", value: "2", delta: "0 urgent", tone: "info" },
  { label: "Avg hours filled", value: "84%", delta: "+4% vs last wk", tone: "success" },
]
