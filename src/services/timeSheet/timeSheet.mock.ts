/**
 * TimeSheetSvc mock — source of truth for `OnCallEntry`/`PayrollPeriod`
 * and seed data (FR-TS, §3.13). Monthly Rota, Leave & Overtime, and
 * Swaps tabs on the Time Sheet page reuse `rotaService`/`manageService`
 * directly rather than duplicating that data here — see
 * `src/pages/TimeSheet/TimeSheetHub.tsx`.
 */

export type OnCallEntry = {
  id: string
  homeId: string
  staffId: string
  staffName: string
  date: string
  notes?: string
}

export const ON_CALL_ENTRIES: OnCallEntry[] = [
  {
    id: "oc-1",
    homeId: "home-willow",
    staffId: "tm-5",
    staffName: "Priya A.",
    date: "2026-06-12",
  },
  {
    id: "oc-2",
    homeId: "home-willow",
    staffId: "tm-5",
    staffName: "Priya A.",
    date: "2026-06-13",
  },
  {
    id: "oc-3",
    homeId: "home-willow",
    staffId: "tm-2",
    staffName: "Daniel T.",
    date: "2026-06-14",
    notes: "Covering while Priya is at head office training.",
  },
]

export type PayrollStaffSummary = {
  staffId: string
  staffName: string
  hoursWorked: number
  leaveDays: number
  overtimeHours: number
}

export type PayrollPeriod = {
  id: string
  homeId: string
  /** yyyy-mm */
  month: string
  staffSummaries: PayrollStaffSummary[]
  signedOffBy?: string
  signedOffAt?: string
}

export const PAYROLL_PERIODS: PayrollPeriod[] = [
  {
    id: "pay-2026-05-willow",
    homeId: "home-willow",
    month: "2026-05",
    staffSummaries: [
      { staffId: "tm-1", staffName: "Amira O.", hoursWorked: 152, leaveDays: 2, overtimeHours: 4 },
      { staffId: "tm-2", staffName: "Daniel T.", hoursWorked: 168, leaveDays: 0, overtimeHours: 0 },
      { staffId: "tm-4", staffName: "Tomás R.", hoursWorked: 160, leaveDays: 1, overtimeHours: 8 },
      { staffId: "tm-7", staffName: "Hiroki T.", hoursWorked: 144, leaveDays: 0, overtimeHours: 6 },
      { staffId: "tm-8", staffName: "Beatrice M.", hoursWorked: 128, leaveDays: 0, overtimeHours: 0 },
    ],
    signedOffBy: "Priya Amari",
    signedOffAt: "2026-06-02",
  },
  {
    id: "pay-2026-06-willow",
    homeId: "home-willow",
    month: "2026-06",
    staffSummaries: [
      { staffId: "tm-1", staffName: "Amira O.", hoursWorked: 96, leaveDays: 0, overtimeHours: 0 },
      { staffId: "tm-2", staffName: "Daniel T.", hoursWorked: 104, leaveDays: 1, overtimeHours: 0 },
      { staffId: "tm-4", staffName: "Tomás R.", hoursWorked: 100, leaveDays: 0, overtimeHours: 4 },
      { staffId: "tm-7", staffName: "Hiroki T.", hoursWorked: 88, leaveDays: 0, overtimeHours: 0 },
      { staffId: "tm-8", staffName: "Beatrice M.", hoursWorked: 80, leaveDays: 0, overtimeHours: 0 },
    ],
    // Not yet signed off — current month, in progress.
  },
]
