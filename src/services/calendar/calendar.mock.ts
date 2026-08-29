/**
 * CalendarSvc mock — source of truth for `CalendarEvent`, `EventKind`,
 * and the `CALENDAR_EVENTS` seed feed. Lives inside the services tree
 * so `calendarService` can own its dependencies without reaching back
 * into `src/pages/Calendar/*`.
 *
 * The legacy `pages/Calendar/calendar.mock.ts` keeps only the
 * `KIND_LABEL` UI map (used by `CalendarView.tsx`) and imports the
 * `EventKind` type from here via `services/calendar/calendar.types`.
 */
export type EventKind =
  | "shift" //    normal assignment
  | "swap" //     swap request, pending
  | "overtime" // overtime request
  | "leave" //    approved leave
  | "unfilled" // slot unfilled, needs attention

/**
 * Calendar events power both the personal and the coverage (manager) views.
 *
 * The same event shape is used everywhere. Manager scope = all events
 * across the team; personal scope = only events where `mine === true`.
 *
 * Times are stored as 24h "HH:mm" strings keyed against `date`. The day
 * timeline reads `start` + `end` to lay events out as bars; cells show the
 * `start` time as a label. The legacy `time` field is kept so the old day
 * list view still works while we migrate.
 */
export type CalendarEvent = {
  id: string
  /** ISO date yyyy-mm-dd */
  date: string
  kind: EventKind
  title: string
  /** Optional time range for shifts. */
  time?: string
  /** 24h start time HH:mm — required for any timed event. */
  start?: string
  /** 24h end time HH:mm — required for any timed event. */
  end?: string
  person?: string
  ward?: string
  status?: "pending" | "approved" | "declined" | "awaiting_teammate"
  /** True for the signed-in user's own events; false for teammate events. */
  mine?: boolean
  /** Slot label for vacant events ("East wing · HCA"). */
  slot?: string
  /** Open requests already attached to this slot, e.g. ["overtime"]. */
  openRequests?: Array<"overtime" | "swap" | "leave">
}

/**
 * Cast over ~6 weeks around "today" (2026-04-11) so the preview is dense
 * enough to show patterns. Real app: derived from rota + requests.
 *
 * `mine` flag splits personal vs coverage scope. Events without `mine` are
 * teammate / vacant slots that only managers see.
 */
export const CALENDAR_EVENTS: CalendarEvent[] = [
  // ── Week 1 (current) ─ personal ────────────────────
  { id: "e1", date: "2026-04-07", kind: "shift", title: "Willow · Maple Unit", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e2", date: "2026-04-08", kind: "shift", title: "Willow · Maple Unit", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e3", date: "2026-04-09", kind: "overtime", title: "+4h Oakmoor cover", time: "15:00–19:00", start: "15:00", end: "19:00", status: "approved", ward: "Oakmoor", mine: true, person: "You" },
  { id: "e4", date: "2026-04-10", kind: "shift", title: "Willow · Maple Unit", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e5", date: "2026-04-11", kind: "shift", title: "Willow (on duty)", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e6", date: "2026-04-12", kind: "shift", title: "Willow · Maple Unit", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e7", date: "2026-04-13", kind: "shift", title: "Willow · Oak Unit", time: "14:00–22:00", start: "14:00", end: "22:00", ward: "Willow O.", mine: true, person: "You" },

  // ── Week 1 ─ teammate + vacant (manager only) ──────
  { id: "t1", date: "2026-04-07", kind: "shift", title: "Willow · Oak Unit", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow O.", person: "Daniel T." },
  { id: "t2", date: "2026-04-09", kind: "shift", title: "Willow · Oak Unit", time: "14:00–22:00", start: "14:00", end: "22:00", ward: "Willow O.", person: "Hiroki T." },
  { id: "t3", date: "2026-04-10", kind: "shift", title: "Willow Senior Cover", time: "07:00–19:00", start: "07:00", end: "19:00", ward: "Willow S.", person: "Tomás R." },
  { id: "v1", date: "2026-04-11", kind: "unfilled", title: "Vacant · Oak Unit", start: "14:00", end: "22:00", ward: "Willow O.", slot: "Oak Unit · Senior RSW" },
  { id: "v2", date: "2026-04-12", kind: "unfilled", title: "Vacant · Night cover", start: "21:00", end: "07:00", ward: "Willow", slot: "Night cover · RSW" },

  // ── Week 2 ─ personal + teammate ───────────────────
  { id: "e8", date: "2026-04-14", kind: "swap", title: "Swap request → Daniel", time: "07:00–15:00", start: "07:00", end: "15:00", status: "awaiting_teammate", mine: true, person: "You" },
  { id: "e9", date: "2026-04-15", kind: "shift", title: "Oakmoor", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Oakmoor", mine: true, person: "You" },
  { id: "e10", date: "2026-04-16", kind: "leave", title: "Personal leave", status: "approved", mine: true, person: "You" },
  { id: "e11", date: "2026-04-17", kind: "leave", title: "Personal leave", status: "approved", mine: true, person: "You" },
  { id: "e12", date: "2026-04-18", kind: "unfilled", title: "Vacant · Night", start: "21:00", end: "07:00", slot: "Night cover · RSW", openRequests: ["overtime"] },
  { id: "t4", date: "2026-04-14", kind: "shift", title: "Willow · Oak Unit", time: "14:00–22:00", start: "14:00", end: "22:00", ward: "Willow O.", person: "Beatrice M." },
  { id: "t5", date: "2026-04-15", kind: "leave", title: "Daniel — annual leave", status: "approved", person: "Daniel T." },
  { id: "v3", date: "2026-04-17", kind: "unfilled", title: "Vacant · Senior RSW RN", start: "15:00", end: "23:00", ward: "Rowan", slot: "Senior RSW" },

  // ── Week 3 ─ personal + teammate ───────────────────
  { id: "e13", date: "2026-04-20", kind: "shift", title: "Willow", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e14", date: "2026-04-21", kind: "shift", title: "Willow", time: "07:00–15:00", start: "07:00", end: "15:00", ward: "Willow M.", mine: true, person: "You" },
  { id: "e15", date: "2026-04-23", kind: "overtime", title: "+2h Willow", time: "15:00–17:00", start: "15:00", end: "17:00", status: "pending", mine: true, person: "You" },
  { id: "t6", date: "2026-04-20", kind: "shift", title: "Willow · Oak", time: "14:00–22:00", start: "14:00", end: "22:00", ward: "Willow O.", person: "Hiroki T." },
  { id: "v4", date: "2026-04-22", kind: "unfilled", title: "Vacant · Senior RSW", start: "07:00", end: "19:00", ward: "Willow S.", slot: "Senior RSW" },

  // ── Month-ahead (personal annual leave) ────────────
  { id: "e16", date: "2026-05-02", kind: "leave", title: "Annual leave · day 1", status: "approved", mine: true, person: "You" },
  { id: "e17", date: "2026-05-03", kind: "leave", title: "Annual leave · day 2", status: "approved", mine: true, person: "You" },
  { id: "e18", date: "2026-05-04", kind: "leave", title: "Annual leave · day 3", status: "approved", mine: true, person: "You" },
]
