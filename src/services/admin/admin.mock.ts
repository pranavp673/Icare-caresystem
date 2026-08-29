import type {
  Company,
  Home,
  Person,
  RotaConfig,
  RotaInstance,
  ShiftBlock,
  Team,
  TimesheetEntry,
  WorkPattern,
} from "./admin.types"

/* ─── Company ───────────────────────────────────────── */

export const COMPANY: Company = {
  id: "company-brightpath",
  legalName: "BrightPath Children's Services Ltd",
  corporateAddress: "Unit 4, Riverside Business Park, Bristol, BS1 4DY",
  companiesHouseNumber: "09812345",
  mainContactEmail: "admin@brightpathchildren.co.uk",
}

/* ─── Work patterns (fixed-hours staff) ─────────────── */

export const WORK_PATTERNS: WorkPattern[] = [
  {
    id: "wp-9to5",
    label: "Mon–Fri, 09:00–17:00",
    days: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, startTime: "09:00", endTime: "17:00" })),
  },
]

/* ─── People ────────────────────────────────────────── */

export const PEOPLE: Person[] = [
  {
    id: "person-sarah",
    homeId: "home-oakfield",
    fullName: "Sarah Whitfield",
    role: "registered_manager",
    scheduleType: "fixed_hours",
    teamId: null,
    workPatternId: "wp-9to5",
    startDate: "2022-03-01",
  },
  {
    id: "person-james",
    homeId: "home-oakfield",
    fullName: "James Okafor",
    role: "deputy_manager",
    scheduleType: "fixed_hours",
    teamId: null,
    workPatternId: "wp-9to5",
    startDate: "2022-09-12",
  },
  {
    id: "person-priya",
    homeId: "home-oakfield",
    fullName: "Priya Nair",
    role: "team_leader",
    scheduleType: "rota",
    teamId: "team-a",
    workPatternId: null,
    startDate: "2023-01-10",
  },
  {
    id: "person-marcus",
    homeId: "home-oakfield",
    fullName: "Marcus Webb",
    role: "team_leader",
    scheduleType: "rota",
    teamId: "team-b",
    workPatternId: null,
    startDate: "2023-04-22",
  },
  {
    id: "person-daniel",
    homeId: "home-oakfield",
    fullName: "Daniel Osei",
    role: "care_worker",
    scheduleType: "rota",
    teamId: "team-a",
    workPatternId: null,
    startDate: "2024-02-05",
  },
  {
    id: "person-aisha",
    homeId: "home-oakfield",
    fullName: "Aisha Khan",
    role: "care_worker",
    scheduleType: "rota",
    teamId: "team-a",
    workPatternId: null,
    startDate: "2024-05-19",
  },
  {
    id: "person-tomas",
    homeId: "home-oakfield",
    fullName: "Tomás Rivera",
    role: "waking_night_worker",
    scheduleType: "rota",
    teamId: "team-a",
    workPatternId: null,
    startDate: "2024-08-01",
  },
]

/* ─── Home ──────────────────────────────────────────── */

export const HOMES: Home[] = [
  {
    id: "home-oakfield",
    companyId: COMPANY.id,
    homeName: "Willow House",
    registeredAddress: "14 Willow Lane, Bristol, BS1 2QS",
    registrationNumber: "SC123456",
    registeredManagerId: "person-sarah",
    deputyManagerId: "person-james",
  },
]

/* ─── Teams ─────────────────────────────────────────── */

export const TEAMS: Team[] = [
  { id: "team-a", homeId: "home-oakfield", teamName: "Team A", teamLeaderId: "person-priya", configuredSize: 5, rotationPosition: 0 },
  { id: "team-b", homeId: "home-oakfield", teamName: "Team B", teamLeaderId: "person-marcus", configuredSize: 5, rotationPosition: 1 },
  { id: "team-c", homeId: "home-oakfield", teamName: "Team C", teamLeaderId: null, configuredSize: 5, rotationPosition: 2 },
]

