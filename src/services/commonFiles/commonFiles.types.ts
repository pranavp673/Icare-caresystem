/**
 * CommonFilesSvc types — request/response DTOs. See commonFiles.mock.ts
 * for the domain types (`CommonFileDoc`, and the Phase 7 forms engine —
 * `FormDefinition`, `FormEntry`) and seed data.
 */
import type { FormCategory, FormCadence, FormFieldDefinition, FormFieldValue } from "./commonFiles.mock"

export type UpdateStatementOfPurposeRequest = {
  homeRegisteredType: string
  servicesProvided: string
}

export type SaveFormDefinitionRequest = {
  /** Absent = create a new definition; present = edit an existing one. */
  id?: string
  name: string
  category: FormCategory
  cadence: FormCadence
  description?: string
  fields: FormFieldDefinition[]
}

export type SubmitFormEntryRequest = {
  homeId: string
  formDefinitionId: string
  values: Record<string, FormFieldValue>
}

export type {
  CommonFileDoc,
  FormFieldType,
  FormFieldDefinition,
  FormCategory,
  FormCadence,
  FormDefinition,
  FormFieldValue,
  FormEntry,
} from "./commonFiles.mock"
export { FORM_CATEGORY_LABEL, FORM_CADENCE_LABEL } from "./commonFiles.mock"
