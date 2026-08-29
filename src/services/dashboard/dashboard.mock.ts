import type { DashboardSnapshot, DaySnapshot, KpiCard } from "./dashboard.types"

/** Helper: generate 7 consecutive dates starting from today. */
const rolling7 = (): DaySnapshot[] => {
  const days: DaySnapshot[] = []
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const now = new Date()
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    days.push({
      date: iso,
      dayLabel: weekdays[d.getDay()],
      staffOnShift: 3 + Math.floor(Math.random() * 3),
      staffPlanned: 6,
      incidentsLogged: Math.floor(Math.random() * 3),
      reviewsDue: i > 0 ? Math.floor(Math.random() * 2) : 0,
    })
  }
  return days
}

const MOCK_KPIS_HOME: KpiCard[] = [
  { id: "active-pros", label: "Active staff", value: 8, delta: "1 on leave", tone: "neutral" },
  { id: "total-residents", label: "Young people", value: 6, delta: "1 new this week", tone: "success" },
  { id: "reviews-due", label: "Reviews due", value: 3, delta: "2 overdue", tone: "warning" },
  { id: "incidents-open", label: "Open incidents", value: 1, delta: "logged today", tone: "danger" },
  { id: "rota-coverage", label: "Rota coverage", value: 92, delta: "next 7 days", tone: "success" },
  { id: "pending-approvals", label: "Pending approvals", value: 5, delta: "3 leave, 2 swaps", tone: "neutral" },
]

const MOCK_KPIS_MULTI: KpiCard[] = [
  { id: "active-pros", label: "Active staff", value: 22, delta: "3 on leave across 3 homes", tone: "neutral" },
  { id: "total-residents", label: "Young people", value: 19, delta: "1 new placement this week", tone: "success" },
  { id: "reviews-due", label: "Reviews due", value: 8, delta: "4 overdue", tone: "warning" },
  { id: "incidents-open", label: "Open incidents", value: 3, delta: "1 Willow, 2 Rowan", tone: "danger" },
  { id: "rota-coverage", label: "Rota coverage", value: 88, delta: "across all homes", tone: "success" },
  { id: "pending-approvals", label: "Pending approvals", value: 12, delta: "7 leave, 5 swaps", tone: "neutral" },
]

const MOCK_KPIS_TEAM: KpiCard[] = [
  { id: "on-shift", label: "Team on shift", value: 4, delta: "of 6 planned", tone: "neutral" },
  { id: "total-residents", label: "My young people", value: 6, delta: "", tone: "neutral" },
  { id: "reviews-due", label: "Reviews due", value: 1, delta: "this week", tone: "warning" },
  { id: "pending-swaps", label: "Pending swaps", value: 1, delta: "awaiting response", tone: "neutral" },
]

export const MOCK_SNAPSHOT_HOME: DashboardSnapshot = {
  scope: "home",
  homeNames: ["Willow House"],
  kpis: MOCK_KPIS_HOME,
  dailyStrip: rolling7(),
  generatedAt: new Date().toISOString(),
}

export const MOCK_SNAPSHOT_MULTI: DashboardSnapshot = {
  scope: "multi_home",
  homeNames: ["Willow House", "Oakmoor House", "Rowan Lodge"],
  kpis: MOCK_KPIS_MULTI,
  dailyStrip: rolling7(),
  generatedAt: new Date().toISOString(),
}

export const MOCK_SNAPSHOT_TEAM: DashboardSnapshot = {
  scope: "team",
  homeNames: ["Willow House"],
  kpis: MOCK_KPIS_TEAM,
  dailyStrip: rolling7(),
  generatedAt: new Date().toISOString(),
}
