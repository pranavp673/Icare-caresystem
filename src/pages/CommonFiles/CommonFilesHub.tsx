import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./CommonFilesHub.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import Modal from "../../components/Modal/Modal"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { PageTransition, StaggerList, StaggerItem } from "../../components/Motion"
import { CHECK_TYPE_META, MEETING_KIND_LABEL } from "../../services/commonFiles/commonFiles.mock"
import { commonFilesService } from "../../services"
import type {
  CommonFileDoc,
  CheckEntry,
  CheckType,
  MeetingRecord,
  MeetingKind,
  HandoverEntry,
} from "../../services/commonFiles/commonFiles.types"

/**
 * COMMONFILES-001 — Common Files (FR-COM).
 *
 * Home-level compliance documents and checks. Unlike every other
 * operational page, there is no route guard here — every role sees this
 * page (see App.tsx and nav.config.ts, gated only on `commonFiles.view`,
 * which all six roles hold). What differs by role is which *actions* are
 * available:
 *   commonFiles.log  — RSW, Team Leader, Deputy Manager, Registered
 *                       Manager, System Admin can log a check/meeting/
 *                       handover entry (not RI — outside the operational
 *                       chain, §2.2)
 *   commonFiles.edit — Registered Manager, System Admin can edit the
 *                       Statement of Purpose
 */

type Tab = "purpose" | "daily" | "weekly" | "meetings" | "handovers"

const DAILY_CHECK_TYPES: CheckType[] = ["fridge_freezer"]
const WEEKLY_CHECK_TYPES: CheckType[] = (
  Object.keys(CHECK_TYPE_META) as CheckType[]
).filter((t) => CHECK_TYPE_META[t].cadence === "weekly")

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

