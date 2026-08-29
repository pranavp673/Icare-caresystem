/**
 * CommonFilesSvc types — request/response DTOs. See commonFiles.mock.ts
 * for the domain types (`CommonFileDoc`, `CheckEntry`, `MeetingRecord`,
 * `HandoverEntry`) and seed data.
 */
import type { CheckType, MeetingKind } from "./commonFiles.mock"

export type UpdateStatementOfPurposeRequest = {
  homeRegisteredType: string
  servicesProvided: string
}

export type LogCheckRequest = {
  homeId: string
  checkType: CheckType
  notes?: string
}

export type AddMeetingRequest = {
  homeId: string
  kind: MeetingKind
  date: string
  attendees: string[]
  notes: string
}

export type AddHandoverRequest = {
  homeId: string
  shift: string
  date: string
  notes: string
}

export type {
  CommonFileDoc,
  CheckCadence,
  CheckType,
  CheckEntry,
  MeetingKind,
  MeetingRecord,
  HandoverEntry,
} from "./commonFiles.mock"
