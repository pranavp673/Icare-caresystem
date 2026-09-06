/**
 * Manage hub client. The four panels of the Manage page in one client:
 *
 *   • Overrides   → RotaSvc (`/api/rota/overrides*`)
 *   • Approvals   → RequestSvc (`/api/requests*`) — leave + overtime ONLY
 *   • Swaps       → SwapSvc (`/api/swaps/team`) — read-only feed here
 *   • Permissions → gateway proxy to AcsSvc (`/api/manage/permissions*`)
 *
 * Swap items are NOT in the approvals list — the FR-TS-05 two-step
 * approval (Team Leader, then Registered Manager) is a Time Sheet
 * action via `approveSwap` below, not a Manage-hub approval. Manage hub
 * and Team Overview both render the swap feed read-only so leadership
 * knows what's in flight.
 */
import { mockResponse } from "../gateway/gatewayClient"
import * as auditService from "../audit/auditService"
import {
  MANAGE_APPROVALS,
  MANAGE_OVERRIDES,
  MANAGE_PERMISSIONS,
  MANAGE_SWAPS,
} from "./manage.mock"
import type {
  ApprovalItem,
  ApproveRequestBody,
  CreateOverrideRequest,
  DeclineRequestBody,
  InviteTeammateRequest,
  InviteTeammateResponse,
  ListApprovalsQuery,
  ListSwapsQuery,
  OverrideDraft,
  OverridesFilter,
  PermissionRow,
  SwapActivity,
  UpdateOverrideRequest,
  UpdateAccessLevelRequest,
} from "./manage.types"

// ── Overrides ──────────────────────────────────────────────────────────

export const listOverrides = (
  status: OverridesFilter = "all"
): Promise<OverrideDraft[]> => {
  // TODO(integration): GET /api/rota/overrides?status=${status}
  const data =
    status === "all"
      ? MANAGE_OVERRIDES
      : MANAGE_OVERRIDES.filter((o) => o.status === status)
  return mockResponse(data)
}

export const createOverride = (
  draft: CreateOverrideRequest
): Promise<OverrideDraft> => {
  // TODO(integration): POST /api/rota/overrides body=CreateOverrideRequest
  return mockResponse<OverrideDraft>({
    id: `ov-${Date.now()}`,
    status: "draft",
    ...draft,
  })
}

export const updateOverride = (
  id: string,
  patch: UpdateOverrideRequest
): Promise<OverrideDraft> => {
  // TODO(integration): PATCH /api/rota/overrides/${id} body=UpdateOverrideRequest
  const current = MANAGE_OVERRIDES.find((o) => o.id === id)
  if (!current) {
    return Promise.reject({
      status: 404,
      code: "NOT_FOUND",
      message: `Override ${id} not found`,
    })
  }
  return mockResponse({ ...current, ...patch })
}

export const markOverrideReady = (id: string): Promise<OverrideDraft> => {
  // TODO(integration): POST /api/rota/overrides/${id}/ready
  const current = MANAGE_OVERRIDES.find((o) => o.id === id)
  if (!current) {
    return Promise.reject({
      status: 404,
      code: "NOT_FOUND",
      message: `Override ${id} not found`,
    })
  }
  return mockResponse<OverrideDraft>({ ...current, status: "ready" })
}

export const discardOverride = (id: string): Promise<void> => {
  // TODO(integration): DELETE /api/rota/overrides/${id}
  void id
  return mockResponse<void>(undefined)
}

// ── Approvals (leave + overtime only — NOT swaps) ──────────────────────

export const listApprovals = (
  query: ListApprovalsQuery = {}
): Promise<ApprovalItem[]> => {
  // TODO(integration): GET /api/requests?kind=${query.kind}&status=${query.status ?? "pending"}&requesterIds=...
  //   The real endpoint spans RequestSvc leave + overtime queues. Swaps
  //   are intentionally NOT included — they're a SwapSvc concern and
  //   surface separately under `listSwaps`. `requesterIds` narrows to a
  //   same-team view when the caller only has base `team.view`.
  let data: ApprovalItem[] = MANAGE_APPROVALS
  if (query.kind) {
    data = data.filter((a) => a.kind === query.kind)
  }
  if (query.requesterIds && query.requesterIds.length > 0) {
    const allowed = new Set(query.requesterIds)
    data = data.filter((a) => allowed.has(a.requesterId))
  }
  // `status` is a no-op in the mock because the fixture only models
  // *pending* items. On the real endpoint this maps to the request state
  // in RequestSvc. We still accept it so call sites don't have to change
  // when we flip to real data.
  if (query.status && query.status !== "pending" && query.status !== "all") {
    // Approved / declined items aren't in the pending-only mock fixture.
    data = []
  }
  return mockResponse(data)
}

