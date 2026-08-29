/**
 * AdminSvc client — configuration data for the rota system: company,
 * homes, teams, rota pattern (rotation order + shift blocks + staffing
 * requirements), people, and the generated rota calendar / timesheets.
 *
 * This is the layer the system-administrator setup wizard reads from
 * and writes to. During the mock phase, "save" calls just merge into
 * the in-memory fixtures and resolve — wiring to a real AdminSvc is a
 * drop-in replacement behind this same client surface.
 */
import { mockResponse } from "../gateway/gatewayClient"
import {
  COMPANY,
  HOMES,
  PEOPLE,
  ROTA_CONFIG,
  ROTA_INSTANCES,
  SHIFT_BLOCKS,
  TEAMS,
  TIMESHEET_ENTRIES,
  WORK_PATTERNS,
} from "./admin.mock"
import type {
  Company,
  GetHomeConfigQuery,
  Home,
  ListTimesheetQuery,
  Person,
  RotaConfig,
  RotaInstance,
  SaveCompanyRequest,
  SaveHomeRequest,
  SavePersonRequest,
  SaveRotaConfigRequest,
  SaveTeamRequest,
  ShiftBlock,
  Team,
  TimesheetEntry,
  WorkPattern,
} from "./admin.types"

/* ─── Company ───────────────────────────────────────── */

export const getCompany = (): Promise<Company> => {
  // TODO(integration): GET /api/admin/company
  return mockResponse(COMPANY)
}

export const saveCompany = (req: SaveCompanyRequest): Promise<Company> => {
  // TODO(integration): PUT /api/admin/company
  const next: Company = { ...COMPANY, ...req }
  Object.assign(COMPANY, next)
  return mockResponse(next)
}

/* ─── Homes ─────────────────────────────────────────── */

export const listHomes = (): Promise<Home[]> => {
  // TODO(integration): GET /api/admin/homes
  return mockResponse(HOMES)
}

export const getHome = (homeId: string): Promise<Home | null> => {
  // TODO(integration): GET /api/admin/homes/${homeId}
  return mockResponse(HOMES.find((h) => h.id === homeId) ?? null)
}

export const saveHome = (homeId: string | null, req: SaveHomeRequest): Promise<Home> => {
  // TODO(integration): POST /api/admin/homes  or  PUT /api/admin/homes/${homeId}
  if (homeId) {
    const idx = HOMES.findIndex((h) => h.id === homeId)
    if (idx >= 0) {
      HOMES[idx] = { ...HOMES[idx], ...req }
      return mockResponse(HOMES[idx])
    }
  }
  const created: Home = {
    id: `home-${Date.now()}`,
    companyId: req.companyId ?? COMPANY.id,
    homeName: req.homeName,
    registeredAddress: req.registeredAddress,
    registrationNumber: req.registrationNumber,
    registeredManagerId: req.registeredManagerId,
    deputyManagerId: req.deputyManagerId,
  }
  HOMES.push(created)
  return mockResponse(created)
}

/* ─── Teams ─────────────────────────────────────────── */

export const listTeams = (homeId: string): Promise<Team[]> => {
  // TODO(integration): GET /api/admin/homes/${homeId}/teams
  return mockResponse(TEAMS.filter((t) => t.homeId === homeId).sort((a, b) => a.rotationPosition - b.rotationPosition))
}

export const saveTeam = (homeId: string, req: SaveTeamRequest): Promise<Team> => {
  // TODO(integration): POST /api/admin/homes/${homeId}/teams  or  PUT .../teams/${req.id}
  if (req.id) {
    const idx = TEAMS.findIndex((t) => t.id === req.id)
    if (idx >= 0) {
      TEAMS[idx] = { ...TEAMS[idx], ...req }
      return mockResponse(TEAMS[idx])
    }
  }
  const created: Team = {
    id: `team-${Date.now()}`,
    homeId,
    teamName: req.teamName,
    teamLeaderId: req.teamLeaderId,
    configuredSize: req.configuredSize,
    rotationPosition: req.rotationPosition,
  }
  TEAMS.push(created)
  return mockResponse(created)
}

/* ─── Rota config + shift blocks ────────────────────── */

export const getRotaConfig = (query: GetHomeConfigQuery): Promise<RotaConfig | null> => {
  // TODO(integration): GET /api/admin/homes/${query.homeId}/rota-config
  return mockResponse(ROTA_CONFIG.homeId === query.homeId ? ROTA_CONFIG : null)
}

export const saveRotaConfig = (homeId: string, req: SaveRotaConfigRequest): Promise<RotaConfig> => {
  // TODO(integration): PUT /api/admin/homes/${homeId}/rota-config
  const next: RotaConfig = {
    ...ROTA_CONFIG,
    ...req,
    homeId,
    numberOfTeams: req.rotationOrder.length,
  }
  Object.assign(ROTA_CONFIG, next)
  return mockResponse(next)
}

