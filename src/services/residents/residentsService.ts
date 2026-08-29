/**
 * ResidentsSvc client. Per-resident profile, comments, and service history.
 *
 * Lives at `/api/residents/*` in the real backend; on the backend side it
 * aggregates HomeSvc (resident roster, keyworker) with CareSvc (placement
 * plans, safeguarding, incidents, notes). On the UI side it's a single
 * client so pages don't have to fan out.
 */
import { mockResponse } from "../gateway/gatewayClient"
import {
  RESIDENTS,
  RESIDENT_COMMENTS,
  RESIDENT_SERVICE_HISTORY,
} from "./residents.mock"
import type {
  CreateResidentCommentRequest,
  CreateResidentRequest,
  ListResidentsQuery,
  RequestResidentAccessPayload,
  ResidentComment,
  ResidentProfile,
  ServiceEvent,
  UpdateResidentRequest,
} from "./residents.types"

/** Parse "2026-04-11 14:32" -> epoch for chronological sorting. */
const toEpoch = (at: string) => new Date(at.replace(" ", "T")).getTime()

export const listResidents = (
  query: ListResidentsQuery = {}
): Promise<ResidentProfile[]> => {
  // TODO(integration): GET /api/residents?homes=&status=&q=
  let list: ResidentProfile[] = RESIDENTS
  if (query.homes && query.homes.length > 0) {
    const set = new Set(query.homes)
    list = list.filter((c) => set.has(c.home))
  }
  if (query.status) list = list.filter((c) => c.status === query.status)
  if (query.ownerId) {
    list = list.filter(
      (c) => c.primaryOwnerId === query.ownerId || c.assignedOwnerId === query.ownerId
    )
  }
  if (query.q) {
    const needle = query.q.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.code.toLowerCase().includes(needle) ||
        c.keyworker.toLowerCase().includes(needle)
    )
  }
  return mockResponse(list)
}

export const getResident = (id: string): Promise<ResidentProfile | null> => {
  // TODO(integration): GET /api/residents/${id}
  return mockResponse(RESIDENTS.find((c) => c.id === id) ?? null)
}

export const listResidentComments = (
  residentId: string
): Promise<ResidentComment[]> => {
  // TODO(integration): GET /api/residents/${residentId}/comments
  const rows = RESIDENT_COMMENTS.filter((c) => c.residentId === residentId).sort(
    (a, b) => toEpoch(b.at) - toEpoch(a.at)
  )
  return mockResponse(rows)
}

export const addResidentComment = (
  req: CreateResidentCommentRequest
): Promise<ResidentComment> => {
  // TODO(integration): POST /api/residents/${residentId}/comments
  const stamp = new Date()
  const iso = `${stamp.toISOString().slice(0, 10)} ${stamp
    .toTimeString()
    .slice(0, 5)}`
  const created: ResidentComment = {
    id: `rc-${Date.now()}`,
    residentId: req.residentId,
    authorId: "u-me",
    author: "You",
    authorRole: "—",
    at: iso,
    body: req.body,
    parentId: req.parentId ?? null,
  }
  return mockResponse(created)
}

export const requestResidentAccess = (
  req: RequestResidentAccessPayload
): Promise<{ status: "sent" }> => {
  // TODO(integration): POST /api/residents/${residentId}/access-request body={ reason }
  void req
  return mockResponse({ status: "sent" as const })
}

export const listResidentHistory = (
  residentId: string
): Promise<ServiceEvent[]> => {
  // TODO(integration): GET /api/residents/${residentId}/history
  const rows = RESIDENT_SERVICE_HISTORY.filter((s) => s.residentId === residentId)
    .slice()
    .sort((a, b) => toEpoch(b.at) - toEpoch(a.at))
  return mockResponse(rows)
}

export const updateResident = (
  id: string,
  req: UpdateResidentRequest
): Promise<ResidentProfile> => {
  // TODO(integration): PATCH /api/residents/${id} body=UpdateResidentRequest
  const existing = RESIDENTS.find((r) => r.id === id)
  if (!existing) return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Resident not found" })

  const updated: ResidentProfile = {
    ...existing,
    ...(req.name !== undefined && {
      name: req.name,
      initials: req.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    }),
    ...(req.dateOfBirth !== undefined && {
      dateOfBirth: req.dateOfBirth,
      age: Math.floor(
        (Date.now() - new Date(req.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      ),
    }),
    ...(req.home !== undefined && { home: req.home }),
    ...(req.roomNumber !== undefined && { roomNumber: req.roomNumber }),
    ...(req.keyworker !== undefined && { keyworker: req.keyworker }),
    ...(req.status !== undefined && { status: req.status }),
    ...(req.summary !== undefined && { summary: req.summary }),
    primaryContact: {
      name: req.primaryContactName ?? existing.primaryContact.name,
      relation: req.primaryContactRelation ?? existing.primaryContact.relation,
      phone: req.primaryContactPhone ?? existing.primaryContact.phone,
    },
  }
  return mockResponse(updated, 300)
}

export const createResident = (
  req: CreateResidentRequest
): Promise<ResidentProfile> => {
  // TODO(integration): POST /api/residents body=CreateResidentRequest
  const initials = req.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const newResident: ResidentProfile = {
    id: `s-${Date.now()}`,
    code: `A-${Math.floor(1000 + Math.random() * 9000)}`,
    name: req.name,
    initials,
    home: req.home,
    keyworker: req.keyworker,
    primaryOwnerId: "u-me",
    assignedOwnerId: "u-me",
    lastReviewDays: 0,
    status: "new",
    dateOfBirth: req.dateOfBirth,
    age: Math.floor(
      (Date.now() - new Date(req.dateOfBirth).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    ),
    primaryContact: {
      name: req.primaryContactName,
      relation: req.primaryContactRelation,
      phone: req.primaryContactPhone,
    },
    admissionDate: new Date().toISOString().slice(0, 10),
    roomNumber: req.roomNumber,
    summary: req.summary,
  }
  return mockResponse(newResident, 400)
}
