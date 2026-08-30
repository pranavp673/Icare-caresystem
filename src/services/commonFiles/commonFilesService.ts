/**
 * CommonFilesSvc client. Home-level compliance documents/checks (FR-COM).
 * Visibility is universal (no route guard — see App.tsx); write actions
 * are gated in the UI by `commonFiles.log` / `commonFiles.edit`.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { findMockUser, DEFAULT_MOCK_USER } from "../../auth/user"
import {
  COMMON_FILE_DOCS,
  CHECK_ENTRIES,
  CHECK_TYPE_META,
  MEETING_RECORDS,
  HANDOVER_ENTRIES,
} from "./commonFiles.mock"
import type {
  CommonFileDoc,
  CheckCadence,
  CheckEntry,
  MeetingRecord,
  HandoverEntry,
  UpdateStatementOfPurposeRequest,
  LogCheckRequest,
  AddMeetingRequest,
  AddHandoverRequest,
} from "./commonFiles.types"

/**
 * Name of the current mock user, for stamping who performed an action.
 * Mirrors `identityService.ts`'s `readStoredUser()` — falls back to
 * `DEFAULT_MOCK_USER` rather than "Unknown" when nothing is stored yet
 * (the common case on first load, before any demo-user switch).
 */
const currentUserName = (): string => {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage.getItem("icare.user")
      : null
  if (!stored) return DEFAULT_MOCK_USER.name
  return findMockUser(stored)?.name ?? DEFAULT_MOCK_USER.name
}

export const getStatementOfPurpose = (
  homeId: string
): Promise<CommonFileDoc | null> => {
  // TODO(integration): GET /api/homes/${homeId}/statement-of-purpose
  return mockResponse(COMMON_FILE_DOCS.find((d) => d.homeId === homeId) ?? null)
}

export const updateStatementOfPurpose = (
  homeId: string,
  req: UpdateStatementOfPurposeRequest
): Promise<CommonFileDoc> => {
  // TODO(integration): PATCH /api/homes/${homeId}/statement-of-purpose
  const existing = COMMON_FILE_DOCS.find((d) => d.homeId === homeId)
  return mockResponse<CommonFileDoc>(
    {
      id: existing?.id ?? `cfd-${homeId}`,
      homeId,
      ...req,
      updatedBy: currentUserName(),
      updatedAt: new Date().toISOString().slice(0, 10),
    },
    300
  )
}

export const listChecks = (
  homeId: string,
  cadence?: CheckCadence
): Promise<CheckEntry[]> => {
  // TODO(integration): GET /api/homes/${homeId}/checks?cadence=${cadence}
  const data = CHECK_ENTRIES.filter(
    (c) => c.homeId === homeId && (!cadence || c.cadence === cadence)
  ).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  return mockResponse(data)
}

export const logCheck = (req: LogCheckRequest): Promise<CheckEntry> => {
  // TODO(integration): POST /api/homes/${req.homeId}/checks body=LogCheckRequest
  return mockResponse<CheckEntry>(
    {
      id: `chk-${Date.now()}`,
      cadence: CHECK_TYPE_META[req.checkType].cadence,
      completedBy: currentUserName(),
      completedAt: new Date().toISOString().slice(0, 16),
      ...req,
    },
    300
  )
}

export const listMeetings = (homeId: string): Promise<MeetingRecord[]> => {
  // TODO(integration): GET /api/homes/${homeId}/meetings
  const data = MEETING_RECORDS.filter((m) => m.homeId === homeId).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  return mockResponse(data)
}

export const addMeeting = (req: AddMeetingRequest): Promise<MeetingRecord> => {
  // TODO(integration): POST /api/homes/${req.homeId}/meetings body=AddMeetingRequest
  return mockResponse<MeetingRecord>({ id: `mtg-${Date.now()}`, ...req }, 300)
}

export const listHandovers = (homeId: string): Promise<HandoverEntry[]> => {
  // TODO(integration): GET /api/homes/${homeId}/handovers
  const data = HANDOVER_ENTRIES.filter((h) => h.homeId === homeId).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  return mockResponse(data)
}

export const addHandover = (req: AddHandoverRequest): Promise<HandoverEntry> => {
  // TODO(integration): POST /api/homes/${req.homeId}/handovers body=AddHandoverRequest
  return mockResponse<HandoverEntry>(
    { id: `ho-${Date.now()}`, loggedBy: currentUserName(), ...req },
    300
  )
}
