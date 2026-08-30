/**
 * AccessSvc mock — cross-home access delegation (§2.1.1). Auto-derived
 * from rota entries whose `coveringHomeId` is set (see
 * services/rota/rota.mock.ts) — a grant exists because a shift covers a
 * home other than usual, not the other way round.
 *
 * `staffId` is the `MockUser.id` (`u-*`, auth/user.ts), not the rota
 * mock's own disconnected `s-*` staff id — the grant needs to tie back
 * to an actual login-able persona to be demoable. This is a narrative
 * link to the matching rota entry, not a strict foreign key, consistent
 * with the Rota/TeamMember id-space gap already left unreconciled in
 * Phase 3 (staff-scope cascade) and noted again here.
 */

export type AccessGrantStatus = "active" | "revoked"

export type HomeAccessGrant = {
  id: string
  staffId: string
  staffName: string
  homeId: string
  homeName: string
  /** yyyy-mm-dd, Monday of the covering week. */
  weekStart: string
  /** yyyy-mm-dd, the specific day of the covering shift. */
  shiftDate: string
  shiftNote?: string
  status: AccessGrantStatus
  revokedBy?: string
  revokedReason?: string
  revokedAt?: string
}

/** Monday of the current week, yyyy-mm-dd — mirrors rota.mock.ts's currentMonday(). */
const thisMonday = (): string => {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().slice(0, 10)
}

const thisSunday = (): string => {
  const d = new Date(`${thisMonday()}T00:00:00`)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

export const HOME_ACCESS_GRANTS: HomeAccessGrant[] = [
  {
    id: "hag-1",
    staffId: "u-pro",
    staffName: "Amira O.",
    homeId: "home-oakmoor",
    homeName: "Oakmoor House",
    weekStart: thisMonday(),
    shiftDate: thisSunday(),
    shiftNote: "Covering shift at Oakmoor House",
    status: "active",
  },
]
