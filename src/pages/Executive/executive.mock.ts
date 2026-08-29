/**
 * Mock data for the Executive dashboard.
 *
 * In production these would come from aggregated API endpoints:
 *   GET /api/homes/health      → per-home staffing + incident summary
 *   GET /api/escalations/mine  → items escalated to the current user
 *   GET /api/approvals/pending → pending approval queue
 */

export type IncidentSeverity = "minor" | "moderate" | "major" | "critical"

export type HomeHealth = {
  id: string
  name: string
  /** Total staff required for today's shifts. */
  staffRequired: number
  /** Staff currently on duty / confirmed. */
  staffPresent: number
  /** Staff on leave today. */
  staffOnLeave: number
  /** Total open incidents. */
  incidentCount: number
  /** Breakdown by severity. */
  incidents: { severity: IncidentSeverity; count: number }[]
  /** Items escalated to the executive viewing this dashboard. */
  escalations: number
  /** Pending approvals (leave, overtime, etc). */
  pendingApprovals: number
  /** Residents in this home. */
  residentCount: number
  /** Overall health score 0–100. */
  healthScore: number
  /** Last updated timestamp. */
  lastUpdated: string
}

export type Escalation = {
  id: string
  homeId: string
  homeName: string
  title: string
  severity: IncidentSeverity
  raisedBy: string
  raisedAt: string
  category: "incident" | "staffing" | "compliance" | "complaint"
}

export type PendingItem = {
  id: string
  homeId: string
  homeName: string
  type: "leave" | "overtime" | "swap" | "variance"
  summary: string
  requestedBy: string
  requestedAt: string
}

// ── Seed data ──────────────────────────────────────────

export const MOCK_HOME_HEALTH: HomeHealth[] = [
  {
    id: "home-willow",
    name: "Willow House",
    staffRequired: 12,
    staffPresent: 10,
    staffOnLeave: 2,
    incidentCount: 3,
    incidents: [
      { severity: "minor", count: 1 },
      { severity: "moderate", count: 1 },
      { severity: "major", count: 1 },
    ],
    escalations: 2,
    pendingApprovals: 4,
    residentCount: 8,
    healthScore: 72,
    lastUpdated: "2026-06-12T08:30:00",
  },
  {
    id: "home-oakmoor",
    name: "Oakmoor House",
    staffRequired: 8,
    staffPresent: 8,
    staffOnLeave: 0,
    incidentCount: 1,
    incidents: [
      { severity: "minor", count: 1 },
    ],
    escalations: 0,
    pendingApprovals: 1,
    residentCount: 6,
    healthScore: 95,
    lastUpdated: "2026-06-12T08:15:00",
  },
  {
    id: "home-rowan",
    name: "Rowan Lodge",
    staffRequired: 10,
    staffPresent: 7,
    staffOnLeave: 1,
    incidentCount: 5,
    incidents: [
      { severity: "minor", count: 2 },
      { severity: "moderate", count: 1 },
      { severity: "critical", count: 2 },
    ],
    escalations: 3,
    pendingApprovals: 6,
    residentCount: 10,
    healthScore: 48,
    lastUpdated: "2026-06-12T08:45:00",
  },
]

export const MOCK_ESCALATIONS: Escalation[] = [
  {
    id: "esc-1",
    homeId: "home-willow",
    homeName: "Willow House",
    title: "Young person missing from placement — Jayden K., age 14",
    severity: "major",
    raisedBy: "Daniel T.",
    raisedAt: "2026-06-12T07:15:00",
    category: "incident",
  },
  {
    id: "esc-2",
    homeId: "home-willow",
    homeName: "Willow House",
    title: "Waking night shift coverage gap — no replacement found",
    severity: "moderate",
    raisedBy: "Priya Amari",
    raisedAt: "2026-06-11T22:30:00",
    category: "staffing",
  },
  {
    id: "esc-3",
    homeId: "home-rowan",
    homeName: "Rowan Lodge",
    title: "Safeguarding concern — disclosure by young person",
    severity: "critical",
    raisedBy: "Finn Wallace",
    raisedAt: "2026-06-12T06:45:00",
    category: "incident",
  },
  {
    id: "esc-4",
    homeId: "home-rowan",
    homeName: "Rowan Lodge",
    title: "Ofsted action plan overdue — Reg 44 items pending",
    severity: "major",
    raisedBy: "Clara Nguyen",
    raisedAt: "2026-06-11T14:00:00",
    category: "compliance",
  },
  {
    id: "esc-5",
    homeId: "home-rowan",
    homeName: "Rowan Lodge",
    title: "Placing authority complaint — contact arrangements not met",
    severity: "moderate",
    raisedBy: "Clara Nguyen",
    raisedAt: "2026-06-11T16:20:00",
    category: "complaint",
  },
]

