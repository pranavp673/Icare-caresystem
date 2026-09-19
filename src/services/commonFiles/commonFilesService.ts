/**
 * CommonFilesSvc client. Home-level compliance documents/checks (FR-COM).
 * Visibility is universal (no route guard — see App.tsx); write actions
 * are gated in the UI by `commonFiles.log` / `commonFiles.edit`.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { findMockUser, DEFAULT_MOCK_USER } from "../../auth/user"
import { COMMON_FILE_DOCS, FORM_DEFINITIONS, FORM_ENTRIES } from "./commonFiles.mock"
import type {
  CommonFileDoc,
  FormDefinition,
  FormEntry,
  UpdateStatementOfPurposeRequest,
  SaveFormDefinitionRequest,
  SubmitFormEntryRequest,
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

/* ── Forms engine (Phase 7) ──────────────────────────────────────────── */

const slugifyFormId = (name: string): string => {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  let id = base || `form_${Date.now()}`
  let n = 2
  while (FORM_DEFINITIONS.some((d) => d.id === id)) {
    id = `${base}_${n}`
    n += 1
  }
  return id
}

export const listFormDefinitions = (
  opts: { activeOnly?: boolean } = {}
): Promise<FormDefinition[]> => {
  // TODO(integration): GET /api/form-definitions?active=${opts.activeOnly}
  const data = FORM_DEFINITIONS.filter((d) => !opts.activeOnly || !d.archivedAt)
  return mockResponse([...data])
}

export const saveFormDefinition = (
  req: SaveFormDefinitionRequest
): Promise<FormDefinition> => {
  // TODO(integration): POST /api/form-definitions (create) or
  //   PATCH /api/form-definitions/${req.id} (edit) body=SaveFormDefinitionRequest
  const now = new Date().toISOString().slice(0, 10)
  const actor = currentUserName()

  if (req.id) {
    const existing = FORM_DEFINITIONS.find((d) => d.id === req.id)
    if (!existing) {
      return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Form definition not found" })
    }
    // isSystem definitions have their identity (name/category/cadence)
    // protected -- the UI locks these fields for isSystem definitions,
    // but the server is what actually enforces it. Fields stay editable
    // either way, which is what lets an admin "add a field to an
    // existing check."
    if (!existing.isSystem) {
      existing.name = req.name
      existing.category = req.category
      existing.cadence = req.cadence
      existing.description = req.description
    }
    existing.fields = req.fields
    existing.updatedBy = actor
    existing.updatedAt = now
    return mockResponse({ ...existing }, 300)
  }

  const created: FormDefinition = {
    id: slugifyFormId(req.name),
    name: req.name,
    category: req.category,
    cadence: req.cadence,
    description: req.description,
    fields: req.fields,
    isSystem: false,
    createdBy: actor,
    createdAt: now,
    updatedBy: actor,
    updatedAt: now,
  }
  FORM_DEFINITIONS.push(created)
  return mockResponse({ ...created }, 300)
}

export const archiveFormDefinition = (id: string): Promise<FormDefinition> => {
  // TODO(integration): POST /api/form-definitions/${id}/archive
  const existing = FORM_DEFINITIONS.find((d) => d.id === id)
  if (!existing) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Form definition not found" })
  }
  existing.archivedAt = new Date().toISOString().slice(0, 10)
  existing.updatedBy = currentUserName()
  existing.updatedAt = existing.archivedAt
  return mockResponse({ ...existing }, 300)
}

export const listFormEntries = (
  homeId: string,
  formDefinitionId?: string
): Promise<FormEntry[]> => {
  // TODO(integration): GET /api/homes/${homeId}/form-entries?formDefinitionId=${formDefinitionId}
  const data = FORM_ENTRIES.filter(
    (e) => e.homeId === homeId && (!formDefinitionId || e.formDefinitionId === formDefinitionId)
  ).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  return mockResponse(data)
}

export const submitFormEntry = (req: SubmitFormEntryRequest): Promise<FormEntry> => {
  // TODO(integration): POST /api/homes/${req.homeId}/form-entries body=SubmitFormEntryRequest
  const entry: FormEntry = {
    id: `fe-${Date.now()}`,
    completedBy: currentUserName(),
    completedAt: new Date().toISOString().slice(0, 16),
    ...req,
  }
  FORM_ENTRIES.unshift(entry)
  return mockResponse({ ...entry }, 300)
}
