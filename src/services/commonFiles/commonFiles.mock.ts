/**
 * CommonFilesSvc mock — source of truth for the Common Files page (FR-COM,
 * docs/ICare_Requirements_and_Design.md §3.12). Home-level compliance
 * documents and checks, viewable by every role regardless of tier —
 * logging is restricted to the operational chain (RSW, Team Leader,
 * Deputy Manager, Registered Manager, System Admin), Statement of Purpose
 * editing to Registered Manager + System Admin. See auth/roles.ts for the
 * `commonFiles.*` permission set.
 */

export type CommonFileDoc = {
  id: string
  homeId: string
  /** e.g. "Learning Disability home", "EBD home". */
  homeRegisteredType: string
  servicesProvided: string
  updatedBy: string
  updatedAt: string
}

export const COMMON_FILE_DOCS: CommonFileDoc[] = [
  {
    id: "cfd-willow",
    homeId: "home-willow",
    homeRegisteredType: "EBD home",
    servicesProvided:
      "Residential care for young people with emotional and behavioural difficulties, including therapeutic support, education liaison, and family contact facilitation.",
    updatedBy: "Priya Amari",
    updatedAt: "2026-01-04",
  },
  {
    id: "cfd-oakmoor",
    homeId: "home-oakmoor",
    homeRegisteredType: "Assessment home",
    servicesProvided:
      "Short-term assessment placements — structured observation, care planning handover, and transition support to permanent placements.",
    updatedBy: "Sam Ortega",
    updatedAt: "2025-11-20",
  },
  {
    id: "cfd-rowan",
    homeId: "home-rowan",
    homeRegisteredType: "Therapeutic home",
    servicesProvided:
      "Solo and small-group therapeutic placements for young people with complex needs, with on-site clinical support.",
    updatedBy: "Priya Amari",
    updatedAt: "2025-09-12",
  },
]

export type CheckCadence = "daily" | "weekly"

export type CheckType =
  | "fridge_freezer"
  | "building_security"
  | "water"
  | "medication_audit"
  | "fire_safety"
  | "first_aid"
  | "car_maintenance"
  | "bedroom"

export const CHECK_TYPE_META: Record<CheckType, { label: string; cadence: CheckCadence }> = {
  fridge_freezer: { label: "Fridge & freezer temperature", cadence: "daily" },
  building_security: { label: "Building & security", cadence: "weekly" },
  water: { label: "Water", cadence: "weekly" },
  medication_audit: { label: "Medication audit", cadence: "weekly" },
  fire_safety: { label: "Fire & safety", cadence: "weekly" },
  first_aid: { label: "First aid", cadence: "weekly" },
  car_maintenance: { label: "Car maintenance", cadence: "weekly" },
  bedroom: { label: "Bedroom", cadence: "weekly" },
}

export type CheckEntry = {
  id: string
  homeId: string
  checkType: CheckType
  cadence: CheckCadence
  completedBy: string
  completedAt: string
  notes?: string
}

export const CHECK_ENTRIES: CheckEntry[] = [
  {
    id: "chk-1",
    homeId: "home-willow",
    checkType: "fridge_freezer",
    cadence: "daily",
    completedBy: "Amira O.",
    completedAt: "2026-06-12T08:00",
    notes: "Fridge 4°C, freezer -18°C — both within range.",
  },
  {
    id: "chk-2",
    homeId: "home-willow",
    checkType: "fridge_freezer",
    cadence: "daily",
    completedBy: "Daniel T.",
    completedAt: "2026-06-11T08:05",
  },
  {
    id: "chk-3",
    homeId: "home-willow",
    checkType: "building_security",
    cadence: "weekly",
    completedBy: "Priya Amari",
    completedAt: "2026-06-09T09:00",
    notes: "All external doors and windows secure, alarm tested.",
  },
  {
    id: "chk-4",
    homeId: "home-willow",
    checkType: "medication_audit",
    cadence: "weekly",
    completedBy: "Sam Ortega",
    completedAt: "2026-06-08T14:00",
  },
  {
    id: "chk-5",
    homeId: "home-oakmoor",
    checkType: "fridge_freezer",
    cadence: "daily",
    completedBy: "Clara F.",
    completedAt: "2026-06-12T07:45",
  },
  {
    id: "chk-6",
    homeId: "home-oakmoor",
    checkType: "fire_safety",
    cadence: "weekly",
    completedBy: "Sam Ortega",
    completedAt: "2026-06-07T10:00",
    notes: "Extinguishers in date, fire doors unobstructed.",
  },
  {
    id: "chk-7",
    homeId: "home-rowan",
    checkType: "fridge_freezer",
    cadence: "daily",
    completedBy: "Finn Wallace",
    completedAt: "2026-06-12T08:15",
  },
  {
    id: "chk-8",
    homeId: "home-rowan",
    checkType: "bedroom",
    cadence: "weekly",
    completedBy: "Suki P.",
    completedAt: "2026-06-06T11:00",
  },
]

