/**
 * Staff-scope cascade resolver — shared by Time Sheet (FR-TS-08 to -11)
 * and Supervision (FR-SUP-02/-03), which use the identical upward-cascading
 * visibility shape:
 *   rsw                → self only
 *   team_lead          → self + direct reports (supervisorId match)
 *   deputy_manager     → everyone at their home EXCEPT other
 *                         deputy_manager/registered_manager rows —
 *                         "employees under them" (FR-TS-09), never a peer
 *                         or the Registered Manager's own record
 *                         (FR-SUP-02: "never visible to peers")
 *   registered_manager → everyone at their home, no exceptions (FR-TS-08)
 *   RI / System Admin  → everyone across every home they have access to
 *
 * Pure function — no service/fetch concerns. Callers fetch `TeamMember[]`
 * via `teamService.listMembers` (or already have it) and pass it in here.
 *
 * Tier is derived from `hasHomeView` + `homes.length` + a caller-supplied
 * `isRegisteredManagerTier` flag rather than the TeamMember row's `tier`
 * field, because Deputy Manager/Registered Manager/RI/System Admin aren't
 * always TeamMember rows themselves (e.g. Sam Ortega, Deputy Manager,
 * isn't in TEAM_MEMBERS at all) — `home.view` is held exactly by Deputy
 * Manager+ (see auth/roles.ts), and `payroll.view` is held exactly by
 * Registered Manager (+ System Admin), so both are reliable tier signals
 * independent of roster membership.
 */
import type { CurrentUser } from "../../auth/user"
import type { TeamMember } from "./team.mock"

export const resolveStaffScope = (
  user: CurrentUser,
  members: TeamMember[],
  opts: { hasHomeView: boolean; isRegisteredManagerTier: boolean }
): TeamMember[] => {
  if (user.homes.length > 1) {
    // RI / System Admin — full visibility across every home they have access to.
    const homeNames = new Set(user.homes.map((h) => h.name))
    return members.filter((m) => homeNames.has(m.home))
  }

  if (opts.hasHomeView) {
    const atHome = members.filter((m) => m.home === user.primaryHome.name)
    if (opts.isRegisteredManagerTier) {
      // Registered Manager — everyone at their home (FR-TS-08).
      return atHome
    }
    // Deputy Manager — everyone under them, not the Registered Manager's
    // own record (FR-TS-09; FR-SUP-02 "never visible to peers").
    return atHome.filter((m) => m.tier === "team_lead" || m.tier === "rsw")
  }

  const self = members.find((m) => m.id === user.teamMemberId)
  if (self?.tier === "team_lead") {
    return [self, ...members.filter((m) => m.supervisorId === self.id)]
  }
  // RSW (or anyone without a roster row) — self only, if found.
  return self ? [self] : []
}