export const MOCK_PENDING: PendingItem[] = [
  {
    id: "pnd-1",
    homeId: "home-willow",
    homeName: "Willow House",
    type: "leave",
    summary: "Annual leave — 16–20 Jun (5 days)",
    requestedBy: "Amira O.",
    requestedAt: "2026-06-10T09:00:00",
  },
  {
    id: "pnd-2",
    homeId: "home-willow",
    homeName: "Willow House",
    type: "overtime",
    summary: "Overtime — 14 Jun, 19:00–23:00",
    requestedBy: "Tomás Rivera",
    requestedAt: "2026-06-11T11:30:00",
  },
  {
    id: "pnd-3",
    homeId: "home-rowan",
    homeName: "Rowan Lodge",
    type: "leave",
    summary: "Sick leave — 12 Jun",
    requestedBy: "Finn Wallace",
    requestedAt: "2026-06-12T06:00:00",
  },
  {
    id: "pnd-4",
    homeId: "home-rowan",
    homeName: "Rowan Lodge",
    type: "variance",
    summary: "Variance — late arrival 45 min, personal emergency",
    requestedBy: "Clara Nguyen",
    requestedAt: "2026-06-11T08:15:00",
  },
]

// ── Staff on duty (per-home, for single-home dashboards) ─

export type StaffOnDuty = {
  id: string
  name: string
  initials: string
  role: string
  shift: string // e.g. "07:00 – 15:00"
  status: "on_shift" | "on_break" | "arriving" | "on_leave"
}

export const MOCK_STAFF_ON_DUTY: Record<string, StaffOnDuty[]> = {
  "home-willow": [
    { id: "tm-1", name: "Amira O.", initials: "AO", role: "RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-2", name: "Daniel T.", initials: "DT", role: "RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-4", name: "Tomás R.", initials: "TR", role: "Senior RSW", shift: "07:00 – 15:00", status: "on_break" },
    { id: "tm-7", name: "Hiroki T.", initials: "HT", role: "RSW", shift: "14:00 – 22:00", status: "arriving" },
    { id: "tm-8", name: "Beatrice M.", initials: "BM", role: "RSW", shift: "14:00 – 22:00", status: "arriving" },
    { id: "tm-6", name: "Finn O.", initials: "FO", role: "RSW", shift: "—", status: "on_leave" },
  ],
  "home-oakmoor": [
    { id: "tm-3", name: "Clara F.", initials: "CF", role: "RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-9", name: "Nadia K.", initials: "NK", role: "RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-10", name: "Liam W.", initials: "LW", role: "Senior RSW", shift: "14:00 – 22:00", status: "arriving" },
  ],
  "home-rowan": [
    { id: "tm-11", name: "Finn Wallace", initials: "FW", role: "Senior RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-12", name: "Suki P.", initials: "SP", role: "RSW", shift: "07:00 – 15:00", status: "on_shift" },
    { id: "tm-13", name: "Omar J.", initials: "OJ", role: "RSW", shift: "07:00 – 19:00", status: "on_shift" },
    { id: "tm-14", name: "Megan T.", initials: "MT", role: "RSW", shift: "14:00 – 22:00", status: "arriving" },
  ],
}

// ── Today's schedule (for single-home dashboards) ────────

export type TodayEvent = {
  id: string
  homeId: string
  time: string
  title: string
  category: "meeting" | "visit" | "review" | "admin"
}

export const MOCK_TODAY_EVENTS: TodayEvent[] = [
  { id: "td-1", homeId: "home-willow", time: "09:00", title: "Team Huddle — Maple & Oak Units", category: "meeting" },
  { id: "td-2", homeId: "home-willow", time: "10:00", title: "LAC Review — Daria P.", category: "review" },
  { id: "td-3", homeId: "home-willow", time: "14:00", title: "Reg 44 Visit Preparation", category: "admin" },
  { id: "td-4", homeId: "home-willow", time: "15:30", title: "Key-worker session — Ashanti K.", category: "meeting" },
  { id: "td-5", homeId: "home-oakmoor", time: "10:00", title: "Social Worker Visit — Elena R.", category: "visit" },
  { id: "td-6", homeId: "home-oakmoor", time: "14:00", title: "Team Meeting", category: "meeting" },
  { id: "td-7", homeId: "home-rowan", time: "09:30", title: "Safeguarding Disclosure Follow-up", category: "review" },
  { id: "td-8", homeId: "home-rowan", time: "14:00", title: "Oakmoor House — Monthly Check-in", category: "meeting" },
]
