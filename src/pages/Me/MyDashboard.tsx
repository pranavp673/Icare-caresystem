import React, { useEffect, useMemo, useState, useCallback } from "react"
import { motion } from "framer-motion"
import "./MyDashboard.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import { PageTransition, FadeIn, StaggerList, StaggerItem, staggerContainer, staggerItem, standardTransition } from "../../components/Motion"
import Modal from "../../components/Modal/Modal"
import DateTimeField from "../../components/DateTimeField/DateTimeField"
import TeammatePicker from "../../components/TeammatePicker/TeammatePicker"
import LeaveCalendar from "../../components/LeaveCalendar/LeaveCalendar"
import "../../components/LeaveCalendar/LeaveCalendar.scss"
import WheelTimePicker from "../../components/DateTimeField/WheelTimePicker"
import "../../components/DateTimeField/WheelTimePicker.scss"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { formatLocalDateTime } from "../../lib/format"
import { meService, swapService, accessService } from "../../services"
import type {
  MyRequest,
  MyShift,
  WorkingSnapshot,
  LeaveKind,
} from "../../services/me/me.types"
import type { HomeAccessGrant } from "../../services/access/access.types"

/**
 * ME-001 — My Dashboard.
 *
 * The professional's home base: "how am I tracking this week, what's next,
 * and what can I quickly change?" Everything heavy (calendar, team,
 * audit) lives behind dedicated tabs; this page's job is the first 30
 * seconds of the day.
 *
 * Sections:
 *   1. Working snapshot     — required vs worked, overtime, leave balance
 *   2. Quick actions        — request leave / swap (modals)
 *   3. Upcoming shifts      — next ~4 shifts, each with a "Swap" quick-button
 *   4. My open requests     — swap, overtime, leave with status; cancellable
 *
 * Data comes from `meService` (snapshot, shifts, own requests) and
 * `swapService.createSwap` (peer-to-peer swap creation — swaps do NOT go
 * through MeSvc's request endpoints). All buttons are wired — Request
 * swap / Request leave open modal forms, Cancel on an open request
 * removes it from the list, and per-shift Swap pre-fills the swap modal
 * for that shift.
 */

const prettyDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })


const progress = (snap: WorkingSnapshot) => {
  const denom = Math.max(snap.required, 1)
  return Math.min(Math.round((snap.worked / denom) * 100), 100)
}

const requestTone = (
  r: MyRequest
): "info" | "success" | "warning" | "neutral" => {
  if (r.status === "approved") return "success"
  if (r.status === "declined") return "warning"
  if (r.status === "awaiting_teammate") return "neutral"
  return "info"
}

/** Friendly status label, with the counterparty inlined for swap requests. */
const requestStatusLabel = (r: MyRequest): string => {
  if (r.status === "approved") return "approved"
  if (r.status === "declined") return "declined"
  if (r.status === "awaiting_teammate")
    return r.teammate ? `awaiting ${r.teammate}` : "awaiting teammate"
  return "pending"
}

const requestBadgeTone = (
  r: MyRequest
): "info" | "success" | "danger" | "warning" => {
  if (r.status === "approved") return "success"
  if (r.status === "declined") return "danger"
  if (r.status === "awaiting_teammate") return "warning"
  return "info"
}

/**
 * Maps the <select name="leave_kind"> display text to the `LeaveKind`
 * discriminator used on the service request. Keeps the UI free-form
 * label ("Annual leave") while sending a machine code.
 */
const leaveKindFromLabel = (label: string): LeaveKind => {
  const norm = label.trim().toLowerCase()
  if (norm.startsWith("sick")) return "sick"
  if (norm.startsWith("unpaid")) return "unpaid"
  if (norm.startsWith("compass")) return "compassionate"
  return "annual"
}

