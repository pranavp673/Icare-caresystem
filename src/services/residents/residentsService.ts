/**
 * ResidentsSvc client. Per-resident profile, comments, and the 5
 * document-type families from §3.5.1 (plans, incident reports, health
 * records, daily records, activity).
 *
 * Lives at `/api/residents/*` in the real backend; on the backend side it
 * aggregates HomeSvc (resident roster, keyworker) with CareSvc (placement
 * plans, safeguarding, incidents, notes). On the UI side it's a single
 * client so pages don't have to fan out.
 *
 * Resident data is universally visible (§2.2) — no access gate here.
 * Every read/write below calls `auditService.recordEvent` as the
 * compensating control (view AND change are both logged).
 */
import { mockResponse } from "../gateway/gatewayClient"
import { findMockUser, DEFAULT_MOCK_USER } from "../../auth/user"
import * as auditService from "../audit/auditService"
import {
  RESIDENTS,
  RESIDENT_COMMENTS,
} from "./residents.mock"
import {
  PLAN_DOCUMENTS,
  INCIDENT_REPORTS,
  HEALTH_RECORDS,
  DAILY_RECORD_ENTRIES,
  ACTIVITY_ENTRIES,
  PLAN_KIND_LABEL,
  INCIDENT_KIND_LABEL,
  HEALTH_KIND_LABEL,
} from "./residentDocuments.mock"
import type {
  AddActivityRequest,
  AddDailyRecordRequest,
  AddHealthRecordRequest,
  AddIncidentReportRequest,
  ActivityEntry,
  CreateResidentCommentRequest,
  CreateResidentRequest,
  DailyRecordEntry,
  HealthRecord,
  IncidentReport,
  ListResidentsQuery,
  PlanDocument,
  ResidentComment,
  ResidentProfile,
  SavePlanRequest,
  UpdateResidentRequest,
} from "./residents.types"

/** Parse "2026-04-11 14:32" -> epoch for chronological sorting. */
const toEpoch = (at: string) => new Date(at.replace(" ", "T")).getTime()

/**
 * Current mock user, for stamping who did what and the audit trail.
 * Mirrors `identityService.ts`'s `readStoredUser()` — falls back to
 * `DEFAULT_MOCK_USER` rather than `undefined` when nothing is stored
 * yet (the common case on first load, before any demo-user switch).
 */
const currentMockUser = () => {
  const stored =
    typeof window !== "undefined" ? window.localStorage.getItem("icare.user") : null
  if (!stored) return DEFAULT_MOCK_USER
  return findMockUser(stored) ?? DEFAULT_MOCK_USER
}

const logResidentEvent = (action: string, resident: ResidentProfile) => {
  const u = currentMockUser()
  void auditService.recordEvent({
    actorId: u?.teamMemberId ?? u?.id ?? null,
    actor: u?.name ?? "Unknown",
    actorRole: u?.roleLabel ?? "—",
    action,
    target: resident.code,
    home: resident.home,
    domain: "people",
    channel: "care",
  })
}

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
  const found = RESIDENTS.find((c) => c.id === id) ?? null
  if (found) logResidentEvent("Viewed resident record", found)
  return mockResponse(found)
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
  const u = currentMockUser()
  const stamp = new Date()
  const iso = `${stamp.toISOString().slice(0, 10)} ${stamp
    .toTimeString()
    .slice(0, 5)}`
  const created: ResidentComment = {
    id: `rc-${Date.now()}`,
    residentId: req.residentId,
    authorId: u?.teamMemberId ?? u?.id ?? "unknown",
    author: u?.name ?? "Unknown",
    authorRole: u?.roleLabel ?? "—",
    at: iso,
    body: req.body,
    parentId: req.parentId ?? null,
  }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent("Added comment on resident record", resident)
  return mockResponse(created)
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
  logResidentEvent("Edited resident record", updated)
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
  logResidentEvent("Admitted new resident", newResident)
  return mockResponse(newResident, 400)
}

// ── Plans & Assessments ────────────────────────────────────────────

