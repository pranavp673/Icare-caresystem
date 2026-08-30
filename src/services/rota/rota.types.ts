/**
 * RotaSvc types — individual staff entries at arbitrary time granularity.
 *
 * Each entry represents one person's assignment for a time window within
 * a single calendar day. Night shifts crossing midnight are split into
 * two entries. Start/end times can be at any minute (07:15, 14:45, etc.).
 */

export type EntryType = "shift" | "overtime" | "leave" | "swap"

export type RotaEntry = {
  id: string
  date: string          // yyyy-mm-dd
  startTime: string     // HH:mm
  endTime: string       // HH:mm
  type: EntryType
  staffId: string
  staffName: string
  staffRole: string
  teamId: string
  teamName: string
  note?: string         // e.g. "Covering for Daniel T."
  /**
   * Set only when this shift covers a home other than the week's home
   * (`RotaWeek.homeId`) — the staff member is rostered elsewhere for the
   * day. Drives `services/access`'s auto-generated `HomeAccessGrant`
   * records (§2.1.1). Absent on every normal (same-home) entry.
   */
  coveringHomeId?: string
  coveringHomeName?: string
}

export type RotaDay = {
  date: string
  dayLabel: string
}

export type RotaWeek = {
  weekStart: string
  weekLabel: string
  homeId: string
  homeName: string
  days: RotaDay[]
  entries: RotaEntry[]
}

export type TeamRoster = {
  id: string
  name: string
  members: TeamMember[]
}

export type TeamMember = {
  id: string
  name: string
  role: string
}

export type ListWeekQuery = {
  homeId?: string
  weekStart: string
}