export const approveRequest = (
  id: string,
  body: ApproveRequestBody = {}
): Promise<ApprovalItem> => {
  // TODO(integration): POST /api/requests/${id}/approve body={ note }
  const current = MANAGE_APPROVALS.find((a) => a.id === id)
  if (!current) {
    return Promise.reject({
      status: 404,
      code: "NOT_FOUND",
      message: `Approval ${id} not found`,
    })
  }
  void body
  return mockResponse(current)
}

export const declineRequest = (
  id: string,
  body: DeclineRequestBody = {}
): Promise<ApprovalItem> => {
  // TODO(integration): POST /api/requests/${id}/decline body={ note }
  const current = MANAGE_APPROVALS.find((a) => a.id === id)
  if (!current) {
    return Promise.reject({
      status: 404,
      code: "NOT_FOUND",
      message: `Approval ${id} not found`,
    })
  }
  void body
  return mockResponse(current)
}

// ── Swaps (visibility-only) ────────────────────────────────────────────

export const listSwaps = (
  query: ListSwapsQuery = {}
): Promise<SwapActivity[]> => {
  // TODO(integration): GET /api/swaps/team?memberIds=...
  //   Teammates see peer swaps; managers see the full home feed. The
  //   `memberIds` filter matches against either side of the swap.
  let data: SwapActivity[] = MANAGE_SWAPS
  if (query.memberIds && query.memberIds.length > 0) {
    const allowed = new Set(query.memberIds)
    data = data.filter(
      (s) => allowed.has(s.requesterId) || allowed.has(s.counterpartyId)
    )
  }
  return mockResponse(data)
}

export const approveSwap = (
  id: string,
  approvedBy: string
): Promise<SwapActivity> => {
  // TODO(integration): POST /api/swaps/${id}/approve body={ approvedBy }
  //   Server verifies the caller actually holds the permission for
  //   whichever step is currently pending before advancing it.
  const swap = MANAGE_SWAPS.find((s) => s.id === id)
  if (!swap) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Swap not found" })
  }
  if (swap.status === "pending_team_leader") {
    swap.status = "pending_registered_manager"
    swap.when = `Approved by Team Leader — ${approvedBy}`
  } else if (swap.status === "pending_registered_manager") {
    swap.status = "approved"
    swap.when = `Approved by Registered Manager — ${approvedBy}`
  } else {
    return Promise.reject({
      status: 409,
      code: "INVALID_STATE",
      message: `Swap ${id} is not awaiting approval (status: ${swap.status})`,
    })
  }

  void auditService.recordEvent({
    actorId: null,
    actor: approvedBy,
    actorRole: "—",
    action: `Approved shift swap for ${swap.requester.name} ↔ ${swap.counterparty.name}`,
    target: swap.summary,
    home: swap.requester.home,
    domain: "home",
    channel: "rota",
    severity: "notice",
  })

  return mockResponse({ ...swap }, 300)
}

// ── Permissions ────────────────────────────────────────────────────────

export const listPermissions = (): Promise<PermissionRow[]> => {
  // TODO(integration): GET /api/manage/permissions
  return mockResponse(MANAGE_PERMISSIONS)
}

export const updateAccessLevel = (
  id: string,
  req: UpdateAccessLevelRequest
): Promise<PermissionRow> => {
  // TODO(integration): PATCH /api/manage/permissions/${id} body={ accessLevel }
  //   The gateway proxies this to AcsSvc.updatePolicy on the backend.
  const current = MANAGE_PERMISSIONS.find((p) => p.id === id)
  if (!current) {
    return Promise.reject({
      status: 404,
      code: "NOT_FOUND",
      message: `Permission row ${id} not found`,
    })
  }
  return mockResponse({
    ...current,
    accessLevel: req.accessLevel,
    lastChanged: "Just now by you",
  })
}

export const inviteTeammate = (
  req: InviteTeammateRequest
): Promise<InviteTeammateResponse> => {
  // TODO(integration): POST /api/manage/invites body=InviteTeammateRequest
  void req
  return mockResponse<InviteTeammateResponse>({
    inviteId: `inv-${Date.now()}`,
  })
}
