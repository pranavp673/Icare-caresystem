import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./TimeSheetHub.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import Modal from "../../components/Modal/Modal"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { PageTransition, StaggerList, StaggerItem } from "../../components/Motion"
import { resolveStaffScope } from "../../services/team/staffScope"
import {
  teamService,
  manageService,
  meService,
  rotaService,
  timeSheetService,
  supervisionService,
} from "../../services"
import type { TeamMember } from "../../services/team/team.types"
import type { ApprovalItem, SwapActivity } from "../../services/manage/manage.types"
import type { RotaEntry } from "../../services/rota/rota.types"
import type { OnCallEntry, PayrollPeriod } from "../../services/timeSheet/timeSheet.types"
import type { SupervisionRecord } from "../../services/supervision/supervision.types"
import type { LeaveKind } from "../../services/me/me.types"

/**
 * TIMESHEET-001 — Time Sheet (FR-TS) + Supervision (FR-SUP).
 *
 * Standalone top-level page (FR-TS-01) — not nested in Team or Manage
 * Hub, even though it aggregates the same underlying leave/overtime/swap
 * data. No route guard; every role sees at least their own data, per the
 * staff-scope cascade in `services/team/staffScope.ts`.
 *
 * The Monthly Rota tab shows the current home's rota unfiltered by staff
 * selection — `RotaEntry.staffId` uses a separate mock id space
 * ("s-amira" etc, in rota.mock.ts) that doesn't line up with
 * `TeamMember.id` ("tm-1" etc), a pre-existing disconnect between the
 * Rota and Team mock datasets that's out of scope to fix here. Leave &
 * Overtime and Swaps DO filter correctly — `ApprovalItem`/`SwapActivity`
 * already use TeamMember ids for `requesterId`.
 */

type Tab = "rota" | "leave" | "swaps" | "oncall" | "payroll" | "supervision"

const PAYROLL_MONTH = "2026-06"

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

/** Monday of the week containing `date`. */
const mondayOf = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

const toIso = (d: Date): string => d.toISOString().slice(0, 10)

