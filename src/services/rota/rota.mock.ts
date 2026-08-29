import type { RotaWeek, RotaEntry, RotaDay, TeamRoster } from "./rota.types"

/* ─── Staff & teams ─────────────────────────────────── */

const TEAMS = [
  { id: "team-alpha", name: "Team Alpha" },
  { id: "team-bravo", name: "Team Bravo" },
]

const STAFF = [
  { id: "s-amira", name: "Amira O.", role: "RSW", teamIdx: 0 },
  { id: "s-daniel", name: "Daniel T.", role: "Team Leader", teamIdx: 0 },
  { id: "s-hiroki", name: "Hiroki Y.", role: "RSW", teamIdx: 0 },
  { id: "s-beatrice", name: "Beatrice L.", role: "Senior RSW", teamIdx: 0 },
  { id: "s-tomas", name: "Tomás R.", role: "RSW", teamIdx: 1 },
  { id: "s-clara", name: "Clara M.", role: "Senior RSW", teamIdx: 1 },
]

/* ─── Per-staff weekly patterns ─────────────────────── */

type DayPattern = { start: string; end: string; type: "shift" | "overtime" | "leave" | "swap"; note?: string } | null

// Each array is Mon–Sun. null = day off.
const PATTERNS: Record<string, DayPattern[]> = {
  "s-amira": [
    { start: "06:30", end: "14:30", type: "shift" },
    { start: "07:00", end: "15:00", type: "shift" },
    null,
    { start: "06:30", end: "14:30", type: "shift" },
    { start: "07:00", end: "15:00", type: "shift" },
    null,
    { start: "08:00", end: "14:00", type: "swap", note: "Covering for Hiroki Y." },
  ],
  "s-daniel": [
    { start: "07:00", end: "15:30", type: "shift" },
    { start: "07:00", end: "15:30", type: "shift" },
    { start: "07:00", end: "15:30", type: "shift" },
    { start: "07:00", end: "19:00", type: "leave" },
    { start: "07:00", end: "15:30", type: "shift" },
    { start: "08:00", end: "16:00", type: "shift" },
    null,
  ],
  "s-hiroki": [
    { start: "07:45", end: "16:00", type: "shift" },
    null,
    { start: "07:00", end: "15:00", type: "shift" },
    { start: "07:00", end: "15:00", type: "shift" },
    null,
    { start: "07:00", end: "15:00", type: "shift" },
    null,
  ],
  "s-beatrice": [
    null,
    { start: "08:00", end: "16:30", type: "shift" },
    { start: "08:00", end: "16:30", type: "shift" },
    { start: "07:30", end: "16:00", type: "shift" },
    { start: "08:00", end: "16:30", type: "shift" },
    null,
    { start: "09:00", end: "17:00", type: "shift" },
  ],
  "s-tomas": [
    { start: "21:00", end: "24:00", type: "shift" },   // continues next day
    null,
    { start: "21:00", end: "24:00", type: "shift" },
    { start: "20:00", end: "24:00", type: "shift" },
    null,
    { start: "21:00", end: "24:00", type: "shift" },
    null,
  ],
  "s-clara": [
    null,
    { start: "21:30", end: "24:00", type: "shift" },
    null,
    null,
    { start: "21:00", end: "24:00", type: "shift" },
    null,
    { start: "21:00", end: "24:00", type: "shift" },
  ],
}

// Night continuations: entry on the NEXT day 00:00→end
const NIGHT_CONT: Record<string, { afterDay: number; end: string }[]> = {
  "s-tomas": [
    { afterDay: 0, end: "05:30" },  // Mon night → Tue morning
    { afterDay: 2, end: "05:30" },  // Wed night → Thu morning
    { afterDay: 3, end: "04:00" },  // Thu night → Fri morning
    { afterDay: 5, end: "05:30" },  // Sat night → Sun morning
  ],
  "s-clara": [
    { afterDay: 1, end: "06:00" },  // Tue night → Wed morning
    { afterDay: 4, end: "06:00" },  // Fri night → Sat morning
    { afterDay: 6, end: "06:00" },  // Sun night → Mon morning (next week, skip)
  ],
}

// Extra overtime entries
const OVERTIME: { staffId: string; day: number; start: string; end: string; note: string }[] = [
  { staffId: "s-hiroki", day: 2, start: "16:00", end: "20:00", note: "Covering evening gap" },
  { staffId: "s-clara", day: 3, start: "14:00", end: "20:00", note: "Covering for Daniel T. (leave)" },
]

/* ─── Generator ─────────────────────────────────────── */

const generateWeek = (weekStart: string): RotaWeek => {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const monday = new Date(weekStart + "T00:00:00")
  const days: RotaDay[] = []
  const entries: RotaEntry[] = []
  let entryId = 0

  // Build day ISO strings
  const dayIsos: string[] = []
  for (let d = 0; d < 7; d++) {
    const date = new Date(monday)
    date.setDate(date.getDate() + d)
    const iso = date.toISOString().slice(0, 10)
    dayIsos.push(iso)
    days.push({ date: iso, dayLabel: dayNames[d] })
  }

  // Generate entries from patterns
  for (const staff of STAFF) {
    const team = TEAMS[staff.teamIdx]
    const pattern = PATTERNS[staff.id]
    if (!pattern) continue

    for (let d = 0; d < 7; d++) {
      const p = pattern[d]
      if (!p) continue
      entries.push({
        id: `e-${++entryId}`,
        date: dayIsos[d],
        startTime: p.start,
        endTime: p.end,
        type: p.type,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        teamId: team.id,
        teamName: team.name,
        note: p.note,
      })
    }

    // Night continuations
    const conts = NIGHT_CONT[staff.id]
    if (conts) {
      for (const c of conts) {
        const nextDay = c.afterDay + 1
        if (nextDay >= 7) continue // skip cross-week
        entries.push({
          id: `e-${++entryId}`,
          date: dayIsos[nextDay],
          startTime: "00:00",
          endTime: c.end,
          type: "shift",
          staffId: staff.id,
          staffName: staff.name,
          staffRole: staff.role,
          teamId: team.id,
          teamName: team.name,
          note: "Night (cont.)",
        })
      }
    }
  }

  // Overtime entries
  for (const ot of OVERTIME) {
    const staff = STAFF.find((s) => s.id === ot.staffId)!
    const team = TEAMS[staff.teamIdx]
    entries.push({
      id: `e-${++entryId}`,
      date: dayIsos[ot.day],
      startTime: ot.start,
      endTime: ot.end,
      type: "overtime",
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      teamId: team.id,
      teamName: team.name,
      note: ot.note,
    })
  }

  const endDate = new Date(monday)
  endDate.setDate(endDate.getDate() + 6)
  const label = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`

  return { weekStart, weekLabel: label, homeId: "home-willow", homeName: "Willow House", days, entries }
}

const currentMonday = (): string => {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export { generateWeek }
export const MOCK_ROTA_WEEK = generateWeek(currentMonday())

export const MOCK_TEAM_ROSTERS: TeamRoster[] = TEAMS.map((t, idx) => ({
  id: t.id,
  name: t.name,
  members: STAFF.filter((s) => s.teamIdx === idx).map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  })),
}))
