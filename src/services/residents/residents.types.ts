/**
 * ResidentsSvc types. The service aggregates per-resident detail across
 * HomeSvc (who lives where) and CareSvc (placement plan, safeguarding,
 * incidents, notes) so the UI doesn't have to fan out on every render.
 *
 * Resident data is universally visible (§2.2) — no owner/keyworker
 * gating here or on the page. `RequestResidentAccessPayload` and the
 * flat `ServiceEvent` history feed it used to gate access to are gone,
 * replaced by the 5 document-type families below (§3.5.1) plus an
 * audit trail (auditService.recordEvent) as the compensating control.
 */
import type { ResidentComment, ResidentProfile, ResidentStatus } from "./residents.mock"
import type {
  PlanKind,
  PlanDocument,
  IncidentReportKind,
  IncidentReport,
  HealthRecordKind,
  HealthRecord,
  DailyRecordEntry,
  ActivityEntry,
} from "./residentDocuments.mock"

export type ListResidentsQuery = {
  /** Restrict to residents living at any of these home names. */
  homes?: string[]
  /** Status chip filter. Undefined = all statuses. */
  status?: ResidentStatus
  /** Free-text search across name / code / keyworker. */
  q?: string
  /** Show only residents where the caller is primary or assigned owner. */
  ownerId?: string
}

export type CreateResidentCommentRequest = {
  residentId: string
  body: string
  /** When replying to an existing comment. */
  parentId?: string
}

/** Payload for creating a new resident. */
export type CreateResidentRequest = {
  name: string
  dateOfBirth: string
  home: string
  roomNumber: string
  keyworker: string
  primaryContactName: string
  primaryContactRelation: string
  primaryContactPhone: string
  summary: string
}

/** Payload for admin-level updates to an existing resident record. */
export type UpdateResidentRequest = {
  name?: string
  dateOfBirth?: string
  home?: string
  roomNumber?: string
  keyworker?: string
  status?: ResidentStatus
  primaryContactName?: string
  primaryContactRelation?: string
  primaryContactPhone?: string
  summary?: string
}

export type SavePlanRequest = {
  residentId: string
  kind: PlanKind
  content: string
}

export type AddIncidentReportRequest = {
  residentId: string
  kind: IncidentReportKind
  occurredAt: string
  description: string
  severity: IncidentReport["severity"]
}

export type AddHealthRecordRequest = {
  residentId: string
  kind: HealthRecordKind
  date: string
  notes: string
  attendees?: string[]
}

export type AddDailyRecordRequest = {
  residentId: string
  date: string
  dailyLog: string
  dailyEducation: string
  reflective: string
}

export type AddActivityRequest = {
  residentId: string
  date: string
  description: string
}

export type {
  ResidentComment,
  ResidentProfile,
  ResidentStatus,
  PlanKind,
  PlanDocument,
  IncidentReportKind,
  IncidentReport,
  HealthRecordKind,
  HealthRecord,
  DailyRecordEntry,
  ActivityEntry,
}