export const listPlans = (residentId: string): Promise<PlanDocument[]> => {
  // TODO(integration): GET /api/residents/${residentId}/plans
  const rows = PLAN_DOCUMENTS.filter((p) => p.residentId === residentId).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )
  return mockResponse(rows)
}

export const savePlan = (req: SavePlanRequest): Promise<PlanDocument> => {
  // TODO(integration): POST /api/residents/${req.residentId}/plans body=SavePlanRequest
  const u = currentMockUser()
  const doc: PlanDocument = {
    id: `pd-${Date.now()}`,
    residentId: req.residentId,
    kind: req.kind,
    content: req.content,
    updatedBy: u?.name ?? "Unknown",
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent(`Updated ${PLAN_KIND_LABEL[req.kind]}`, resident)
  return mockResponse(doc, 300)
}

// ── Incidents & Reports ────────────────────────────────────────────

export const listIncidentReports = (residentId: string): Promise<IncidentReport[]> => {
  // TODO(integration): GET /api/residents/${residentId}/incident-reports
  const rows = INCIDENT_REPORTS.filter((r) => r.residentId === residentId).sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt)
  )
  return mockResponse(rows)
}

export const addIncidentReport = (req: AddIncidentReportRequest): Promise<IncidentReport> => {
  // TODO(integration): POST /api/residents/${req.residentId}/incident-reports body=AddIncidentReportRequest
  const u = currentMockUser()
  const report: IncidentReport = { id: `ir-${Date.now()}`, reportedBy: u?.name ?? "Unknown", ...req }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent(`Logged ${INCIDENT_KIND_LABEL[req.kind]}`, resident)
  return mockResponse(report, 300)
}

// ── Health & Reviews ────────────────────────────────────────────────

export const listHealthRecords = (residentId: string): Promise<HealthRecord[]> => {
  // TODO(integration): GET /api/residents/${residentId}/health-records
  const rows = HEALTH_RECORDS.filter((r) => r.residentId === residentId).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  return mockResponse(rows)
}

export const addHealthRecord = (req: AddHealthRecordRequest): Promise<HealthRecord> => {
  // TODO(integration): POST /api/residents/${req.residentId}/health-records body=AddHealthRecordRequest
  const u = currentMockUser()
  const record: HealthRecord = { id: `hr-${Date.now()}`, loggedBy: u?.name ?? "Unknown", ...req }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent(`Logged ${HEALTH_KIND_LABEL[req.kind]}`, resident)
  return mockResponse(record, 300)
}

// ── Daily Record ────────────────────────────────────────────────────

export const listDailyRecords = (residentId: string): Promise<DailyRecordEntry[]> => {
  // TODO(integration): GET /api/residents/${residentId}/daily-records
  const rows = DAILY_RECORD_ENTRIES.filter((r) => r.residentId === residentId).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  return mockResponse(rows)
}

export const addDailyRecord = (req: AddDailyRecordRequest): Promise<DailyRecordEntry> => {
  // TODO(integration): POST /api/residents/${req.residentId}/daily-records body=AddDailyRecordRequest
  const u = currentMockUser()
  const entry: DailyRecordEntry = { id: `dr-${Date.now()}`, loggedBy: u?.name ?? "Unknown", ...req }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent("Logged daily record entry", resident)
  return mockResponse(entry, 300)
}

// ── Activity ────────────────────────────────────────────────────────

export const listActivity = (residentId: string): Promise<ActivityEntry[]> => {
  // TODO(integration): GET /api/residents/${residentId}/activity
  const rows = ACTIVITY_ENTRIES.filter((r) => r.residentId === residentId).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  return mockResponse(rows)
}

export const addActivity = (req: AddActivityRequest): Promise<ActivityEntry> => {
  // TODO(integration): POST /api/residents/${req.residentId}/activity body=AddActivityRequest
  const u = currentMockUser()
  const entry: ActivityEntry = { id: `ac-${Date.now()}`, loggedBy: u?.name ?? "Unknown", ...req }
  const resident = RESIDENTS.find((r) => r.id === req.residentId)
  if (resident) logResidentEvent("Logged activity entry", resident)
  return mockResponse(entry, 300)
}
