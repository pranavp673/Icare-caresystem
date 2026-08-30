/**
 * AccessSvc client. Cross-home access delegation (§2.1.1) — situational
 * awareness for Registered Managers plus a safeguarding revoke, not an
 * access gate (see the reframing note in the Phase 5 plan — Common
 * Files and resident data are already universally visible regardless
 * of home).
 *
 * `listGrantsFromHome` shows "your staff covering elsewhere this week"
 * — the manager whose staff member is away, not the home being covered.
 * Only Willow has a Registered/Deputy Manager persona in this demo, so
 * "who's covering AT my home" would never have anyone to show it to
 * (Oakmoor/Rowan have no manager login) — this framing is the one that's
 * actually demoable, and still a legitimate piece of situational
 * awareness (a manager knowing where their own people are).
 */
import { mockResponse } from "../gateway/gatewayClient"
import * as auditService from "../audit/auditService"
import { HOME_ACCESS_GRANTS } from "./access.mock"
import type { HomeAccessGrant, RevokeGrantRequest } from "./access.types"

export const listGrantsFromHome = (fromHomeId: string): Promise<HomeAccessGrant[]> => {
  // TODO(integration): GET /api/access-grants?fromHomeId=${fromHomeId}
  const rows = HOME_ACCESS_GRANTS.filter((g) => g.fromHomeId === fromHomeId)
  return mockResponse(rows)
}

export const listMyGrants = (staffId: string): Promise<HomeAccessGrant[]> => {
  // TODO(integration): GET /api/access-grants?staffId=${staffId}
  const rows = HOME_ACCESS_GRANTS.filter((g) => g.staffId === staffId && g.status === "active")
  return mockResponse(rows)
}

export const revokeGrant = (
  id: string,
  req: RevokeGrantRequest
): Promise<HomeAccessGrant> => {
  // TODO(integration): POST /api/access-grants/${id}/revoke body=RevokeGrantRequest
  const grant = HOME_ACCESS_GRANTS.find((g) => g.id === id)
  if (!grant) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Access grant not found" })
  }
  grant.status = "revoked"
  grant.revokedBy = req.revokedBy
  grant.revokedReason = req.revokedReason
  grant.revokedAt = new Date().toISOString().slice(0, 10)

  void auditService.recordEvent({
    actorId: null,
    actor: req.revokedBy,
    actorRole: "—",
    action: `Revoked cross-home access for ${grant.staffName} at ${grant.homeName}`,
    target: grant.staffName,
    // Tagged with the revoking manager's home (grant.fromHomeId), not the
    // covered home — the manager's own audit view is scoped to their home.
    home: grant.fromHomeName,
    domain: "home",
    channel: "rota",
    severity: "notice",
  })

  return mockResponse({ ...grant }, 300)
}
