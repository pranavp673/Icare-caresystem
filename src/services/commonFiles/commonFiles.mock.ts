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

/**
 * Admin-configurable forms engine (Phase 7). Home-level compliance
 * documents/checks are an open-ended catalogue of `FormDefinition`s an
 * admin can extend or create from `/admin/forms`, each producing
 * `FormEntry` submissions -- there is no fixed taxonomy.
 *
 * `FormDefinition` is a schema/template — name, category, cadence, and an
 * ordered list of fields. `FormEntry` is one filled-in submission; ALL of
 * its content lives in `values`, keyed by `FormFieldDefinition.key` —
 * there is no special-cased envelope field (no fixed `notes`/`attendees`
 * column), which is what lets the hub render and fill every definition
 * with one generic component instead of one per type. See
 * docs/ICare_Requirements_and_Design.md and the Phase 7 plan for the full
 * design rationale.
 */

export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean"

export type FormFieldDefinition = {
  /** Stable machine key, auto-slugified from `label` — never hand-typed. */
  key: string
  label: string
  type: FormFieldType
  required: boolean
  helpText?: string
  /** `select` only. */
  options?: string[]
  /** `text` / `textarea` / `number` only. */
  placeholder?: string
}

export type FormCategory = "check" | "meeting" | "handover" | "risk_assessment" | "regulatory"
export type FormCadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "biannual"
  | "annual"
  | "ad_hoc"

export const FORM_CATEGORY_LABEL: Record<FormCategory, string> = {
  check: "Checks",
  meeting: "Meetings & Assessments",
  handover: "Handovers & Debriefs",
  risk_assessment: "Risk Assessments",
  regulatory: "Regulatory Documents",
}

export const FORM_CADENCE_LABEL: Record<FormCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Twice yearly",
  annual: "Annual",
  ad_hoc: "As needed",
}