const CommonFilesHub: React.FC = () => {
  const { user, activeHome, can } = useAuth()
  const toast = useToast()
  const canLog = can("commonFiles.log")
  const canEdit = can("commonFiles.edit")

  const homeId = activeHome?.id ?? user.primaryHome.id

  const [tab, setTab] = useState<Tab>("purpose")
  const [purpose, setPurpose] = useState<CommonFileDoc | null>(null)
  const [checks, setChecks] = useState<CheckEntry[]>([])
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [handovers, setHandovers] = useState<HandoverEntry[]>([])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      commonFilesService.getStatementOfPurpose(homeId),
      commonFilesService.listChecks(homeId),
      commonFilesService.listMeetings(homeId),
      commonFilesService.listHandovers(homeId),
    ]).then(([p, c, m, h]) => {
      if (cancelled) return
      setPurpose(p)
      setChecks(c)
      setMeetings(m)
      setHandovers(h)
    })
    return () => {
      cancelled = true
    }
  }, [homeId])

  const dailyChecks = useMemo(() => checks.filter((c) => c.cadence === "daily"), [checks])
  const weeklyChecks = useMemo(() => checks.filter((c) => c.cadence === "weekly"), [checks])

  // ── Modals ───────────────────────────────────────────
  const [editPurposeOpen, setEditPurposeOpen] = useState(false)
  const [logCheckTab, setLogCheckTab] = useState<Extract<Tab, "daily" | "weekly"> | null>(null)
  const [newMeetingOpen, setNewMeetingOpen] = useState(false)
  const [newHandoverOpen, setNewHandoverOpen] = useState(false)

  const handleEditPurpose = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    void commonFilesService
      .updateStatementOfPurpose(homeId, {
        homeRegisteredType: String(form.get("homeRegisteredType") || ""),
        servicesProvided: String(form.get("servicesProvided") || ""),
      })
      .then((doc) => {
        setPurpose(doc)
        setEditPurposeOpen(false)
        toast.success("Statement of Purpose updated")
      })
  }

  const handleLogCheck = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const checkType = form.get("checkType") as CheckType
    void commonFilesService
      .logCheck({
        homeId,
        checkType,
        notes: String(form.get("notes") || "") || undefined,
      })
      .then((entry) => {
        setChecks((list) => [entry, ...list])
        setLogCheckTab(null)
        toast.success(`${CHECK_TYPE_META[checkType].label} check logged`)
      })
  }

  const handleAddMeeting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const date = String(form.get("date") || "")
    if (!date) {
      toast.danger("Pick a date")
      return
    }
    void commonFilesService
      .addMeeting({
        homeId,
        kind: form.get("kind") as MeetingKind,
        date,
        attendees: String(form.get("attendees") || "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        notes: String(form.get("notes") || ""),
      })
      .then((meeting) => {
        setMeetings((list) => [meeting, ...list])
        setNewMeetingOpen(false)
        toast.success("Meeting logged")
      })
  }

  const handleAddHandover = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const date = String(form.get("date") || "")
    const notes = String(form.get("notes") || "")
    if (!date || !notes) {
      toast.danger("Date and notes are required")
      return
    }
    void commonFilesService
      .addHandover({ homeId, shift: String(form.get("shift") || "Day"), date, notes })
      .then((entry) => {
        setHandovers((list) => [entry, ...list])
        setNewHandoverOpen(false)
        toast.success("Handover logged")
      })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "purpose", label: "Statement of Purpose" },
    { id: "daily", label: `Daily Checks (${dailyChecks.length})` },
    { id: "weekly", label: `Weekly Checks (${weeklyChecks.length})` },
    { id: "meetings", label: `Meetings & Assessments (${meetings.length})` },
    { id: "handovers", label: `Handovers & Debriefs (${handovers.length})` },
  ]

  const emptyState = (label: string) => (
    <div className="common-files__empty">
      <p>{label}</p>
    </div>
  )

  return (
    <PageTransition>
      <div className="common-files">
        <PageHeader
          eyebrow="COMMON FILES"
          title="Common Files"
          subtitle="Home-level compliance documents and checks — visible to everyone, regardless of role."
          actions={<HomeFilter />}
        />

        <div className="common-files__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`common-files__tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "purpose" && (
            <motion.section
              key="purpose"
              className="card card--padded"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="section-head">
                <h2 className="section-title">Statement of Purpose</h2>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setEditPurposeOpen(true)}
                  >
                    Edit
                  </button>
                )}
              </header>
              {purpose ? (
                <div className="common-files__purpose">
                  <div className="common-files__purpose-row">
                    <span className="common-files__purpose-label">Registered type</span>
                    <span className="common-files__purpose-value">{purpose.homeRegisteredType}</span>
                  </div>
                  <div className="common-files__purpose-row">
                    <span className="common-files__purpose-label">Services provided</span>
                    <p className="common-files__purpose-value">{purpose.servicesProvided}</p>
                  </div>
                  <div className="common-files__purpose-meta">
                    Last updated by {purpose.updatedBy} · {formatDate(purpose.updatedAt)}
                  </div>
                </div>
              ) : (
                emptyState("No Statement of Purpose on file for this home yet.")
              )}
            </motion.section>
          )}

          {(tab === "daily" || tab === "weekly") && (
            <motion.section
              key={tab}
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="common-files__panel-head">
                <h2 className="section-title">
                  {tab === "daily" ? "Daily checks" : "Weekly checks"}
                </h2>
                {canLog && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setLogCheckTab(tab)}
                  >
                    Log check
                  </button>
                )}
              </header>
              {(tab === "daily" ? dailyChecks : weeklyChecks).length === 0
                ? emptyState("No checks logged yet.")
                : (
                  <StaggerList className="common-files__checks">
                    {(tab === "daily" ? dailyChecks : weeklyChecks).map((c) => (
                      <StaggerItem key={c.id} className="common-files__check">
                        <div className="common-files__check-body">
                          <div className="common-files__check-type">
                            {CHECK_TYPE_META[c.checkType].label}
                          </div>
                          {c.notes && <div className="common-files__check-notes">{c.notes}</div>}
                        </div>
                        <div className="common-files__check-meta">
                          {c.completedBy} · {formatDateTime(c.completedAt)}
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "meetings" && (
            <motion.section
              key="meetings"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="common-files__panel-head">
                <h2 className="section-title">Meetings &amp; assessments</h2>
                {canLog && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setNewMeetingOpen(true)}
                  >
                    New meeting
                  </button>
                )}
              </header>
              {meetings.length === 0
                ? emptyState("No meetings logged yet.")
                : (
                  <StaggerList className="common-files__meetings">
                    {meetings.map((m) => (
                      <StaggerItem key={m.id} className="common-files__meeting">
                        <div className="common-files__meeting-body">
                          <div className="common-files__meeting-kind">
                            {MEETING_KIND_LABEL[m.kind]}
                          </div>
                          <div className="common-files__meeting-notes">{m.notes}</div>
                          <div className="common-files__meeting-attendees">
                            {m.attendees.join(", ")}
                          </div>
                        </div>
                        <div className="common-files__meeting-date">{formatDate(m.date)}</div>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}

          {tab === "handovers" && (
            <motion.section
              key="handovers"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="common-files__panel-head">
                <h2 className="section-title">Handovers &amp; debriefs</h2>
                {canLog && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setNewHandoverOpen(true)}
                  >
                    New entry
                  </button>
                )}
              </header>
              {handovers.length === 0
                ? emptyState("No handovers logged yet.")
                : (
                  <StaggerList className="common-files__handovers">
                    {handovers.map((h) => (
                      <StaggerItem key={h.id} className="common-files__handover">
                        <div className="common-files__handover-body">
                          <div className="common-files__handover-shift">
                            {h.shift} shift · {formatDate(h.date)}
                          </div>
                          <div className="common-files__handover-notes">{h.notes}</div>
                        </div>
                        <div className="common-files__handover-meta">{h.loggedBy}</div>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Edit Statement of Purpose ────────────────── */}
        <Modal
          open={editPurposeOpen}
          onClose={() => setEditPurposeOpen(false)}
          eyebrow="COMMON FILES"
          title="Edit Statement of Purpose"
          size="md"
        >
          <form onSubmit={handleEditPurpose}>
            <label className="form-field">
              <span className="form-field__label">Registered type</span>
              <input
                name="homeRegisteredType"
                className="form-field__control"
                defaultValue={purpose?.homeRegisteredType}
                placeholder="e.g. EBD home"
              />
            </label>
            <label className="form-field">
              <span className="form-field__label">Services provided</span>
              <textarea
                name="servicesProvided"
                className="form-field__control"
                defaultValue={purpose?.servicesProvided}
                rows={4}
              />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditPurposeOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>

        {/* ── Log check ─────────────────────────────────── */}
        <Modal
          open={!!logCheckTab}
          onClose={() => setLogCheckTab(null)}
          eyebrow="COMMON FILES"
          title="Log a check"
          size="sm"
        >
          <form onSubmit={handleLogCheck}>
            <label className="form-field">
              <span className="form-field__label">Check type</span>
              <select name="checkType" className="form-field__control" defaultValue="">
                <option value="" disabled>Select a check</option>
                {(logCheckTab === "daily" ? DAILY_CHECK_TYPES : WEEKLY_CHECK_TYPES).map((t) => (
                  <option key={t} value={t}>{CHECK_TYPE_META[t].label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Notes (optional)</span>
              <textarea name="notes" className="form-field__control" rows={3} />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setLogCheckTab(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Log check</button>
            </div>
          </form>
        </Modal>

        {/* ── New meeting ──────────────────────────────── */}
        <Modal
          open={newMeetingOpen}
          onClose={() => setNewMeetingOpen(false)}
          eyebrow="COMMON FILES"
          title="New meeting"
          size="md"
        >
          <form onSubmit={handleAddMeeting}>
            <div className="form-row">
              <label className="form-field">
                <span className="form-field__label">Type</span>
                <select name="kind" className="form-field__control" defaultValue="monthly_team">
                  {(Object.keys(MEETING_KIND_LABEL) as MeetingKind[]).map((k) => (
                    <option key={k} value={k}>{MEETING_KIND_LABEL[k]}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-field__label">Date</span>
                <input type="date" name="date" className="form-field__control" required />
              </label>
            </div>
            <label className="form-field">
              <span className="form-field__label">Attendees (comma-separated)</span>
              <input name="attendees" className="form-field__control" placeholder="Priya Amari, Daniel T." />
            </label>
            <label className="form-field">
              <span className="form-field__label">Notes</span>
              <textarea name="notes" className="form-field__control" rows={3} />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setNewMeetingOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>

        {/* ── New handover ─────────────────────────────── */}
        <Modal
          open={newHandoverOpen}
          onClose={() => setNewHandoverOpen(false)}
          eyebrow="COMMON FILES"
          title="New handover entry"
          size="md"
        >
          <form onSubmit={handleAddHandover}>
            <div className="form-row">
              <label className="form-field">
                <span className="form-field__label">Shift</span>
                <select name="shift" className="form-field__control" defaultValue="Day">
                  <option>Day</option>
                  <option>Night</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-field__label">Date</span>
                <input type="date" name="date" className="form-field__control" required />
              </label>
            </div>
            <label className="form-field">
              <span className="form-field__label">Notes</span>
              <textarea name="notes" className="form-field__control" rows={3} required />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setNewHandoverOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  )
}

export default CommonFilesHub
