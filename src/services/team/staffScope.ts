/**
 * Staff-scope cascade resolver — shared by Time Sheet (FR-TS-08 to -11)
 * and Supervision (FR-SUP-02), which use the identical upward-cascading
 * visibility shape:
 *   rsw                → self only
 *   team_lead          → self + direct reports (supervisorId match)
 *   deputy_manager /
 *   registered_manager → everyone at their home
 *   RI / System Admin  → everyone across every home they have access to
 *
 * Pure function — no service/fetch concerns. Callers fetch `TeamMember[]`
 * via `teamService.listMembers` (or already have it) and pass it in here.
 *
 * Tier is derived from `hasHomeView` + `homes.length` rather than the
 * TeamMember row's `tier` field, because Deputy Manager/Registered
 * Manager/RI/System Admin aren't always TeamMember rows themselves (e.g.
 * Sam Ortega, Deputy Manager, isn't in TEAM_MEMBERS at all) — `home.view`
 * is held exactly by Deputy Manager+ (see auth/roles.ts), so it's a
 * reliable tier signal independent of roster membership.
 */
import type { CurrentUser } from "../../auth/user"
import type { TeamMember } from "./team.mock"

export const resolveStaffScope = (
  user: CurrentUser,
  members: TeamMember[],
  opts: { hasHomeView: boolean }
): TeamMember[] => {
  if (user.homes.length > 1) {
    // RI / System Admin — full visibility across every home they have access to.
    const homeNames = new Set(user.homes.map((h) => h.name))
    return members.filter((m) => homeNames.has(m.home))
  }

  if (opts.hasHomeView) {
    // Deputy Manager / Registered Manager — everyone at their (single) home.
    return members.filter((m) => m.home === user.primaryHome.name)
  }

  const self = members.find((m) => m.id === user.teamMemberId)
  if (self?.tier === "team_lead") {
    return [self, ...members.filter((m) => m.supervisorId === self.id)]
  }
  // RSW (or anyone without a roster row) — self only, if found.
  return self ? [self] : []
}
