/**
 * AccessSvc client. Cross-home access delegation (§2.1.1) — situational
 * awareness for Registered Managers (who's covering at my home from
 * elsewhere this week) plus a safeguarding revoke, not an access gate
 * (see the reframing note in the Phase 5 plan — Common Files and
 * resident data are already universally visible regardless of home).
 */
import { mockResponse } from "../gateway/gatewayClient"
import * as auditService from "../audit/auditService"
import { HOME_ACCESS_GRANTS } from "./access.mock"
import type { HomeAccessGrant, RevokeGrantRequest } from "./access.types"

export const listGrantsForHome = (homeId: string): Promise<HomeAccessGrant[]> => {
  // TODO(integration): GET /api/access-grants?homeId=${homeId}
  const rows = HOME_ACCESS_GRANTS.filter((g) => g.homeId === homeId)
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
    action: `Revoked cross-home access for ${grant.staffName}`,
    target: grant.homeName,
    home: grant.homeName,
    domain: "home",
    channel: "rota",
    severity: "notice",
  })

  return mockResponse({ ...grant }, 300)
}
