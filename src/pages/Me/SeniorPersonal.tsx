import React, { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import "./SeniorPersonal.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import Modal from "../../components/Modal/Modal"
import LeaveCalendar from "../../components/LeaveCalendar/LeaveCalendar"
import "../../components/LeaveCalendar/LeaveCalendar.scss"
import WheelTimePicker from "../../components/DateTimeField/WheelTimePicker"
import "../../components/DateTimeField/WheelTimePicker.scss"
import {
  PageTransition,
  FadeIn,
  StaggerList,
  StaggerItem,
} from "../../components/Motion"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { meService } from "../../services"
import {
  SM_CALENDAR_EVENTS,
  HM_CALENDAR_EVENTS,
  CATEGORY_META,
} from "./seniorCalendar.mock"
import type { CalendarEvent, MeetingCategory } from "./seniorCalendar.mock"

/**
 * Manager-level personal view — calendar-centric.
 *
 * Replaces the shift-worker MyDashboard for manager-level users
 * (Deputy Manager, Home Manager, Senior Manager). Shows a week view
 * of meetings, home visits, catchups, and leave.
 * No working-hours ring, no shifts, no swaps.
 */

// ── Helpers ────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"]

const toIso = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const todayIso = (): string => toIso(new Date())

/** Get the Monday of the week containing `date`. */
const getMonday = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Build array of 5 weekday dates starting from Monday. */
const buildWeek = (monday: Date): Date[] =>
  Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

const formatDayHeader = (d: Date, today: string): string => {
  const iso = toIso(d)
  const label = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
  return iso === today ? `Today · ${label}` : label
}

const formatTimeRange = (e: CalendarEvent): string =>
  `${e.startTime} – ${e.endTime}`

const leaveKindFromLabel = (label: string): "annual" | "sick" | "unpaid" | "compassionate" => {
  const norm = label.trim().toLowerCase()
  if (norm.startsWith("sick")) return "sick"
  if (norm.startsWith("unpaid")) return "unpaid"
  if (norm.startsWith("compass")) return "compassionate"
  return "annual"
}

// ── Component ──────────────────────────────────────────

const SeniorPersonal: React.FC = () => {
  const { user, can } = useAuth()
  const toast = useToast()
  const today = useMemo(todayIso, [])

  // Senior Manager sees cross-home events; Home Manager / Deputy see home-specific
  const isSenior = can("system.company.edit")
  const calendarEvents = isSenior ? SM_CALENDAR_EVENTS : HM_CALENDAR_EVENTS

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const weekDays = useMemo(() => buildWeek(weekStart), [weekStart])

  const prevWeek = useCallback(() => {
    setWeekStart((d) => {
      const prev = new Date(d)
      prev.setDate(prev.getDate() - 7)
      return prev
    })
  }, [])

  const nextWeek = useCallback(() => {
    setWeekStart((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + 7)
      return next
    })
  }, [])

  const goToday = useCallback(() => {
    setWeekStart(getMonday(new Date()))
  }, [])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of calendarEvents) {
      const list = map.get(ev.date) ?? []
      list.push(ev)
      map.set(ev.date, list)
    }
    // Sort each day's events by start time
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [])

  // Upcoming meetings (next 5 from today onwards)
  const upcoming = useMemo(() => {
    return calendarEvents
      .filter((e) => e.date >= today && e.category !== "leave")
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
  }, [today])

  // Leave balance
  const leaveInfo = useMemo(() => {
    const leaveDays = calendarEvents.filter((e) => e.category === "leave")
    return { taken: 1, balance: 25, upcoming: leaveDays.length }
  }, [])

  // Leave modal state
  const [leaveOpen, setLeaveOpen] = useState(false)
  type LeaveDuration = "full" | "half-am" | "half-pm" | "custom"
  const [leaveDuration, setLeaveDuration] = useState<LeaveDuration>("full")
  const [leaveStartDate, setLeaveStartDate] = useState("")
  const [leaveEndDate, setLeaveEndDate] = useState("")
  const [leaveStartTime, setLeaveStartTime] = useState("09:00")
  const [leaveEndTime, setLeaveEndTime] = useState("17:00")

  const openLeaveModal = useCallback(() => {
    setLeaveDuration("full")
    setLeaveStartDate("")
    setLeaveEndDate("")
    setLeaveStartTime("09:00")
    setLeaveEndTime("17:00")
    setLeaveOpen(true)
  }, [])

  const changeDuration = useCallback((d: LeaveDuration) => {
    setLeaveDuration(d)
    if (d === "half-am") { setLeaveStartTime("09:00"); setLeaveEndTime("13:00") }
    else if (d === "half-pm") { setLeaveStartTime("13:00"); setLeaveEndTime("17:00") }
    else if (d === "custom") { setLeaveStartTime("09:00"); setLeaveEndTime("17:00") }
    if ((d === "half-am" || d === "half-pm") && leaveStartDate) setLeaveEndDate(leaveStartDate)
  }, [leaveStartDate])

  const handleLeaveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const kindLabel = String(form.get("leave_kind") || "Annual leave")
    const note = String(form.get("note") || "")
    if (!leaveStartDate) { toast.danger("Pick a date"); return }
    const effectiveEnd = leaveEndDate || leaveStartDate
    let startVal = leaveStartDate
    let endVal = effectiveEnd
    if (leaveDuration !== "full") {
      startVal = `${leaveStartDate}T${leaveStartTime}`
      endVal = `${leaveStartDate}T${leaveEndTime}`
    }
    void meService.submitLeave({
      kind: leaveKindFromLabel(kindLabel),
      startDate: startVal,
      endDate: endVal,
      note: note || undefined,
    }).then(() => {
      setLeaveOpen(false)
      toast.success("Leave request submitted")
    })
  }

  // Week label
  const weekLabel = useMemo(() => {
    const from = weekDays[0]
    const to = weekDays[4]
    const fromStr = from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    const toStr = to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    return `${fromStr} – ${toStr}`
  }, [weekDays])

  return (
    <PageTransition>
      <div className="sr-personal">
        <PageHeader
          eyebrow="PERSONAL"
          title={`${user.name.split(" ")[0]}'s Calendar`}
          subtitle="Your meetings, home visits, and leave — Monday to Friday, 9:00 – 17:00."
          actions={
            <>
              <Link to="/me" className="btn btn--ghost">
                Back to dashboard
              </Link>
              <button
                type="button"
                className="btn btn--primary"
                onClick={openLeaveModal}
              >
                Request leave
              </button>
            </>
          }
        />

        {/* ── Quick stats ──────────────────────────────── */}
        <FadeIn delay={0.05}>
          <div className="sr-personal__stats">
            <div className="sr-personal__stat">
              <span className="sr-personal__stat-value">{upcoming.length}</span>
              <span className="sr-personal__stat-label">Meetings this week</span>
            </div>
            <div className="sr-personal__stat">
              <span className="sr-personal__stat-value">
                {leaveInfo.balance - leaveInfo.taken}
              </span>
              <span className="sr-personal__stat-label">Leave days remaining</span>
            </div>
            <div className="sr-personal__stat">
              <span className="sr-personal__stat-value">{leaveInfo.upcoming}</span>
              <span className="sr-personal__stat-label">Leave days booked</span>
            </div>
          </div>
        </FadeIn>

        {/* ── Week nav ─────────────────────────────────── */}
        <FadeIn delay={0.08}>
          <div className="sr-week__nav">
            <button type="button" className="sr-week__nav-btn" onClick={prevWeek}>
              ‹ Prev
            </button>
            <div className="sr-week__nav-center">
              <span className="sr-week__nav-label">{weekLabel}</span>
              <button type="button" className="sr-week__today-btn" onClick={goToday}>
                Today
              </button>
            </div>
            <button type="button" className="sr-week__nav-btn" onClick={nextWeek}>
              Next ›
            </button>
          </div>
        </FadeIn>

        {/* ── Week calendar ────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="sr-week">
            {weekDays.map((day, idx) => {
              const iso = toIso(day)
              const isToday = iso === today
              const events = eventsByDate.get(iso) ?? []

              return (
                <div
                  key={iso}
                  className={`sr-week__day ${isToday ? "sr-week__day--today" : ""} ${events.length === 0 ? "sr-week__day--empty" : ""}`}
                >
                  <div className="sr-week__day-header">
                    <span className="sr-week__day-name">{DAY_NAMES[idx]}</span>
                    <span className={`sr-week__day-date ${isToday ? "sr-week__day-date--today" : ""}`}>
                      {formatDayHeader(day, today)}
                    </span>
                  </div>

                  <div className="sr-week__events">
                    {events.length === 0 ? (
                      <div className="sr-week__no-events">No meetings</div>
                    ) : (
                      events.map((ev) => (
                        <EventCard key={ev.id} event={ev} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </FadeIn>

        {/* ── Category legend ──────────────────────────── */}
        <FadeIn delay={0.12}>
          <div className="sr-personal__legend">
            {(Object.entries(CATEGORY_META) as [MeetingCategory, typeof CATEGORY_META[MeetingCategory]][]).map(
              ([key, meta]) => (
                <span key={key} className="sr-personal__legend-item">
                  <span
                    className="sr-personal__legend-dot"
                    style={{ background: meta.color }}
                  />
                  {meta.label}
                </span>
              )
            )}
          </div>
        </FadeIn>

        {/* ── Leave modal ──────────────────────────────── */}
        <Modal
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          eyebrow="LEAVE"
          title="Request time off"
          description={`You have ${leaveInfo.balance - leaveInfo.taken} days remaining this year.`}
          size="md"
        >
          <form onSubmit={handleLeaveSubmit}>
            <label className="form-field">
              <span className="form-field__label">Type</span>
              <select name="leave_kind" className="form-field__control" defaultValue="Annual leave">
                <option>Annual leave</option>
                <option>Sick leave</option>
                <option>Unpaid leave</option>
                <option>Compassionate</option>
              </select>
            </label>

            <div className="form-field">
              <span className="form-field__label">Duration</span>
              <div className="leave-duration">
                {([
                  { key: "full" as const, label: "Full day", sub: "All day" },
                  { key: "half-am" as const, label: "Half day", sub: "AM (09:00–13:00)" },
                  { key: "half-pm" as const, label: "Half day", sub: "PM (13:00–17:00)" },
                  { key: "custom" as const, label: "Custom", sub: "Pick times" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`leave-duration__opt ${leaveDuration === opt.key ? "is-active" : ""}`}
                    onClick={() => changeDuration(opt.key)}
                  >
                    <span className="leave-duration__label">{opt.label}</span>
                    <span className="leave-duration__sub">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <span className="form-field__label">
                {leaveDuration === "full" ? "Select dates" : "Select date"}
              </span>
              <LeaveCalendar
                startDate={leaveStartDate}
                endDate={leaveEndDate}
                onChange={(s, e) => { setLeaveStartDate(s); setLeaveEndDate(e) }}
                singleDate={leaveDuration !== "full"}
              />
            </div>

            {leaveDuration === "custom" && (
              <div className="form-field">
                <span className="form-field__label">Time range</span>
                <div className="leave-time-row">
                  <div className="leave-time-row__col">
                    <span className="leave-time-row__label">From</span>
                    <WheelTimePicker value={leaveStartTime} onChange={setLeaveStartTime} step={5} />
                  </div>
                  <div className="leave-time-row__col">
                    <span className="leave-time-row__label">To</span>
                    <WheelTimePicker value={leaveEndTime} onChange={setLeaveEndTime} step={5} />
                  </div>
                </div>
              </div>
            )}

            <label className="form-field">
              <span className="form-field__label">Note (optional)</span>
              <textarea name="note" className="form-field__control" placeholder="Anything your manager should know" />
            </label>

            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setLeaveOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Submit request</button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  )
}

// ── Event Card ─────────────────────────────────────────

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const meta = CATEGORY_META[event.category]
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`sr-event ${event.category === "leave" ? "sr-event--leave" : ""}`}
      style={{ "--ev-color": meta.color } as React.CSSProperties}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="sr-event__bar" />
      <div className="sr-event__content">
        <div className="sr-event__header">
          <span className="sr-event__time">{formatTimeRange(event)}</span>
          {event.recurring && (
            <span className="sr-event__recurring">{event.recurring}</span>
          )}
        </div>
        <div className="sr-event__title">{event.title}</div>
        {event.location && (
          <div className="sr-event__location">{event.location}</div>
        )}
        {expanded && (
          <div className="sr-event__detail">
            {event.attendees && event.attendees.length > 0 && (
              <div className="sr-event__attendees">
                <strong>With:</strong> {event.attendees.join(", ")}
              </div>
            )}
            {event.notes && (
              <div className="sr-event__notes">{event.notes}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SeniorPersonal
