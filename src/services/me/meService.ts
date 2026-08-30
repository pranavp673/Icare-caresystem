/**
 * MeSvc client — the signed-in user's own working hours, upcoming
 * shifts, and own requests. Leave + overtime + withdrawal writes go
 * here. Swap creation lives on `swapService` (peer-to-peer, not
 * approval-based) — MeSvc only aggregates the swap into the request
 * list for display.
 */
import { mockResponse } from "../gateway/gatewayClient"
import {
  MY_SNAPSHOT,
  MY_UPCOMING_SHIFTS,
  MY_REQUESTS,
  SM_SNAPSHOT,
  SM_UPCOMING_SHIFTS,
  SM_REQUESTS,
} from "./me.mock"
import { findMockUser, DEFAULT_MOCK_USER } from "../../auth/user"
import type {
  CreateLeaveRequest,
  CreateOvertimeRequest,
  MyRequest,
  MyShift,
  RequestsFilter,
  SnapshotRange,
  WorkingSnapshot,
} from "./me.types"

/**
 * Return the current mock user. Mirrors `identityService.ts`'s
 * `readStoredUser()` — falls back to `DEFAULT_MOCK_USER` rather than
 * `undefined` when nothing is stored yet (the common case on first
 * load, before any demo-user switch). The old `undefined` fallback was
 * a live crash risk: `getUpcomingShifts` calls `currentMockUser()!`
 * below and dereferences it immediately.
 */
const currentMockUser = () => {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage.getItem("icare.user")
      : null
  if (!stored) return DEFAULT_MOCK_USER
  return findMockUser(stored) ?? DEFAULT_MOCK_USER
}

/**
 * Check if the current user is manager-tier (Mon–Fri 9–5, no rota).
 * Deputy Manager, Registered Manager, RI, and System Admin all have
 * `home.view`. They share the same personal schedule shape — the
 * dashboard scope differs but is handled in the component via `user.homes`.
 */
const isManagerLevel = (): boolean => {
  const u = currentMockUser()
  return !!u && u.permissions.includes("home.view")
}

export const getSnapshot = (
  range: SnapshotRange = "week"
): Promise<WorkingSnapshot> => {
  // TODO(integration): GET /api/me/snapshot?range=${range}
  void range
  return mockResponse(isManagerLevel() ? SM_SNAPSHOT : MY_SNAPSHOT)
}

export const getUpcomingShifts = (limit = 4): Promise<MyShift[]> => {
  // TODO(integration): GET /api/me/upcoming-shifts?limit=${limit}
  if (!isManagerLevel()) {
    return mockResponse(MY_UPCOMING_SHIFTS.slice(0, limit))
  }
  // Manager-level: derive Mon–Fri 9–5 schedule with the user's role & home
  const u = currentMockUser()!
  const roleLabel = u.roleLabel.split("·")[0].trim()
  // RI/System Admin aren't tied to one home (see auth/user.ts) — show
  // Head Office rather than an arbitrary primaryHome.
  const ward = u.homes.length > 1 ? "Head Office" : u.primaryHome.name
  const shifts = SM_UPCOMING_SHIFTS.map((s) => ({
    ...s,
    role: roleLabel,
    ward,
  }))
  return mockResponse(shifts.slice(0, limit))
}

export const getMyRequests = (
  status: RequestsFilter = "open"
): Promise<MyRequest[]> => {
  // TODO(integration): GET /api/me/requests?status=${status}
  const all = isManagerLevel() ? SM_REQUESTS : MY_REQUESTS
  const data =
    status === "all"
      ? all
      : all.filter(
          (r) => r.status === "pending" || r.status === "awaiting_teammate"
        )
  return mockResponse(data)
}

export const submitLeave = (req: CreateLeaveRequest): Promise<MyRequest> => {
  // TODO(integration): POST /api/me/leave body=CreateLeaveRequest
  const created: MyRequest = {
    id: `r-${Date.now()}`,
    kind: "leave",
    summary: req.note
      ? `${req.kind} · ${req.startDate} – ${req.endDate} — ${req.note}`
      : `${req.kind} · ${req.startDate} – ${req.endDate}`,
    when: "Submitted just now",
    status: "pending",
  }
  return mockResponse(created)
}

export const submitOvertime = (
  req: CreateOvertimeRequest
): Promise<MyRequest> => {
  // TODO(integration): POST /api/me/overtime body=CreateOvertimeRequest
  const created: MyRequest = {
    id: `r-${Date.now()}`,
    kind: "overtime",
    summary: `+overtime ${req.start} → ${req.end}${
      req.note ? ` — ${req.note}` : ""
    }`,
    when: "Submitted just now",
    status: "pending",
  }
  return mockResponse(created)
}

export const withdrawRequest = (id: string): Promise<void> => {
  // TODO(integration): DELETE /api/me/requests/${id}
  void id
  return mockResponse<void>(undefined)
}
