/**
 * TimeSheetSvc client. On-call scheduling (FR-TS-06) and payroll sign-off
 * (FR-TS-07). Monthly Rota, Leave & Overtime, and Swaps data come from
 * `rotaService`/`manageService` directly — see TimeSheetHub.tsx.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { ON_CALL_ENTRIES, PAYROLL_PERIODS } from "./timeSheet.mock"
import type { OnCallEntry, PayrollPeriod, SetOnCallRequest } from "./timeSheet.types"

export const listOnCall = (homeId: string): Promise<OnCallEntry[]> => {
  // TODO(integration): GET /api/homes/${homeId}/on-call
  const data = ON_CALL_ENTRIES.filter((e) => e.homeId === homeId).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  return mockResponse(data)
}

export const setOnCall = (req: SetOnCallRequest): Promise<OnCallEntry> => {
  // TODO(integration): POST /api/homes/${req.homeId}/on-call body=SetOnCallRequest
  return mockResponse<OnCallEntry>({ id: `oc-${Date.now()}`, ...req }, 300)
}

export const getPayrollPeriod = (
  homeId: string,
  month: string
): Promise<PayrollPeriod | null> => {
  // TODO(integration): GET /api/homes/${homeId}/payroll/${month}
  const found = PAYROLL_PERIODS.find((p) => p.homeId === homeId && p.month === month)
  return mockResponse(found ?? null)
}

export const signOffPayroll = (id: string, signedOffBy: string): Promise<PayrollPeriod> => {
  // TODO(integration): POST /api/payroll/${id}/sign-off
  const period = PAYROLL_PERIODS.find((p) => p.id === id)
  if (!period) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Payroll period not found" })
  }
  return mockResponse<PayrollPeriod>(
    { ...period, signedOffBy, signedOffAt: new Date().toISOString().slice(0, 10) },
    300
  )
}