const TimeSheetHub: React.FC = () => {
  const { user, activeHome, can } = useAuth()
  const toast = useToast()
  const isSystemAdmin = can("system.company.edit")
  const canOnCallEdit = can("onCall.edit")
  const canPayrollView = can("payroll.view")
  const canSupervisionLog = can("supervision.log")

  const homeId = activeHome?.id ?? user.primaryHome.id
  const myIdentity = user.teamMemberId ?? user.id

  const [tab, setTab] = useState<Tab>("rota")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void teamService
      .listMembers({ homes: user.homes.map((h) => h.name) })
      .then((list) => {
        if (!cancelled) setMembers(list)
      })
    return () => {
      cancelled = true
    }
  }, [user.homes])

  const scope = useMemo(
    () => resolveStaffScope(user, members, { hasHomeView: can("home.view") }),
    [user, members, can]
  )
  const activeIds = useMemo(
    () => (selectedId ? [selectedId] : scope.map((m) => m.id)),
    [selectedId, scope]
  )
  const showSelector = scope.length > 1

  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [swaps, setSwaps] = useState<SwapActivity[]>([])
  const [rotaEntries, setRotaEntries] = useState<RotaEntry[]>([])
  const [onCall, setOnCall] = useState<OnCallEntry[]>([])
  const [payroll, setPayroll] = useState<PayrollPeriod | null>(null)
  const [supervisionRecords, setSupervisionRecords] = useState<SupervisionRecord[]>([])

  useEffect(() => {
    if (activeIds.length === 0) return
    let cancelled = false
    void Promise.all([
      manageService.listApprovals({ requesterIds: activeIds }),
      manageService.listSwaps({ memberIds: activeIds }),
    ]).then(([a, s]) => {
      if (cancelled) return
      setApprovals(a)
      setSwaps(s)
    })
    return () => {
      cancelled = true
    }
  }, [activeIds])

  useEffect(() => {
    let cancelled = false
    const monday = mondayOf(new Date())
    const weekStarts = [-1, 0, 1, 2].map((offset) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + offset * 7)
      return toIso(d)
    })
    void Promise.all(
      weekStarts.map((weekStart) => rotaService.listWeek({ homeId, weekStart }))
    ).then((weeks) => {
      if (cancelled) return
      setRotaEntries(weeks.flatMap((w) => w.entries))
    })
    return () => {
      cancelled = true
    }
  }, [homeId])

  useEffect(() => {
    let cancelled = false
    void timeSheetService.listOnCall(homeId).then((list) => {
      if (!cancelled) setOnCall(list)
    })
    void timeSheetService.getPayrollPeriod(homeId, PAYROLL_MONTH).then((p) => {
      if (!cancelled) setPayroll(p)
    })
    return () => {
      cancelled = true
    }
  }, [homeId])

  useEffect(() => {
    let cancelled = false
    void supervisionService.listSupervision(scope.map((m) => m.id)).then((list) => {
      if (!cancelled) setSupervisionRecords(list)
    })
    return () => {
      cancelled = true
    }
  }, [scope])

  // ── Modals ───────────────────────────────────────────
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [onCallOpen, setOnCallOpen] = useState(false)
  const [supervisionTarget, setSupervisionTarget] = useState<TeamMember | null>(null)

  const handleRequestLeave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const startDate = String(form.get("startDate") || "")
    const endDate = String(form.get("endDate") || startDate)
    if (!startDate) {
      toast.danger("Pick a start date")
      return
    }
    void meService
      .submitLeave({
        kind: form.get("kind") as LeaveKind,
        startDate,
        endDate,
        note: String(form.get("note") || "") || undefined,
      })
      .then(() => {
        setLeaveOpen(false)
        toast.success("Leave request submitted")
      })
  }

  const handleSetOnCall = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const staffId = String(form.get("staffId") || "")
    const staff = scope.find((m) => m.id === staffId)
    const date = String(form.get("date") || "")
    if (!staff || !date) {
      toast.danger("Pick a staff member and date")
      return
    }
    void timeSheetService
      .setOnCall({
        homeId,
        staffId: staff.id,
        staffName: staff.name,
        date,
        notes: String(form.get("notes") || "") || undefined,
      })
      .then((entry) => {
        setOnCall((list) => [...list, entry].sort((a, b) => a.date.localeCompare(b.date)))
        setOnCallOpen(false)
        toast.success("On-call updated")
      })
  }

  const handleSignOff = () => {
    if (!payroll) return
    void timeSheetService.signOffPayroll(payroll.id, user.name).then((updated) => {
      setPayroll(updated)
      toast.success("Payroll signed off")
    })
  }

  const canSuperviseTarget = (target: TeamMember): boolean =>
    canSupervisionLog &&
    (target.supervisorId === myIdentity ||
      isSystemAdmin ||
      (user.homes.length > 1 && target.tier === "registered_manager"))

  const handleLogSupervision = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supervisionTarget) return
    const form = new FormData(e.currentTarget)
    const date = String(form.get("date") || "")
    const notes = String(form.get("notes") || "")
    if (!date || !notes) {
      toast.danger("Date and notes are required")
      return
    }
    void supervisionService
      .createSupervisionRecord({
        supervisorId: myIdentity,
        superviseeId: supervisionTarget.id,
        homeId,
        date,
        notes,
      })
      .then((record) => {
        setSupervisionRecords((list) => [record, ...list])
        setSupervisionTarget(null)
        toast.success(`Supervision logged for ${supervisionTarget.name}`)
      })
  }

  const myRecords = useMemo(
    () => supervisionRecords.filter((r) => r.superviseeId === myIdentity),
    [supervisionRecords, myIdentity]
  )
  const teamRecords = useMemo(
    () => supervisionRecords.filter((r) => r.superviseeId !== myIdentity),
    [supervisionRecords, myIdentity]
  )
  const nameFor = (id: string): string => {
    if (id === myIdentity) return "You"
    return members.find((m) => m.id === id)?.name ?? (id === user.id ? user.name : id)
  }

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "rota", label: "Monthly Rota" },
    { id: "leave", label: `Leave & Overtime (${approvals.length})` },
    { id: "swaps", label: `Swaps (${swaps.length})` },
    { id: "oncall", label: `On-Call (${onCall.length})` },
    { id: "payroll", label: "Payroll", hidden: !canPayrollView },
    { id: "supervision", label: `Supervision (${supervisionRecords.length})` },
  ]

  const emptyState = (label: string) => (
    <div className="time-sheet__empty">
      <p>{label}</p>
    </div>
  )

  return (
    <PageTransition>
      <div className="time-sheet">
        <PageHeader
          eyebrow="TIME SHEET"
          title="Time Sheet"
          subtitle="Rota, leave, overtime, swaps, on-call, and supervision — scoped to who you're allowed to see."
          actions={
            <>
              {showSelector && (
                <select
                  className="time-sheet__staff-select"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value || null)}
                  aria-label="Filter by staff member"
                >
                  <option value="">Everyone in scope ({scope.length})</option>
                  {scope.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id === myIdentity ? `${m.name} (me)` : m.name}
                    </option>
                  ))}
                </select>
              )}
              <HomeFilter />
            </>
          }
        />

        <div className="time-sheet__tabs" role="tablist">
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`time-sheet__tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "rota" && (
            <motion.section
              key="rota"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">Monthly rota</h2>
                <span className="eyebrow">{rotaEntries.length} shifts this month</span>
              </header>
              {rotaEntries.length === 0
                ? emptyState("No rota entries for this period.")
                : (
                  <StaggerList className="time-sheet__rota">
                    {rotaEntries.map((e) => (
                      <StaggerItem key={e.id} className="time-sheet__rota-row">
                        <div className="time-sheet__rota-when">{formatDate(e.date)}</div>
                        <div className="time-sheet__rota-body">
                          <span className="time-sheet__rota-name">{e.staffName}</span>
                          <span className="time-sheet__rota-role">{e.staffRole}</span>
                        </div>
                        <div className="time-sheet__rota-time">
                          {e.startTime}–{e.endTime}
                        </div>
                        <span className={`badge time-sheet__rota-type--${e.type}`}>{e.type}</span>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "leave" && (
            <motion.section
              key="leave"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">Leave &amp; overtime</h2>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setLeaveOpen(true)}>
                  Request leave
                </button>
              </header>
              {approvals.length === 0
                ? emptyState("Nothing pending.")
                : (
                  <StaggerList className="time-sheet__approvals">
                    {approvals.map((a) => (
                      <StaggerItem key={a.id} className="time-sheet__approval">
                        <div className="time-sheet__approval-body">
                          <span className="time-sheet__approval-name">{a.requester.name}</span>
                          <span className="time-sheet__approval-summary">{a.summary}</span>
                        </div>
                        <span className={`badge ${a.status === "pending" ? "badge--warning" : "badge--success"}`}>
                          {a.status}
                        </span>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "swaps" && (
            <motion.section
              key="swaps"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">Swaps</h2>
              </header>
              {swaps.length === 0
                ? emptyState("No swap activity.")
                : (
                  <StaggerList className="time-sheet__approvals">
                    {swaps.map((s) => (
                      <StaggerItem key={s.id} className="time-sheet__approval">
                        <div className="time-sheet__approval-body">
                          <span className="time-sheet__approval-name">
                            {s.requester.name} → {s.counterparty.name}
                          </span>
                          <span className="time-sheet__approval-summary">{s.summary}</span>
                        </div>
                        <span className="badge">{s.status.replace("_", " ")}</span>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "oncall" && (
            <motion.section
              key="oncall"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">On-call</h2>
                {canOnCallEdit && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setOnCallOpen(true)}>
                    Set on-call
                  </button>
                )}
              </header>
              {onCall.length === 0
                ? emptyState("No on-call cover scheduled.")
                : (
                  <StaggerList className="time-sheet__oncall">
                    {onCall.map((o) => (
                      <StaggerItem key={o.id} className="time-sheet__oncall-row">
                        <span className="time-sheet__oncall-date">{formatDate(o.date)}</span>
                        <span className="time-sheet__oncall-name">{o.staffName}</span>
                        {o.notes && <span className="time-sheet__oncall-notes">{o.notes}</span>}
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "payroll" && canPayrollView && (
            <motion.section
              key="payroll"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">Payroll — {PAYROLL_MONTH}</h2>
                {payroll && !payroll.signedOffAt && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={handleSignOff}>
                    Sign off &amp; send to Accounts
                  </button>
                )}
              </header>
              {!payroll
                ? emptyState("No payroll period on file for this month.")
                : (
                  <>
                    <StaggerList className="time-sheet__payroll">
                      {payroll.staffSummaries.map((s) => (
                        <StaggerItem key={s.staffId} className="time-sheet__payroll-row">
                          <span className="time-sheet__payroll-name">{s.staffName}</span>
                          <span className="time-sheet__payroll-stat">{s.hoursWorked}h worked</span>
                          <span className="time-sheet__payroll-stat">{s.leaveDays} leave days</span>
                          <span className="time-sheet__payroll-stat">{s.overtimeHours}h overtime</span>
                        </StaggerItem>
                      ))}
                    </StaggerList>
                    <div className="time-sheet__payroll-status">
                      {payroll.signedOffAt
                        ? `Signed off by ${payroll.signedOffBy} · ${formatDate(payroll.signedOffAt)}`
                        : "Not yet signed off."}
                    </div>
                  </>
                )}
            </motion.section>
          )}

          {tab === "supervision" && (
            <motion.section
              key="supervision"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="time-sheet__panel-head">
                <h2 className="section-title">My supervision</h2>
              </header>
              {myRecords.length === 0
                ? emptyState("No supervision records for you yet.")
                : (
                  <StaggerList className="time-sheet__supervision">
                    {myRecords.map((r) => (
                      <StaggerItem key={r.id} className="time-sheet__supervision-row">
                        <div className="time-sheet__supervision-body">
                          <span className="time-sheet__supervision-with">
                            With {nameFor(r.supervisorId)}
                          </span>
                          <span className="time-sheet__supervision-notes">{r.notes}</span>
                        </div>
                        <span className="time-sheet__supervision-date">{formatDate(r.date)}</span>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}

              <header className="time-sheet__panel-head">
                <h2 className="section-title">Team supervision</h2>
              </header>
              {teamRecords.length === 0
                ? emptyState("No supervision records for your team yet.")
                : (
                  <StaggerList className="time-sheet__supervision">
                    {teamRecords.map((r) => (
                      <StaggerItem key={r.id} className="time-sheet__supervision-row">
                        <div className="time-sheet__supervision-body">
                          <span className="time-sheet__supervision-with">
                            {nameFor(r.superviseeId)} — by {nameFor(r.supervisorId)}
                          </span>
                          <span className="time-sheet__supervision-notes">{r.notes}</span>
                        </div>
                        <span className="time-sheet__supervision-date">{formatDate(r.date)}</span>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}

              {canSupervisionLog && (
                <div className="time-sheet__supervision-log-actions">
                  {scope.filter(canSuperviseTarget).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setSupervisionTarget(m)}
                    >
                      + Log supervision for {m.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Request leave ─────────────────────────────── */}
        <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} eyebrow="TIME SHEET" title="Request leave" size="md">
          <form onSubmit={handleRequestLeave}>
            <label className="form-field">
              <span className="form-field__label">Type</span>
              <select name="kind" className="form-field__control" defaultValue="annual">
                <option value="annual">Annual leave</option>
                <option value="sick">Sick leave</option>
                <option value="unpaid">Unpaid leave</option>
                <option value="compassionate">Compassionate</option>
              </select>
            </label>
            <div className="form-row">
              <label className="form-field">
                <span className="form-field__label">Start date</span>
                <input type="date" name="startDate" className="form-field__control" required />
              </label>
              <label className="form-field">
                <span className="form-field__label">End date</span>
                <input type="date" name="endDate" className="form-field__control" />
              </label>
            </div>
            <label className="form-field">
              <span className="form-field__label">Note (optional)</span>
              <textarea name="note" className="form-field__control" rows={3} />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setLeaveOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Submit request</button>
            </div>
          </form>
        </Modal>

        {/* ── Set on-call ───────────────────────────────── */}
        <Modal open={onCallOpen} onClose={() => setOnCallOpen(false)} eyebrow="TIME SHEET" title="Set on-call" size="sm">
          <form onSubmit={handleSetOnCall}>
            <label className="form-field">
              <span className="form-field__label">Staff member</span>
              <select name="staffId" className="form-field__control" defaultValue="">
                <option value="" disabled>Select</option>
                {scope.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Date</span>
              <input type="date" name="date" className="form-field__control" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Notes (optional)</span>
              <textarea name="notes" className="form-field__control" rows={2} />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setOnCallOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>

        {/* ── Log supervision ───────────────────────────── */}
        <Modal
          open={!!supervisionTarget}
          onClose={() => setSupervisionTarget(null)}
          eyebrow="SUPERVISION"
          title={`Log supervision — ${supervisionTarget?.name ?? ""}`}
          size="md"
        >
          <form onSubmit={handleLogSupervision}>
            <label className="form-field">
              <span className="form-field__label">Date</span>
              <input type="date" name="date" className="form-field__control" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Notes</span>
              <textarea name="notes" className="form-field__control" rows={4} required />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setSupervisionTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  )
}

export default TimeSheetHub
