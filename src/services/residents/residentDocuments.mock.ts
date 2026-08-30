/**
 * Resident document types — §3.5.1 of the requirements doc. Replaces the
 * old flat `ServiceEvent` history feed with 14 document types, grouped
 * into 5 tabs on ResidentDetail.tsx (Daily Record / Plans & Assessments /
 * Incidents & Reports / Health & Reviews / Activity).
 *
 * Structurally-identical document types within a tab share one type with
 * a `kind` discriminator (same pattern as commonFiles.mock.ts's
 * `MeetingRecord`/`CheckEntry`) rather than 14 near-duplicate types.
 * Seed data is intentionally sparse — a couple of examples per category
 * across a few residents, not exhaustive coverage of all 8.
 */

// ── Plans & Assessments (as-required, versioned reference docs) ──────

export type PlanKind = "care_plan" | "behaviour_support_plan" | "risk_assessment" | "ehcp" | "family_tree"

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  care_plan: "Care Plan",
  behaviour_support_plan: "Behaviour Support Plan",
  risk_assessment: "Risk Assessment",
  ehcp: "EHCP",
  family_tree: "Family Tree",
}

export type PlanDocument = {
  id: string
  residentId: string
  kind: PlanKind
  content: string
  updatedBy: string
  updatedAt: string
}

export const PLAN_DOCUMENTS: PlanDocument[] = [
  {
    id: "pd-1",
    residentId: "s1",
    kind: "care_plan",
    content:
      "History: placed 2024-09-14 following family breakdown. Health: no ongoing medical needs. Education: Year 9, attending regularly. Previous treatments: none ongoing. Ongoing: weekly key-worker sessions.",
    updatedBy: "Priya Amari",
    updatedAt: "2026-03-01",
  },
  {
    id: "pd-2",
    residentId: "s1",
    kind: "behaviour_support_plan",
    content: "Responds well to structured routine and advance warning of transitions. De-escalate with quiet 1:1 time, not group correction.",
    updatedBy: "Daniel T.",
    updatedAt: "2026-02-14",
  },
  {
    id: "pd-3",
    residentId: "s2",
    kind: "risk_assessment",
    content: "Low risk to self and others. Emotional dysregulation at transitions (school pickup/dropoff) — flagged for extra support during those windows.",
    updatedBy: "Tomás R.",
    updatedAt: "2026-01-20",
  },
  {
    id: "pd-4",
    residentId: "s2",
    kind: "ehcp",
    content: "EHCP in place — additional 1:1 learning support for literacy. Annual review due September 2026.",
    updatedBy: "Priya Amari",
    updatedAt: "2025-09-15",
  },
]

// ── Incidents & Reports (event-triggered) ─────────────────────────────

export type IncidentReportKind = "accident" | "missing" | "incident"

export const INCIDENT_KIND_LABEL: Record<IncidentReportKind, string> = {
  accident: "Accident Report",
  missing: "Missing Report",
  incident: "Incident",
}

export type IncidentReport = {
  id: string
  residentId: string
  kind: IncidentReportKind
  occurredAt: string
  description: string
  severity: "minor" | "moderate" | "major" | "critical"
  reportedBy: string
}

export const INCIDENT_REPORTS: IncidentReport[] = [
  {
    id: "ir-1",
    residentId: "s1",
    kind: "incident",
    occurredAt: "2026-04-10T16:20",
    description: "Disagreement with a peer, de-escalated by staff. No injuries.",
    severity: "minor",
    reportedBy: "Priya Amari",
  },
  {
    id: "ir-2",
    residentId: "s4",
    kind: "incident",
    occurredAt: "2026-04-11T03:20",
    description: "Unsettled during waking night check — anxiety about pathway plan meeting, supported and resettled.",
    severity: "minor",
    reportedBy: "Daniel T.",
  },
  {
    id: "ir-3",
    residentId: "s7",
    kind: "accident",
    occurredAt: "2026-03-22T17:45",
    description: "Minor fall during outdoor activity — grazed knee, first aid applied, no further treatment needed.",
    severity: "minor",
    reportedBy: "Clara F.",
  },
]

// ── Health & Reviews ────────────────────────────────────────────────

export type HealthRecordKind = "health_report" | "appointment" | "lac_minutes"

export const HEALTH_KIND_LABEL: Record<HealthRecordKind, string> = {
  health_report: "Health Report",
  appointment: "Appointment",
  lac_minutes: "LAC Minutes",
}

export type HealthRecord = {
  id: string
  residentId: string
  kind: HealthRecordKind
  date: string
  notes: string
  attendees?: string[]
  loggedBy: string
}

export const HEALTH_RECORDS: HealthRecord[] = [
  {
    id: "hr-1",
    residentId: "s3",
    kind: "appointment",
    date: "2026-04-09",
    notes: "Weekly therapeutic session with CAMHS — good engagement.",
    loggedBy: "External · Therapist",
  },
  {
    id: "hr-2",
    residentId: "s2",
    kind: "lac_minutes",
    date: "2026-03-28",
    notes: "Quarterly LAC review — education and placement stability both noted as positive. Next review scheduled for June.",
    attendees: ["Priya Amari", "Marcus Hale (Social Worker)"],
    loggedBy: "Tomás R.",
  },
  {
    id: "hr-3",
    residentId: "s5",
    kind: "health_report",
    date: "2026-04-05",
    notes: "PEP review — good school progress noted, no health concerns raised.",
    loggedBy: "Tomás R.",
  },
]

// ── Daily Record (daily cadence, RSW/Team Leader) ──────────────────────

export type DailyRecordEntry = {
  id: string
  residentId: string
  date: string
  dailyLog: string
  dailyEducation: string
  reflective: string
  loggedBy: string
}

export const DAILY_RECORD_ENTRIES: DailyRecordEntry[] = [
  {
    id: "dr-1",
    residentId: "s1",
    date: "2026-04-10",
    dailyLog: "Up at 07:00, breakfast as normal. Difficult afternoon with a peer disagreement, resolved by evening.",
    dailyEducation: "Full day at school, Year 9. No concerns reported by school.",
    reflective: "\"I felt annoyed earlier but I'm okay now. Tomorrow I want to play football at lunch.\"",
    loggedBy: "Amira O.",
  },
  {
    id: "dr-2",
    residentId: "s1",
    date: "2026-04-09",
    dailyLog: "Great morning — got ready for school independently and left on time.",
    dailyEducation: "Full attendance, engaged well in class per teacher feedback.",
    reflective: "\"Good day today. I liked art class.\"",
    loggedBy: "Amira O.",
  },
]

// ── Activity ───────────────────────────────────────────────────────

export type ActivityEntry = {
  id: string
  residentId: string
  date: string
  description: string
  loggedBy: string
}

export const ACTIVITY_ENTRIES: ActivityEntry[] = [
  {
    id: "ac-1",
    residentId: "s5",
    date: "2026-04-09",
    description: "Attended weekly art group — enjoyed painting session, good peer interaction.",
    loggedBy: "Clara F.",
  },
  {
    id: "ac-2",
    residentId: "s8",
    date: "2026-04-10",
    description: "Music therapy session — engaged well with guitar, requested another session next week.",
    loggedBy: "External · Therapist",
  },
]