export const listShiftBlocks = (rotaConfigId: string): Promise<ShiftBlock[]> => {
  // TODO(integration): GET /api/admin/rota-configs/${rotaConfigId}/shift-blocks
  return mockResponse(SHIFT_BLOCKS.filter((b) => b.rotaConfigId === rotaConfigId))
}

/**
 * Validates that a set of blocks tile a 24-hour day with no gaps or
 * overlaps. Mirrors the server-side rule for the planned-config layer
 * (confirmed: rigid for config; variance is handled in timesheets).
 */
export const validateShiftBlockCoverage = (blocks: Pick<ShiftBlock, "startTime" | "endTime">[]): { ok: boolean; message: string } => {
  if (blocks.length === 0) return { ok: false, message: "Add at least one shift block." }

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }

  const spans = blocks
    .map((b) => {
      const start = toMinutes(b.startTime)
      let end = toMinutes(b.endTime)
      if (end <= start) end += 24 * 60 // crosses midnight
      return { start, end }
    })
    .sort((a, b) => a.start - b.start)

  let cursor = spans[0].start
  for (const span of spans) {
    if (span.start !== cursor) {
      return { ok: false, message: "These blocks leave a gap or overlap — adjust the times so they tile the full 24 hours." }
    }
    cursor = span.end
  }
  if (cursor - spans[0].start !== 24 * 60) {
    return { ok: false, message: "These blocks leave a gap or overlap — adjust the times so they tile the full 24 hours." }
  }
  return { ok: true, message: "These blocks cover all 24 hours with no gaps or overlaps" }
}

/* ─── People & work patterns ────────────────────────── */

export const listPeople = (homeId: string): Promise<Person[]> => {
  // TODO(integration): GET /api/admin/homes/${homeId}/people
  return mockResponse(PEOPLE.filter((p) => p.homeId === homeId))
}

export const listWorkPatterns = (): Promise<WorkPattern[]> => {
  // TODO(integration): GET /api/admin/work-patterns
  return mockResponse(WORK_PATTERNS)
}

export const savePerson = (homeId: string, req: SavePersonRequest): Promise<Person> => {
  // TODO(integration): POST /api/admin/homes/${homeId}/people  or  PUT .../people/${req.id}
  if (req.id) {
    const idx = PEOPLE.findIndex((p) => p.id === req.id)
    if (idx >= 0) {
      PEOPLE[idx] = { ...PEOPLE[idx], ...req }
      return mockResponse(PEOPLE[idx])
    }
  }
  const created: Person = {
    id: `person-${Date.now()}`,
    homeId,
    fullName: req.fullName,
    role: req.role,
    scheduleType: req.scheduleType,
    teamId: req.teamId,
    workPatternId: req.workPatternId,
    startDate: req.startDate,
  }
  PEOPLE.push(created)
  return mockResponse(created)
}

/* ─── Generated rota calendar ───────────────────────── */

export const listRotaInstances = (homeId: string, fromDate: string, toDate: string): Promise<RotaInstance[]> => {
  // TODO(integration): GET /api/admin/homes/${homeId}/rota-instances?from=${fromDate}&to=${toDate}
  return mockResponse(
    ROTA_INSTANCES.filter((i) => i.homeId === homeId && i.date >= fromDate && i.date <= toDate)
  )
}

/* ─── Timesheets & variance ─────────────────────────── */

export const listTimesheetEntries = (query: ListTimesheetQuery): Promise<TimesheetEntry[]> => {
  // TODO(integration): GET /api/admin/homes/${query.homeId}/timesheets?date=${query.date}
  return mockResponse(
    TIMESHEET_ENTRIES.filter((e) => {
      const person = PEOPLE.find((p) => p.id === e.personId)
      if (!person || person.homeId !== query.homeId) return false
      if (e.date !== query.date) return false
      if (query.shiftBlockId && e.shiftBlockId !== query.shiftBlockId) return false
      return true
    })
  )
}

export const decideVariance = (
  varianceId: string,
  decision: "approved" | "declined",
  decidedById: string,
  decisionNote?: string
): Promise<TimesheetEntry | null> => {
  // TODO(integration): POST /api/admin/variance-requests/${varianceId}/decide
  const entry = TIMESHEET_ENTRIES.find((e) => e.variance?.id === varianceId)
  if (entry?.variance) {
    entry.variance = {
      ...entry.variance,
      status: decision,
      decidedById,
      decidedAt: new Date().toISOString(),
      decisionNote,
    }
  }
  return mockResponse(entry ?? null)
}