const MyDashboard: React.FC = () => {
  const { user, can } = useAuth()
  const toast = useToast()

  // Manager-tier users (Deputy Manager, Registered Manager, RI, System
  // Admin) work Mon–Fri 9–5 — no shifts, swaps, or rota. In practice
  // DashboardRouter sends them to the executive dashboard, but this flag
  // survives as belt-and-suspenders.
  const isSenior = can("home.view")
  const [range, setRange] = useState<"week" | "month">("week")

  const [snap, setSnap] = useState<WorkingSnapshot | null>(null)
  const [shifts, setShifts] = useState<MyShift[]>([])
  const [requests, setRequests] = useState<MyRequest[]>([])
  const [coverGrants, setCoverGrants] = useState<HomeAccessGrant[]>([])
  const [swapOpen, setSwapOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [prefillShiftId, setPrefillShiftId] = useState<string | null>(null)

  // Leave form state
  type LeaveDuration = "full" | "half-am" | "half-pm" | "custom"
  const [leaveDuration, setLeaveDuration] = useState<LeaveDuration>("full")
  const [leaveStartDate, setLeaveStartDate] = useState("")
  const [leaveEndDate, setLeaveEndDate] = useState("")
  const [leaveStartTime, setLeaveStartTime] = useState("07:00")
  const [leaveEndTime, setLeaveEndTime] = useState("15:00")

  const handleLeaveDatesChange = useCallback(
    (start: string, end: string) => {
      setLeaveStartDate(start)
      setLeaveEndDate(end)
    },
    []
  )

  // Reset leave form when modal opens/closes
  const openLeaveModal = useCallback(() => {
    setLeaveDuration("full")
    setLeaveStartDate("")
    setLeaveEndDate("")
    setLeaveStartTime("07:00")
    setLeaveEndTime("15:00")
    setLeaveOpen(true)
  }, [])

  // When duration type changes, set sensible default times
  const changeDuration = useCallback((d: LeaveDuration) => {
    setLeaveDuration(d)
    if (d === "half-am") {
      setLeaveStartTime("07:00")
      setLeaveEndTime("13:00")
    } else if (d === "half-pm") {
      setLeaveStartTime("13:00")
      setLeaveEndTime("19:00")
    } else if (d === "custom") {
      setLeaveStartTime("07:00")
      setLeaveEndTime("15:00")
    }
    // For half-day, force single date
    if (d === "half-am" || d === "half-pm") {
      if (leaveStartDate) setLeaveEndDate(leaveStartDate)
    }
  }, [leaveStartDate])

  // Initial load: personal snapshot + shifts + requests in parallel.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [s, u, r] = await Promise.all([
        meService.getSnapshot(range),
        meService.getUpcomingShifts(4),
        meService.getMyRequests("all"),
      ])
      if (cancelled) return
      setSnap(s)
      setShifts(u)
      setRequests(r)
    })()
    return () => {
      cancelled = true
    }
  }, [range])

  // Cross-home cover (§2.1.1) — situational awareness only, not an
  // access gate (Common Files/resident data are already universal).
  useEffect(() => {
    let cancelled = false
    void accessService.listMyGrants(user.id).then((rows) => {
      if (!cancelled) setCoverGrants(rows)
    })
    return () => {
      cancelled = true
    }
  }, [user.id])

  const pct = useMemo(() => (snap ? progress(snap) : 0), [snap])
  const remaining = snap ? Math.max(snap.required - snap.worked, 0) : 0

  const prefillShift = useMemo(
    () => shifts.find((s) => s.id === prefillShiftId) ?? null,
    [prefillShiftId, shifts]
  )

  // Pre-fill the swap modal's datetime fields from the shift the user
  // clicked "Swap" on, falling back to the standard Day shift
  // (07:00–15:00) — the most common pattern in our rota config.
  const { prefillFromIso, prefillToIso } = useMemo(() => {
    if (prefillShift) {
      return {
        prefillFromIso: `${prefillShift.date}T${prefillShift.start}`,
        prefillToIso: `${prefillShift.date}T${prefillShift.end}`,
      }
    }
    const d = new Date()
    d.setHours(7, 0, 0, 0)
    const e = new Date(d)
    e.setHours(15, 0, 0, 0)
    return { prefillFromIso: toLocalIso(d), prefillToIso: toLocalIso(e) }
  }, [prefillShift])

  const cancelRequest = (r: MyRequest) => {
    // Optimistic local remove — swap cancels route to SwapSvc, leave and
    // overtime cancels route to MeSvc. Both return `void`.
    setRequests((list) => list.filter((x) => x.id !== r.id))
    const call =
      r.kind === "swap"
        ? swapService.cancelSwap(r.id)
        : meService.withdrawRequest(r.id)
    void call.then(() => {
      toast.info("Request withdrawn", { description: r.summary })
    })
  }

  const handleSwapSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const from = String(form.get("from") || "")
    const to = String(form.get("to") || "")
    const teammate = String(form.get("teammate") || "").trim()
    const note = String(form.get("note") || "")

    if (!from || !to) {
      toast.danger("Pick from and to times", {
        description: "Both shift slots are needed for a swap.",
      })
      return
    }
    if (!teammate) {
      // Teammate is mandatory — swaps go directly to them, not to a manager.
      toast.danger("Choose a teammate", {
        description: "Swap requests need someone to send the request to.",
      })
      return
    }

    void swapService
      .createSwap({
        fromStart: from,
        toStart: to,
        counterpartyId: teammate,
        note: note || undefined,
      })
      .then((created) => {
        // Server echoes the created MyRequest; we re-render the summary
        // with the friendlier human-readable formatLocalDateTime output
        // instead of the raw iso strings.
        const fromLabel = formatLocalDateTime(from)
        const toLabel = formatLocalDateTime(to)
        const nice: MyRequest = {
          ...created,
          summary: note
            ? `Swap ${fromLabel} → ${toLabel} — ${note}`
            : `Swap ${fromLabel} → ${toLabel}`,
          teammate,
        }
        setRequests((list) => [nice, ...list])
        setSwapOpen(false)
        setPrefillShiftId(null)
        toast.success("Swap request sent", {
          description: `${teammate} will accept or decline directly. Your manager can see it but won't action it.`,
        })
      })
  }

  const handleLeaveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const kindLabel = String(form.get("leave_kind") || "Annual leave")
    const note = String(form.get("note") || "")

    if (!leaveStartDate) {
      toast.danger("Pick a date", {
        description: "Select at least a start date on the calendar.",
      })
      return
    }

    const effectiveEnd = leaveEndDate || leaveStartDate

    // Build start/end with times for partial-day leaves
    let startVal = leaveStartDate
    let endVal = effectiveEnd
    if (leaveDuration !== "full") {
      startVal = `${leaveStartDate}T${leaveStartTime}`
      endVal = `${leaveStartDate}T${leaveEndTime}`
    }

    // Duration label for summary
    let durationLabel = ""
    if (leaveDuration === "half-am") durationLabel = " (AM)"
    else if (leaveDuration === "half-pm") durationLabel = " (PM)"
    else if (leaveDuration === "custom") durationLabel = ` (${leaveStartTime}–${leaveEndTime})`

    void meService
      .submitLeave({
        kind: leaveKindFromLabel(kindLabel),
        startDate: startVal,
        endDate: endVal,
        note: note || undefined,
      })
      .then((created) => {
        const dateRange =
          effectiveEnd !== leaveStartDate
            ? `${prettyDate(leaveStartDate)} – ${prettyDate(effectiveEnd)}`
            : prettyDate(leaveStartDate)
        const nice: MyRequest = {
          ...created,
          summary: note
            ? `${kindLabel}${durationLabel} · ${dateRange} — ${note}`
            : `${kindLabel}${durationLabel} · ${dateRange}`,
        }
        setRequests((list) => [nice, ...list])
        setLeaveOpen(false)
        toast.success("Leave request submitted", {
          description: `${dateRange}${durationLabel}`,
        })
      })
  }

  const openSwapForShift = (shiftId: string) => {
    setPrefillShiftId(shiftId)
    setSwapOpen(true)
  }

  return (
    <PageTransition><div className="my-dash">
      <PageHeader
        eyebrow={isSenior ? "PERSONAL" : ""}
        title={isSenior ? "My schedule & leave" : `Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={
          isSenior
            ? "Monday – Friday, 9:00 – 17:00. Request leave below."
            : "Your working snapshot, next shifts, and open requests — all in one place."
        }
        actions={
          <>
            {!isSenior && <HomeFilter />}
            {!isSenior && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPrefillShiftId(null)
                  setSwapOpen(true)
                }}
              >
                Request swap
              </button>
            )}
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

      {/* ── Cross-home cover banner (§2.1.1) ──────────── */}
      {coverGrants.map((g) => (
        <FadeIn key={g.id}>
          <div className="my-dash__cover-banner">
            You have delegated access to cover at <strong>{g.homeName}</strong> on {g.shiftDate}
            {g.shiftNote ? ` — ${g.shiftNote}` : ""}.
          </div>
        </FadeIn>
      ))}

      {/* ── Working snapshot ──────────────────────────── */}
      <FadeIn delay={0.05}><section className="my-dash__snapshot card card--padded">
        <header className="my-dash__snapshot-head">
          <div>
            <div className="section-title">Working snapshot</div>
            <div className="eyebrow">{snap?.rangeLabel ?? "Loading…"}</div>
          </div>
          <div
            className="my-dash__range-switch"
            role="tablist"
            aria-label="Time range"
          >
            <button
              type="button"
              role="tab"
              aria-selected={range === "week"}
              className={`my-dash__range-btn ${range === "week" ? "is-active" : ""}`}
              onClick={() => setRange("week")}
            >
              Week
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={range === "month"}
              className={`my-dash__range-btn ${range === "month" ? "is-active" : ""}`}
              onClick={() => setRange("month")}
            >
              Month
            </button>
          </div>
        </header>

        <div className="my-dash__ring-row">
          <div className="my-dash__ring" aria-label={`${pct}% of hours worked`}>
            <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="my-dash__ring-track" />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                className="my-dash__ring-fill"
                strokeDasharray={`${(pct / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                initial={{ strokeDasharray: "0 327" }}
                animate={{ strokeDasharray: `${(pct / 100) * 327} 327` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
            </svg>
            <div className="my-dash__ring-center">
              <div className="my-dash__ring-value">
                {snap?.worked ?? 0}
                <span className="my-dash__ring-unit">h</span>
              </div>
              <div className="my-dash__ring-hint">of {snap?.required ?? 0} h</div>
            </div>
          </div>
          <motion.ul className="my-dash__metrics" variants={staggerContainer} initial="initial" animate="animate">
            <motion.li variants={staggerItem} transition={standardTransition}>
              <span className="my-dash__metric-label">Required</span>
              <span className="my-dash__metric-value">{snap?.required ?? 0} h</span>
            </motion.li>
            <motion.li variants={staggerItem} transition={standardTransition}>
              <span className="my-dash__metric-label">Remaining</span>
              <span className="my-dash__metric-value">{remaining} h</span>
            </motion.li>
            <motion.li variants={staggerItem} transition={standardTransition}>
              <span className="my-dash__metric-label">Overtime</span>
              <span className="my-dash__metric-value">{snap?.overtime ?? 0} h</span>
            </motion.li>
            <motion.li variants={staggerItem} transition={standardTransition}>
              <span className="my-dash__metric-label">Leave used</span>
              <span className="my-dash__metric-value">
                {snap?.leaveTaken ?? 0}{" "}
                <span className="muted">/ {snap?.leaveBalance ?? 0} d</span>
              </span>
            </motion.li>
          </motion.ul>
        </div>
      </section></FadeIn>

      {/* ── Upcoming + requests ───────────────────────── */}
      <FadeIn delay={0.1}><div className="my-dash__grid">
        <section className="card card--padded">
          <header className="section-head">
            <h3 className="section-title">{isSenior ? "My schedule" : "Upcoming shifts"}</h3>
            <span className="eyebrow">Next {shifts.length}</span>
          </header>
          <StaggerList className="my-dash__shifts">
            {shifts.map((s) => (
              <StaggerItem
                key={s.id}
                className={`my-dash__shift my-dash__shift--${s.status}`}
              >
                <div className="my-dash__shift-date">
                  <div className="my-dash__shift-day">{prettyDate(s.date)}</div>
                  <div className="my-dash__shift-time">
                    {s.start} – {s.end}
                  </div>
                </div>
                <div className="my-dash__shift-where">
                  <div className="my-dash__shift-role">{s.role}</div>
                  <div className="my-dash__shift-ward">{s.ward}</div>
                </div>
                <div className="my-dash__shift-status">
                  {s.status === "in_progress" && (
                    <span className="badge badge--success">On duty</span>
                  )}
                  {s.status === "planned" && (
                    <span className="badge">Planned</span>
                  )}
                  {s.status === "completed" && (
                    <span className="badge badge--neutral">Done</span>
                  )}
                </div>
                {!isSenior && s.status !== "completed" && (
                  <button
                    type="button"
                    className="btn btn--ghost my-dash__shift-swap"
                    onClick={() => openSwapForShift(s.id)}
                  >
                    Swap
                  </button>
                )}
              </StaggerItem>
            ))}
          </StaggerList>
        </section>

        <section className="card card--padded">
          <header className="section-head">
            <h3 className="section-title">My open requests</h3>
            <span className="eyebrow">{requests.length} active</span>
          </header>
          {requests.length === 0 ? (
            <p className="my-dash__empty">No open requests — you're all caught up.</p>
          ) : (
            <StaggerList className="my-dash__reqs">
              {requests.map((r) => (
                <StaggerItem
                  key={r.id}
                  className={`my-dash__req my-dash__req--${requestTone(r)}`}
                >
                  <div className="my-dash__req-kind">
                    {r.kind === "swap" && "↔"}
                    {r.kind === "overtime" && "+"}
                    {r.kind === "leave" && "◷"}
                  </div>
                  <div className="my-dash__req-body">
                    <div className="my-dash__req-summary">{r.summary}</div>
                    <div className="my-dash__req-when">{r.when}</div>
                  </div>
                  <span className={`badge badge--${requestBadgeTone(r)}`}>
                    {requestStatusLabel(r)}
                  </span>
                  {(r.status === "pending" ||
                    r.status === "awaiting_teammate") && (
                    <button
                      type="button"
                      className="btn btn--ghost my-dash__req-cancel"
                      onClick={() => cancelRequest(r)}
                      aria-label="Withdraw request"
                      title="Withdraw"
                    >
                      ×
                    </button>
                  )}
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
      </div></FadeIn>

      {/* ── Swap modal (not for manager-tier users) ─────── */}
      {!isSenior && <Modal
        open={swapOpen}
        onClose={() => {
          setSwapOpen(false)
          setPrefillShiftId(null)
        }}
        eyebrow="SWAP"
        title="Request a shift swap"
        description={
          prefillShift
            ? `${prettyDate(prefillShift.date)} · ${prefillShift.start}–${prefillShift.end} — your teammate has to accept this directly.`
            : "Pick the shift you want to hand over and the teammate who'll take it. The request goes straight to them, not to your manager."
        }
        size="md"
      >
        <form onSubmit={handleSwapSubmit}>
          <div className="form-row">
            <DateTimeField
              name="from"
              label="From (your shift)"
              required
              defaultValue={prefillFromIso}
            />
            <DateTimeField
              name="to"
              label="To (their shift)"
              required
              defaultValue={prefillToIso}
            />
          </div>
          <TeammatePicker
            name="teammate"
            label="Teammate"
            required
            wide={false}
            hint="Who you're sending this swap to — they'll accept or decline."
          />
          <label className="form-field">
            <span className="form-field__label">Note (optional)</span>
            <textarea
              name="note"
              className="form-field__control"
              placeholder="Why this swap helps you both"
            />
          </label>
          <div className="modal__form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setSwapOpen(false)
                setPrefillShiftId(null)
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Send to teammate
            </button>
          </div>
        </form>
      </Modal>}

      {/* ── Leave modal ────────────────────────────────── */}
      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        eyebrow="LEAVE"
        title="Request time off"
        description={`You have ${(snap?.leaveBalance ?? 0) - (snap?.leaveTaken ?? 0)} days remaining this year.`}
        size="md"
      >
        <form onSubmit={handleLeaveSubmit}>
          {/* Leave type */}
          <label className="form-field">
            <span className="form-field__label">Type</span>
            <select
              name="leave_kind"
              className="form-field__control"
              defaultValue="Annual leave"
            >
              <option>Annual leave</option>
              <option>Sick leave</option>
              <option>Unpaid leave</option>
              <option>Compassionate</option>
            </select>
          </label>

          {/* Duration type */}
          <div className="form-field">
            <span className="form-field__label">Duration</span>
            <div className="leave-duration">
              <button
                type="button"
                className={`leave-duration__opt ${leaveDuration === "full" ? "is-active" : ""}`}
                onClick={() => changeDuration("full")}
              >
                <span className="leave-duration__label">Full day</span>
                <span className="leave-duration__sub">All day</span>
              </button>
              <button
                type="button"
                className={`leave-duration__opt ${leaveDuration === "half-am" ? "is-active" : ""}`}
                onClick={() => changeDuration("half-am")}
              >
                <span className="leave-duration__label">Half day</span>
                <span className="leave-duration__sub">AM (07:00–13:00)</span>
              </button>
              <button
                type="button"
                className={`leave-duration__opt ${leaveDuration === "half-pm" ? "is-active" : ""}`}
                onClick={() => changeDuration("half-pm")}
              >
                <span className="leave-duration__label">Half day</span>
                <span className="leave-duration__sub">PM (13:00–19:00)</span>
              </button>
              <button
                type="button"
                className={`leave-duration__opt ${leaveDuration === "custom" ? "is-active" : ""}`}
                onClick={() => changeDuration("custom")}
              >
                <span className="leave-duration__label">Custom</span>
                <span className="leave-duration__sub">Pick times</span>
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="form-field">
            <span className="form-field__label">
              {leaveDuration === "full" ? "Select dates" : "Select date"}
            </span>
            <LeaveCalendar
              startDate={leaveStartDate}
              endDate={leaveEndDate}
              onChange={handleLeaveDatesChange}
              singleDate={leaveDuration !== "full"}
            />
          </div>

          {/* Time pickers — visible for custom hours */}
          {leaveDuration === "custom" && (
            <div className="form-field">
              <span className="form-field__label">Time range</span>
              <div className="leave-time-row">
                <div className="leave-time-row__col">
                  <span className="leave-time-row__label">From</span>
                  <WheelTimePicker
                    value={leaveStartTime}
                    onChange={setLeaveStartTime}
                    step={5}
                  />
                </div>
                <div className="leave-time-row__col">
                  <span className="leave-time-row__label">To</span>
                  <WheelTimePicker
                    value={leaveEndTime}
                    onChange={setLeaveEndTime}
                    step={5}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <label className="form-field">
            <span className="form-field__label">Note (optional)</span>
            <textarea
              name="note"
              className="form-field__control"
              placeholder="Anything your manager should know"
            />
          </label>

          <div className="modal__form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setLeaveOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Submit request
            </button>
          </div>
        </form>
      </Modal>
    </div></PageTransition>
  )
}

/** Convert a Date to a `yyyy-mm-ddTHH:mm` local-ISO string for datetime-local. */
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export default MyDashboard