export type FormDefinition = {
  id: string
  name: string
  category: FormCategory
  cadence: FormCadence
  description?: string
  fields: FormFieldDefinition[]
  /** True for the 12 migrated definitions — protects identity (cannot be
   *  deleted, name/category/cadence locked), but `fields` stay editable —
   *  this is what lets an admin "add a field to an existing check." */
  isSystem: boolean
  archivedAt?: string | null
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

const notesField: FormFieldDefinition = {
  key: "notes",
  label: "Notes",
  type: "textarea",
  required: false,
}

export const FORM_DEFINITIONS: FormDefinition[] = [
  // ── Migrated 1:1 from CheckType (plain notes-only checks) ──────────
  {
    id: "fridge_freezer",
    name: "Fridge & Freezer Temperature",
    category: "check",
    cadence: "daily",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "water",
    name: "Water Temperature Checks",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "medication_audit",
    name: "Medication Audit",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "fire_safety",
    name: "Fire & Safety",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "first_aid",
    name: "First Aid",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "car_maintenance",
    name: "Car Maintenance",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "bedroom",
    name: "Bedroom Checks",
    category: "check",
    cadence: "weekly",
    fields: [notesField],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },

  // ── Migrated + enriched: the worked example ─────────────────────────
  {
    id: "building_security",
    name: "Building & Premises Safety Check",
    category: "check",
    cadence: "weekly",
    description:
      "Standard weekly premises safety walk-round — fire safety, security, and first aid provision.",
    fields: [
      {
        key: "fire_doors_and_exits_clear",
        label: "Fire doors and exits clear and unobstructed?",
        type: "boolean",
        required: true,
      },
      {
        key: "fire_extinguishers_serviced",
        label: "Fire extinguishers present, serviced, and in date?",
        type: "boolean",
        required: true,
      },
      {
        key: "fire_alarm_smoke_detectors_tested",
        label: "Fire alarm / smoke & CO detectors tested this week?",
        type: "boolean",
        required: true,
      },
      {
        key: "emergency_lighting_tested",
        label: "Emergency lighting tested and functioning?",
        type: "boolean",
        required: true,
      },
      {
        key: "external_doors_windows_secure",
        label: "External doors and windows secure and functioning?",
        type: "boolean",
        required: true,
      },
      {
        key: "external_hazards",
        label: "External hazards (grounds, boundary, lighting)",
        type: "select",
        required: true,
        options: ["None identified", "Minor — logged", "Significant — escalated to maintenance"],
      },
      {
        key: "first_aid_kit_stocked",
        label: "First aid kit present, stocked and in date?",
        type: "boolean",
        required: true,
      },
      {
        key: "overall_condition_rating",
        label: "Overall building condition",
        type: "select",
        required: true,
        options: ["Good", "Fair", "Poor — action required"],
      },
      {
        key: "actions_required",
        label: "Actions required / follow-up",
        type: "textarea",
        required: false,
      },
      notesField,
    ],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },

  // ── Migrated from MeetingKind ────────────────────────────────────────
  {
    id: "monthly_team",
    name: "Monthly Team Meeting",
    category: "meeting",
    cadence: "monthly",
    fields: [
      { key: "attendees", label: "Attendees (comma-separated)", type: "text", required: true },
      { key: "notes", label: "Notes", type: "textarea", required: true },
    ],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "location_risk_assessment",
    name: "Location Risk Assessment",
    category: "meeting",
    cadence: "annual",
    fields: [
      { key: "attendees", label: "Attendees (comma-separated)", type: "text", required: true },
      { key: "notes", label: "Notes", type: "textarea", required: true },
    ],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },
  {
    id: "yp_weekly",
    name: "Young People's Weekly Meeting",
    category: "meeting",
    cadence: "weekly",
    fields: [
      { key: "attendees", label: "Attendees (comma-separated)", type: "text", required: true },
      { key: "notes", label: "Notes", type: "textarea", required: true },
    ],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },

  // ── Migrated from HandoverEntry ──────────────────────────────────────
  {
    id: "shift_handover",
    name: "Shift Handover / Debrief",
    category: "handover",
    cadence: "daily",
    fields: [
      { key: "shift", label: "Shift", type: "select", required: true, options: ["Day", "Night"] },
      { key: "notes", label: "Notes", type: "textarea", required: true },
    ],
    isSystem: true,
    createdBy: "System",
    createdAt: "2025-08-01",
    updatedBy: "System",
    updatedAt: "2025-08-01",
  },

  // ── New (Phase 7 first batch) — demonstrates admin-created types, not
  //    just admin-edited ones. Drawn from the Clearcare gap-analysis
  //    taxonomy; the remaining ~20 items are left for an admin to add
  //    the same way through /admin/forms. ─────────────────────────────
  {
    id: "fire_risk_assessment",
    name: "Fire Risk Assessment",
    category: "risk_assessment",
    cadence: "annual",
    fields: [
      { key: "assessor_name", label: "Assessor name", type: "text", required: true },
      {
        key: "fire_risk_rating",
        label: "Fire risk rating",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      { key: "significant_findings", label: "Significant findings", type: "textarea", required: true },
      {
        key: "evacuation_plan_reviewed",
        label: "Evacuation plan reviewed?",
        type: "boolean",
        required: true,
      },
      {
        key: "staff_training_up_to_date",
        label: "Staff fire training up to date?",
        type: "boolean",
        required: true,
      },
      { key: "action_plan_ref", label: "Action plan reference", type: "text", required: false },
      { key: "review_due_date", label: "Next review due", type: "date", required: true },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "ligature_risk_assessment",
    name: "Ligature Risk Assessment",
    category: "risk_assessment",
    cadence: "annual",
    fields: [
      { key: "areas_assessed", label: "Areas assessed", type: "textarea", required: true },
      {
        key: "ligature_points_identified",
        label: "Ligature points identified",
        type: "number",
        required: true,
      },
      {
        key: "high_risk_points_mitigated",
        label: "All high-risk points mitigated?",
        type: "boolean",
        required: true,
      },
      { key: "review_due_date", label: "Next review due", type: "date", required: true },
      { key: "notes", label: "Notes", type: "textarea", required: false },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "legionella_risk_assessment",
    name: "Legionella Risk Assessment",
    category: "risk_assessment",
    cadence: "annual",
    fields: [
      { key: "water_outlets_tested", label: "Water outlets tested", type: "number", required: true },
      {
        key: "temperatures_within_range",
        label: "All temperatures within safe range?",
        type: "boolean",
        required: true,
      },
      {
        key: "flushing_regime_in_place",
        label: "Little-used outlet flushing regime in place?",
        type: "boolean",
        required: true,
      },
      { key: "next_test_due", label: "Next test due", type: "date", required: true },
      { key: "findings", label: "Findings", type: "textarea", required: false },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "home_risk_assessment",
    name: "Home Risk Assessment",
    category: "risk_assessment",
    cadence: "annual",
    fields: [
      { key: "assessment_scope", label: "Assessment scope", type: "textarea", required: true },
      { key: "key_risks_identified", label: "Key risks identified", type: "textarea", required: true },
      { key: "control_measures", label: "Control measures", type: "textarea", required: true },
      { key: "reviewed_by", label: "Reviewed by", type: "text", required: true },
      { key: "next_review_date", label: "Next review due", type: "date", required: true },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "regulation_44_visit",
    name: "Regulation 44 Visit Report",
    category: "regulatory",
    cadence: "monthly",
    description: "Independent visitor's report, required under the Children's Homes Regulations 2015.",
    fields: [
      { key: "visitor_name", label: "Visitor name", type: "text", required: true },
      {
        key: "visit_type",
        label: "Visit type",
        type: "select",
        required: true,
        options: ["Announced", "Unannounced"],
      },
      { key: "children_spoken_to", label: "Children spoken to", type: "number", required: true },
      { key: "staff_spoken_to", label: "Staff spoken to", type: "number", required: true },
      { key: "concerns_raised", label: "Concerns raised?", type: "boolean", required: true },
      { key: "summary_of_findings", label: "Summary of findings", type: "textarea", required: true },
      {
        key: "report_submitted_to_ofsted",
        label: "Report submitted to Ofsted?",
        type: "boolean",
        required: true,
      },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "regulation_45_review",
    name: "Regulation 45 Review",
    category: "regulatory",
    cadence: "biannual",
    description:
      "Registered person's review of the quality of care, required under the Children's Homes Regulations 2015.",
    fields: [
      { key: "review_period_start", label: "Review period start", type: "date", required: true },
      { key: "review_period_end", label: "Review period end", type: "date", required: true },
      {
        key: "quality_of_care_rating",
        label: "Quality of care rating",
        type: "select",
        required: true,
        options: ["Good", "Requires improvement", "Inadequate"],
      },
      {
        key: "safeguarding_concerns_reviewed",
        label: "Safeguarding concerns reviewed?",
        type: "boolean",
        required: true,
      },
      { key: "summary", label: "Summary", type: "textarea", required: true },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
  {
    id: "fire_evacuation_drill",
    name: "Fire Evacuation Drill",
    category: "check",
    cadence: "quarterly",
    fields: [
      {
        key: "drill_type",
        label: "Drill type",
        type: "select",
        required: true,
        options: ["Announced", "Unannounced"],
      },
      { key: "evacuation_time_seconds", label: "Evacuation time (seconds)", type: "number", required: true },
      {
        key: "all_residents_accounted_for",
        label: "All residents accounted for?",
        type: "boolean",
        required: true,
      },
      { key: "issues_identified", label: "Issues identified", type: "textarea", required: false },
    ],
    isSystem: false,
    createdBy: "Alex Chen",
    createdAt: "2026-09-19",
    updatedBy: "Alex Chen",
    updatedAt: "2026-09-19",
  },
]

export type FormFieldValue = string | number | boolean | null

export type FormEntry = {
  id: string
  homeId: string
  formDefinitionId: string
  /** Keyed by FormFieldDefinition.key — ALL form content lives here,
   *  including what used to be fixed `notes`/`attendees`/`shift` fields.
   *  No special-cased envelope field. */
  values: Record<string, FormFieldValue>
  completedBy: string
  completedAt: string
}

export const FORM_ENTRIES: FormEntry[] = [
  // ── Migrated from CHECK_ENTRIES ──────────────────────────────────────
  {
    id: "chk-1",
    homeId: "home-willow",
    formDefinitionId: "fridge_freezer",
    values: { notes: "Fridge 4°C, freezer -18°C — both within range." },
    completedBy: "Amira O.",
    completedAt: "2026-06-12T08:00",
  },
  {
    id: "chk-2",
    homeId: "home-willow",
    formDefinitionId: "fridge_freezer",
    values: {},
    completedBy: "Daniel T.",
    completedAt: "2026-06-11T08:05",
  },
  {
    id: "chk-3",
    homeId: "home-willow",
    formDefinitionId: "building_security",
    values: { notes: "All external doors and windows secure, alarm tested." },
    completedBy: "Priya Amari",
    completedAt: "2026-06-09T09:00",
  },
  {
    id: "chk-4",
    homeId: "home-willow",
    formDefinitionId: "medication_audit",
    values: {},
    completedBy: "Sam Ortega",
    completedAt: "2026-06-08T14:00",
  },
  {
    id: "chk-5",
    homeId: "home-oakmoor",
    formDefinitionId: "fridge_freezer",
    values: {},
    completedBy: "Clara F.",
    completedAt: "2026-06-12T07:45",
  },
  {
    id: "chk-6",
    homeId: "home-oakmoor",
    formDefinitionId: "fire_safety",
    values: { notes: "Extinguishers in date, fire doors unobstructed." },
    completedBy: "Sam Ortega",
    completedAt: "2026-06-07T10:00",
  },
  {
    id: "chk-7",
    homeId: "home-rowan",
    formDefinitionId: "fridge_freezer",
    values: {},
    completedBy: "Finn Wallace",
    completedAt: "2026-06-12T08:15",
  },
  {
    id: "chk-8",
    homeId: "home-rowan",
    formDefinitionId: "bedroom",
    values: {},
    completedBy: "Suki P.",
    completedAt: "2026-06-06T11:00",
  },

  // ── Migrated from MEETING_RECORDS ────────────────────────────────────
  {
    id: "mtg-1",
    homeId: "home-willow",
    formDefinitionId: "monthly_team",
    values: {
      attendees: "Priya Amari, Sam Ortega, Daniel T., Amira O.",
      notes: "Reviewed staffing rota, discussed upcoming Ofsted visit prep.",
    },
    completedBy: "Priya Amari",
    completedAt: "2026-06-02T00:00",
  },
  {
    id: "mtg-2",
    homeId: "home-willow",
    formDefinitionId: "location_risk_assessment",
    values: {
      attendees: "Priya Amari, Sam Ortega",
      notes: "Annual review — no new hazards identified, fire exits re-signed.",
    },
    completedBy: "Priya Amari",
    completedAt: "2026-05-15T00:00",
  },
  {
    id: "mtg-3",
    homeId: "home-willow",
    formDefinitionId: "yp_weekly",
    values: {
      attendees: "Daniel T., Amira O.",
      notes: "House meeting — discussed weekend activity plans and meal preferences.",
    },
    completedBy: "Daniel T.",
    completedAt: "2026-06-10T00:00",
  },
  {
    id: "mtg-4",
    homeId: "home-oakmoor",
    formDefinitionId: "monthly_team",
    values: {
      attendees: "Sam Ortega, Clara F.",
      notes: "Assessment placement handover process reviewed.",
    },
    completedBy: "Sam Ortega",
    completedAt: "2026-06-03T00:00",
  },
  {
    id: "mtg-5",
    homeId: "home-rowan",
    formDefinitionId: "location_risk_assessment",
    values: {
      attendees: "Priya Amari",
      notes: "Grounds boundary fence flagged for repair — logged with maintenance.",
    },
    completedBy: "Priya Amari",
    completedAt: "2026-04-28T00:00",
  },

  // ── Migrated from HANDOVER_ENTRIES ───────────────────────────────────
  {
    id: "ho-1",
    homeId: "home-willow",
    formDefinitionId: "shift_handover",
    values: {
      shift: "Day",
      notes: "Quiet morning. Ashanti K. had a good session with her keyworker. No incidents.",
    },
    completedBy: "Amira O.",
    completedAt: "2026-06-12T00:00",
  },
  {
    id: "ho-2",
    homeId: "home-willow",
    formDefinitionId: "shift_handover",
    values: {
      shift: "Night",
      notes: "All young people settled by 22:00. One wake at 02:00, resettled without incident.",
    },
    completedBy: "Hiroki T.",
    completedAt: "2026-06-11T00:00",
  },
  {
    id: "ho-3",
    homeId: "home-oakmoor",
    formDefinitionId: "shift_handover",
    values: {
      shift: "Day",
      notes: "New assessment placement arrived, settling in well. Care plan review scheduled.",
    },
    completedBy: "Clara F.",
    completedAt: "2026-06-12T00:00",
  },
  {
    id: "ho-4",
    homeId: "home-rowan",
    formDefinitionId: "shift_handover",
    values: {
      shift: "Day",
      notes: "Therapeutic session ran over — flagged to evening staff for dinner timing.",
    },
    completedBy: "Finn Wallace",
    completedAt: "2026-06-11T00:00",
  },
]