export type MeetingKind = "monthly_team" | "location_risk_assessment" | "yp_weekly"

export const MEETING_KIND_LABEL: Record<MeetingKind, string> = {
  monthly_team: "Monthly Team Meeting",
  location_risk_assessment: "Location Risk Assessment",
  yp_weekly: "Young People's Weekly Meeting",
}

export type MeetingRecord = {
  id: string
  homeId: string
  kind: MeetingKind
  date: string
  attendees: string[]
  notes: string
}

export const MEETING_RECORDS: MeetingRecord[] = [
  {
    id: "mtg-1",
    homeId: "home-willow",
    kind: "monthly_team",
    date: "2026-06-02",
    attendees: ["Priya Amari", "Sam Ortega", "Daniel T.", "Amira O."],
    notes: "Reviewed staffing rota, discussed upcoming Ofsted visit prep.",
  },
  {
    id: "mtg-2",
    homeId: "home-willow",
    kind: "location_risk_assessment",
    date: "2026-05-15",
    attendees: ["Priya Amari", "Sam Ortega"],
    notes: "Annual review — no new hazards identified, fire exits re-signed.",
  },
  {
    id: "mtg-3",
    homeId: "home-willow",
    kind: "yp_weekly",
    date: "2026-06-10",
    attendees: ["Daniel T.", "Amira O."],
    notes: "House meeting — discussed weekend activity plans and meal preferences.",
  },
  {
    id: "mtg-4",
    homeId: "home-oakmoor",
    kind: "monthly_team",
    date: "2026-06-03",
    attendees: ["Sam Ortega", "Clara F."],
    notes: "Assessment placement handover process reviewed.",
  },
  {
    id: "mtg-5",
    homeId: "home-rowan",
    kind: "location_risk_assessment",
    date: "2026-04-28",
    attendees: ["Priya Amari"],
    notes: "Grounds boundary fence flagged for repair — logged with maintenance.",
  },
]

export type HandoverEntry = {
  id: string
  homeId: string
  shift: string
  date: string
  notes: string
  loggedBy: string
}

export const HANDOVER_ENTRIES: HandoverEntry[] = [
  {
    id: "ho-1",
    homeId: "home-willow",
    shift: "Day",
    date: "2026-06-12",
    notes: "Quiet morning. Ashanti K. had a good session with her keyworker. No incidents.",
    loggedBy: "Amira O.",
  },
  {
    id: "ho-2",
    homeId: "home-willow",
    shift: "Night",
    date: "2026-06-11",
    notes: "All young people settled by 22:00. One wake at 02:00, resettled without incident.",
    loggedBy: "Hiroki T.",
  },
  {
    id: "ho-3",
    homeId: "home-oakmoor",
    shift: "Day",
    date: "2026-06-12",
    notes: "New assessment placement arrived, settling in well. Care plan review scheduled.",
    loggedBy: "Clara F.",
  },
  {
    id: "ho-4",
    homeId: "home-rowan",
    shift: "Day",
    date: "2026-06-11",
    notes: "Therapeutic session ran over — flagged to evening staff for dinner timing.",
    loggedBy: "Finn Wallace",
  },
]
