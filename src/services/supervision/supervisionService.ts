/**
 * SupervisionSvc client. Confidentiality is enforced here, not in the UI
 * (§3.6.1) — `listSupervision` only ever returns records whose
 * `superviseeId` is in the caller-supplied, already-resolved visible-ids
 * set. Never fetch the full set and filter client-side afterwards.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { SUPERVISION_RECORDS } from "./supervision.mock"
import type { SupervisionRecord, CreateSupervisionRequest } from "./supervision.types"

/**
 * @param visibleIds TeamMember ids the caller is allowed to see, from
 *   `resolveStaffScope` (services/team/staffScope.ts). Only records whose
 *   `superviseeId` is in this set are returned.
 */
export const listSupervision = (visibleIds: string[]): Promise<SupervisionRecord[]> => {
  // TODO(integration): GET /api/supervision — scope enforced server-side
  //   from the caller's identity, this param is illustrative for the mock.
  const allowed = new Set(visibleIds)
  const data = SUPERVISION_RECORDS.filter((r) => allowed.has(r.superviseeId)).sort(
    (a, b) => b.date.localeCompare(a.date)
  )
  return mockResponse(data)
}

export const createSupervisionRecord = (
  req: CreateSupervisionRequest
): Promise<SupervisionRecord> => {
  // TODO(integration): POST /api/supervision body=CreateSupervisionRequest
  //   Server must verify the caller is actually req.supervisorId's
  //   identity (or holds supervision.log for that relationship) before
  //   accepting — the UI gates the action but never trust the client alone.
  return mockResponse<SupervisionRecord>({ id: `sup-${Date.now()}`, ...req }, 300)
}
