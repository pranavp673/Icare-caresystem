/**
 * ResidentsSvc types. The service aggregates per-resident detail across
 * HomeSvc (who lives where) and CareSvc (placement plan, safeguarding,
 * incidents, notes) so the UI doesn't have to fan out on every render.
 */
import type {
  ResidentComment,
  ResidentProfile,
  ResidentStatus,
  ServiceEvent,
  ServiceEventKind,
} from "./residents.mock"

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

export type RequestResidentAccessPayload = {
  residentId: string
  reason: string
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

export type { ResidentComment, ResidentProfile, ResidentStatus, ServiceEvent, ServiceEventKind }