/* ─── Rota config + shift blocks ────────────────────── */

export const ROTA_CONFIG: RotaConfig = {
  id: "rota-config-oakfield",
  homeId: "home-oakfield",
  numberOfTeams: 3,
  rotationOrder: ["team-a", "team-b", "team-c"],
  cadence: "every_n_days",
  dutyLengthDays: 1,
  daysOffBetweenDuties: 2,
}

export const SHIFT_BLOCKS: ShiftBlock[] = [
  {
    id: "block-day",
    rotaConfigId: ROTA_CONFIG.id,
    blockName: "Day",
    startTime: "07:00",
    endTime: "23:00",
    staffRequirement: { id: "req-day", shiftBlockId: "block-day", minStaffCount: 4, requiredRoles: ["team_leader"] },
  },
  {
    id: "block-night",
    rotaConfigId: ROTA_CONFIG.id,
    blockName: "Waking night",
    startTime: "23:00",
    endTime: "07:00",
    staffRequirement: { id: "req-night", shiftBlockId: "block-night", minStaffCount: 2, requiredRoles: ["waking_night_worker"] },
  },
]

/* ─── Rota instances (generated calendar) ──────────────
 * Sequential A → B → C → A, 1 day on duty / 2 days off, starting from a
 * fixed anchor date so the calendar looks stable across reloads.
 */

const ANCHOR_DATE = "2026-06-01" // Team A on duty
const ORDER = ROTA_CONFIG.rotationOrder

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const generateInstances = (days: number): RotaInstance[] => {
  const out: RotaInstance[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(ANCHOR_DATE, i)
    const teamIdx = i % ORDER.length
    out.push({
      id: `instance-${date}`,
      homeId: "home-oakfield",
      date,
      teamId: ORDER[teamIdx],
      status: i < 6 ? "completed" : i === 6 ? "in_progress" : "scheduled",
    })
  }
  return out
}

export const ROTA_INSTANCES: RotaInstance[] = generateInstances(35)

/* ─── Timesheet entries (actuals + variance) ────────── */

export const TIMESHEET_ENTRIES: TimesheetEntry[] = [
  {
    id: "ts-priya-0606-day",
    personId: "person-priya",
    shiftBlockId: "block-day",
    rotaInstanceId: "instance-2026-06-06",
    date: "2026-06-06",
    plannedStart: "07:00",
    plannedEnd: "23:00",
    actualStart: "07:02",
    actualEnd: "23:00",
    variance: null,
  },
  {
    id: "ts-daniel-0606-day",
    personId: "person-daniel",
    shiftBlockId: "block-day",
    rotaInstanceId: "instance-2026-06-06",
    date: "2026-06-06",
    plannedStart: "07:00",
    plannedEnd: "23:00",
    actualStart: "07:00",
    actualEnd: "19:30",
    variance: {
      id: "var-daniel-0606",
      timesheetEntryId: "ts-daniel-0606-day",
      kind: "left_early",
      reason: "Family emergency, called to collect child from school. Covered by Aisha Khan from 19:30.",
      submittedById: "person-daniel",
      submittedAt: "2026-06-06T19:35:00",
      status: "pending",
    },
  },
  {
    id: "ts-aisha-0606-cover",
    personId: "person-aisha",
    shiftBlockId: "block-day",
    rotaInstanceId: "instance-2026-06-06",
    date: "2026-06-06",
    plannedStart: null,
    plannedEnd: null,
    actualStart: "19:30",
    actualEnd: "23:00",
    variance: {
      id: "var-aisha-0606",
      timesheetEntryId: "ts-aisha-0606-cover",
      kind: "unplanned_cover",
      reason: "Stepped in to cover the rest of Daniel Osei's shift after he was called away.",
      submittedById: "person-aisha",
      submittedAt: "2026-06-06T19:36:00",
      status: "pending",
    },
  },
]
