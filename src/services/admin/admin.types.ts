/**
 * AdminSvc types — back-end data model for configuring the rota system.
 *
 * Mirrors the confirmed hierarchy:
 *
 *   Company (tenant)
 *     └─ Home (registered site, has a Registered Manager + Deputy Manager
 *               who work fixed hours and sit outside the rotation)
 *          ├─ Team[]        (fixed target size, sequential rotation A→B→C→A)
 *          ├─ RotaConfig    (number of teams, rotation length, days off)
 *          │     └─ ShiftBlock[]   (tiles the 24h on-duty period — must
 *          │           └─ StaffRequirement   cover all hours, no gaps/overlaps)
 *          ├─ Person[]      (schedule_type: "rota" | "fixed_hours")
 *          └─ TimesheetEntry[]   (actual recorded attendance; deviations
 *                └─ VarianceRequest  from the plan go through this — the
 *                                     planned layer stays clean/validatable
 *                                     while real-world variance stays
 *                                     fully auditable)
 *
 * Config vs. actuals split (confirmed): ShiftBlocks define the rigid,
 * validated plan for a duty period (no gaps/overlaps). TimesheetEntry +
 * VarianceRequest record what actually happened, including early
 * leaves/extensions/unplanned cover — each variance carries an author,
 * timestamp, reason, and approval state for safeguarding/audit purposes.
 */

/* ─── Company ───────────────────────────────────────── */

export type Company = {
  id: string
  legalName: string
  corporateAddress: string
  companiesHouseNumber?: string
  mainContactEmail?: string
}

/* ─── Home ──────────────────────────────────────────── */

export type Home = {
  id: string
  companyId: string
  homeName: string
  registeredAddress: string
  /** Ofsted (children's services) or CQC (adult social care) registration number. */
  registrationNumber: string
  /** References a Person with role "registered_manager"; fixed hours, excluded from rotation. */
  registeredManagerId: string | null
  /** References a Person with role "deputy_manager"; fixed hours, excluded from rotation. */
  deputyManagerId: string | null
}

/* ─── Team ──────────────────────────────────────────── */

export type Team = {
  id: string
  homeId: string
  /** Display name, e.g. "Team A". */
  teamName: string
  /** References a Person — the team's day-to-day lead. */
  teamLeaderId: string | null
  /**
   * Fixed target headcount (confirmed: a single target, not a min/max
   * range). Coverage tooling compares actual rostered members against
   * this number.
   */
  configuredSize: number
  /**
   * Position in the rotation sequence, 0-based (0 = A, 1 = B, 2 = C…).
   * Combined with RotaConfig.rotationOrder this drives strictly
   * sequential A → B → C → A handover (confirmed).
   */
  rotationPosition: number
}

/* ─── Rota configuration ────────────────────────────── */

export type RotationCadence = "daily" | "every_n_days" | "weekly"

export type RotaConfig = {
  id: string
  homeId: string
  /** How many teams participate in the rotation (informational mirror of Team[].length). */
  numberOfTeams: number
  /** Strictly sequential handover order, by team id — confirmed A→B→C→A, not irregular. */
  rotationOrder: string[]
  cadence: RotationCadence
  /** How many days each team stays on duty before handing over. */
  dutyLengthDays: number
  /** Days off between a team's duty periods. */
  daysOffBetweenDuties: number
}

/* ─── Shift blocks & staffing ───────────────────────── */

export type StaffRequirement = {
  id: string
  shiftBlockId: string
  /** Minimum number of staff who must be on duty during this block. */
  minStaffCount: number
  /** Roles that must be represented, e.g. ["team_leader"] or ["waking_night_worker"]. */
  requiredRoles: string[]
}

export type ShiftBlock = {
  id: string
  rotaConfigId: string
  /** Display name, e.g. "Day", "Waking night". */
  blockName: string
  /** 24h clock, "HH:mm". Blocks must tile the full 24 hours with no gaps/overlaps. */
  startTime: string
  endTime: string
  staffRequirement: StaffRequirement
}

/* ─── People ────────────────────────────────────────── */

export type StaffRole =
  | "registered_manager"
  | "deputy_manager"
  | "team_leader"
  | "care_worker"
  | "waking_night_worker"

export type ScheduleType = "rota" | "fixed_hours"

/** A reusable weekly pattern for fixed-hours staff, e.g. "Mon–Fri, 09:00–17:00". */
export type WorkPattern = {
  id: string
  label: string
  /** Mon=0 … Sun=6; entries describe the working window for that weekday. */
  days: { weekday: number; startTime: string; endTime: string }[]
}

export type Person = {
  id: string
  homeId: string
  fullName: string
  role: StaffRole
  scheduleType: ScheduleType
  /** Set when scheduleType === "rota". */
  teamId: string | null
  /** Set when scheduleType === "fixed_hours" (e.g. Manager/Deputy on 9–5). */
  workPatternId: string | null
  startDate: string
}

/* ─── Timesheets & variance (actuals layer) ─────────── */

export type VarianceKind =
  | "left_early"
  | "extended"
  | "unplanned_cover"
  | "no_show"
  | "other"

export type VarianceStatus = "pending" | "approved" | "declined"

export type VarianceRequest = {
  id: string
  timesheetEntryId: string
  kind: VarianceKind
  /** Free-text reason supplied by the person or the recording manager. */
  reason: string
  submittedById: string
  submittedAt: string
  status: VarianceStatus
  /** Who actioned it and when — required for the audit trail. */
  decidedById?: string
  decidedAt?: string
  decisionNote?: string
}

export type TimesheetEntry = {
  id: string
  personId: string
  /** The planned shift block this entry is measured against; null for fully unplanned cover. */
  shiftBlockId: string | null
  rotaInstanceId: string
  date: string
  /** Planned start/end, copied from the shift block at generation time. */
  plannedStart: string | null
  plannedEnd: string | null
  /** Actual clocked start/end. */
  actualStart: string
  actualEnd: string
  variance: VarianceRequest | null
}

/* ─── Generated rota instances (for calendar/coverage views) ── */

export type RotaInstanceStatus = "scheduled" | "in_progress" | "completed"

export type RotaInstance = {
  id: string
  homeId: string
  date: string
  /** The team on duty this date, per the rotation order. */
  teamId: string
  status: RotaInstanceStatus
}

/* ─── Query / request shapes ────────────────────────── */

export type GetHomeConfigQuery = {
  homeId: string
}

export type SaveCompanyRequest = Omit<Company, "id">

export type SaveHomeRequest = Omit<Home, "id" | "companyId"> & {
  companyId?: string
}

export type SaveTeamRequest = Omit<Team, "id" | "homeId"> & {
  id?: string
}

export type SaveRotaConfigRequest = Omit<RotaConfig, "id" | "homeId" | "numberOfTeams">

export type SavePersonRequest = Omit<Person, "id"> & {
  id?: string
}

export type ListTimesheetQuery = {
  homeId: string
  date: string
  shiftBlockId?: string
}
