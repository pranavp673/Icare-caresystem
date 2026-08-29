/**
 * TimeSheetSvc types — request/response DTOs. See timeSheet.mock.ts for
 * the domain types and seed data.
 */

export type SetOnCallRequest = {
  homeId: string
  staffId: string
  staffName: string
  date: string
  notes?: string
}

export type { OnCallEntry, PayrollPeriod, PayrollStaffSummary } from "./timeSheet.mock"
