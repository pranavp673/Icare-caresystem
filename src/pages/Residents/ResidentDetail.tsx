import React, { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import "./Residents.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import Modal from "../../components/Modal/Modal"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { auditService, residentsService } from "../../services"
import { PageTransition, FadeIn, StaggerList, StaggerItem } from "../../components/Motion"
import {
  PLAN_KIND_LABEL,
  INCIDENT_KIND_LABEL,
  HEALTH_KIND_LABEL,
} from "../../services/residents/residentDocuments.mock"
import type {
  ActivityEntry,
  DailyRecordEntry,
  HealthRecord,
  HealthRecordKind,
  IncidentReport,
  IncidentReportKind,
  PlanDocument,
  PlanKind,
  ResidentComment,
  ResidentProfile,
  ResidentStatus,
} from "../../services/residents/residents.types"
import type { AuditEvent } from "../../services/audit/audit.types"

/**
 * RESIDENT-002 — Resident detail.
 *
 * Eight surfaces for a single resident (§3.5.1 / §11.6):
 *   1. Profile              — demographics, keyworker, primary contact, summary
 *   2. Daily Record          — Daily Logs + Daily Education + Reflective, combined per day
 *   3. Plans & Assessments   — Care Plan, Behaviour Support Plan, Risk Assessment, EHCP, Family Tree
 *   4. Incidents & Reports   — Accident/Missing Reports, Incidents
 *   5. Health & Reviews      — Health Reports, Appointments, LAC Minutes
 *   6. Activity
 *   7. Audit trail           — read-only AuditSvc events referencing this resident
 *   8. Comments              — hierarchical, append-only ops notes
 *
 * Resident data is universally visible (§2.2) — there is no access gate
 * on this page. `residentsService.getResident` logs a "viewed" audit
 * event on every fetch as the compensating control; every create action
 * below logs its own change event too (see residentsService.ts).
 * Creating an entry on any tab (except viewing) requires
 * `residents.comments.write` — the existing "operational chain, not RI"
 * permission, reused rather than adding new ones.
 */

const statusLabel: Record<ResidentStatus, string> = {
  stable: "Stable",
  "needs-review": "Needs review",
  new: "New admission",
  transitioning: "Transitioning",
}
const statusTone: Record<ResidentStatus, "neutral" | "success" | "warning" | "info"> = {
  stable: "success",
  "needs-review": "warning",
  new: "info",
  transitioning: "neutral",
}

const severityTone: Record<IncidentReport["severity"], string> = {
  minor: "neutral",
  moderate: "info",
  major: "warning",
  critical: "danger",
}

type Tab = "profile" | "daily" | "plans" | "incidents" | "health" | "activity" | "audit" | "comments"

const toEpoch = (at: string) => new Date(at.replace(" ", "T")).getTime()

const buildThread = (flat: ResidentComment[]) => {
  const roots: ResidentComment[] = []
  const childMap = new Map<string, ResidentComment[]>()
  for (const c of flat) {
    if (!c.parentId) {
      roots.push(c)
    } else {
      const arr = childMap.get(c.parentId) ?? []
      arr.push(c)
      childMap.set(c.parentId, arr)
    }
  }
  for (const [, replies] of childMap) {
    replies.sort((a, b) => toEpoch(a.at) - toEpoch(b.at))
  }
  return { roots, childMap }
}

const ResidentDetail: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>()
  const { can, scope } = useAuth()
  const toast = useToast()
  const canLog = can("residents.comments.write")

  const [resident, setResident] = useState<ResidentProfile | null>(null)
  const [comments, setComments] = useState<ResidentComment[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [dailyRecords, setDailyRecords] = useState<DailyRecordEntry[]>([])
  const [plans, setPlans] = useState<PlanDocument[]>([])
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [health, setHealth] = useState<HealthRecord[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void residentsService.getResident(id).then((c) => {
      if (!cancelled) setResident(c)
    })
    void residentsService.listResidentComments(id).then((rows) => {
      if (!cancelled) setComments(rows)
    })
    void residentsService.listDailyRecords(id).then((rows) => {
      if (!cancelled) setDailyRecords(rows)
    })
    void residentsService.listPlans(id).then((rows) => {
      if (!cancelled) setPlans(rows)
    })
    void residentsService.listIncidentReports(id).then((rows) => {
      if (!cancelled) setIncidents(rows)
    })
    void residentsService.listHealthRecords(id).then((rows) => {
      if (!cancelled) setHealth(rows)
    })
    void residentsService.listActivity(id).then((rows) => {
      if (!cancelled) setActivity(rows)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!resident) {
      setAudit([])
      return
    }
    let cancelled = false
    void auditService.listEvents({ homes: scope.homes, pageSize: 200 }).then((res) => {
      if (cancelled) return
      const needle = resident.code.toLowerCase()
      setAudit(
        res.items.filter((e) => e.target.toLowerCase().includes(needle))
      )
    })
    return () => {
      cancelled = true
    }
  }, [resident, scope.homes])

  const [tab, setTab] = useState<Tab>("profile")

  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const submitComment = async () => {
    if (!resident || !draft.trim()) return
    const created = await residentsService.addResidentComment({
      residentId: resident.id,
      body: draft.trim(),
      parentId: replyTo ?? undefined,
    })
    setComments((list) => [created, ...list])
    setDraft("")
    setReplyTo(null)
    toast.success("Comment added", {
      description: `Visible to ${resident.name}'s care team`,
    })
  }

  // ── New-entry modals ─────────────────────────────────
  const [dailyOpen, setDailyOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)

  const handleAddDaily = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    const form = new FormData(e.currentTarget)
    void residentsService
      .addDailyRecord({
        residentId: resident.id,
        date: String(form.get("date") || ""),
        dailyLog: String(form.get("dailyLog") || ""),
        dailyEducation: String(form.get("dailyEducation") || ""),
        reflective: String(form.get("reflective") || ""),
      })
      .then((entry) => {
        setDailyRecords((list) => [entry, ...list])
        setDailyOpen(false)
        toast.success("Daily record logged")
      })
  }

  const handleSavePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    const form = new FormData(e.currentTarget)
    void residentsService
      .savePlan({
        residentId: resident.id,
        kind: form.get("kind") as PlanKind,
        content: String(form.get("content") || ""),
      })
      .then((doc) => {
        setPlans((list) => [doc, ...list])
        setPlanOpen(false)
        toast.success(`${PLAN_KIND_LABEL[doc.kind]} updated`)
      })
  }

  const handleAddIncident = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    const form = new FormData(e.currentTarget)
    void residentsService
      .addIncidentReport({
        residentId: resident.id,
        kind: form.get("kind") as IncidentReportKind,
        occurredAt: String(form.get("occurredAt") || ""),
        description: String(form.get("description") || ""),
        severity: form.get("severity") as IncidentReport["severity"],
      })
      .then((report) => {
        setIncidents((list) => [report, ...list])
        setIncidentOpen(false)
        toast.success(`${INCIDENT_KIND_LABEL[report.kind]} logged`)
      })
  }

  const handleAddHealth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    const form = new FormData(e.currentTarget)
    const attendees = String(form.get("attendees") || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
    void residentsService
      .addHealthRecord({
        residentId: resident.id,
        kind: form.get("kind") as HealthRecordKind,
        date: String(form.get("date") || ""),
        notes: String(form.get("notes") || ""),
        attendees: attendees.length > 0 ? attendees : undefined,
      })
      .then((record) => {
        setHealth((list) => [record, ...list])
        setHealthOpen(false)
        toast.success(`${HEALTH_KIND_LABEL[record.kind]} logged`)
      })
  }

  const handleAddActivity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    const form = new FormData(e.currentTarget)
    void residentsService
      .addActivity({
        residentId: resident.id,
        date: String(form.get("date") || ""),
        description: String(form.get("description") || ""),
      })
      .then((entry) => {
        setActivity((list) => [entry, ...list])
        setActivityOpen(false)
        toast.success("Activity logged")
      })
  }

  const { roots, childMap } = useMemo(() => buildThread(comments), [comments])

  const replyTarget = replyTo
    ? comments.find((c) => c.id === replyTo) ?? null
    : null

  if (!resident) {
    return (
      <div className="residents">
        <PageHeader
          title="Resident"
          subtitle="Loading resident profile..."
          actions={
            <Link to="/residents" className="btn btn--ghost">
              &larr; Back
            </Link>
          }
        />
      </div>
    )
  }

  const emptyState = (label: string) => (
    <p className="residents__detail-empty">{label}</p>
  )

  return (
    <PageTransition>
    <div className="residents residents--detail">
      <PageHeader
        eyebrow="RESIDENT"
        title={resident.name}
        subtitle={`${resident.code} · ${resident.home} · Room ${resident.roomNumber}`}
        actions={
          <Link to="/residents" className="btn btn--ghost">
            &larr; All residents
          </Link>
        }
      />

      <FadeIn>
      <div className="residents__detail-head card">
        <div className="residents__avatar residents__avatar--lg" aria-hidden="true">
          {resident.initials}
        </div>
        <div className="residents__detail-meta">
          <span className={`badge badge--${statusTone[resident.status]}`}>
            {statusLabel[resident.status]}
          </span>
          <span className="residents__meta-chip">Age {resident.age}</span>
          <span className="residents__meta-chip">
            Admitted {resident.admissionDate}
          </span>
          <span className="residents__meta-chip">
            Keyworker · {resident.keyworker}
          </span>
        </div>
      </div>
      </FadeIn>

      <div className="residents__tabs" role="tablist" aria-label="Resident sections">
        {(
          [
            ["profile", "Profile"],
            ["daily", `Daily Record (${dailyRecords.length})`],
            ["plans", `Plans & Assessments (${plans.length})`],
            ["incidents", `Incidents & Reports (${incidents.length})`],
            ["health", `Health & Reviews (${health.length})`],
            ["activity", `Activity (${activity.length})`],
            ["audit", "Audit Trail"],
            ["comments", "Comments"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            className={`residents__tab ${tab === key ? "is-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === "comments" && comments.length > 0 && (
              <span className="residents__tab-count">{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      {tab === "profile" && (
        <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="residents__panel card">
          <h3 className="residents__section-title">Summary</h3>
          <p className="residents__summary">{resident.summary}</p>

          <h3 className="residents__section-title">Primary contact</h3>
          <dl className="residents__contact">
            <div><dt>Name</dt><dd>{resident.primaryContact.name}</dd></div>
            <div><dt>Relation</dt><dd>{resident.primaryContact.relation}</dd></div>
            <div><dt>Phone</dt><dd>{resident.primaryContact.phone}</dd></div>
          </dl>

          <h3 className="residents__section-title">Key facts</h3>
          <dl className="residents__facts">
            <div><dt>Date of birth</dt><dd>{resident.dateOfBirth}</dd></div>
            <div><dt>Home</dt><dd>{resident.home}</dd></div>
            <div><dt>Room</dt><dd>{resident.roomNumber}</dd></div>
            <div><dt>Last review</dt><dd>{resident.lastReviewDays}d ago</dd></div>
          </dl>
        </section>
        </motion.div>
      )}

      {tab === "daily" && (
        <motion.div key="daily" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-daily" role="tabpanel" aria-labelledby="tab-daily" className="residents__panel card">
          <header className="residents__panel-head">
            <h3 className="residents__section-title">Daily record</h3>
            {canLog && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setDailyOpen(true)}>
                + Add entry
              </button>
            )}
          </header>
          {dailyRecords.length === 0 ? emptyState("No daily record entries yet.") : (
            <StaggerList className="residents__timeline" as="ol">
              {dailyRecords.map((r) => (
                <StaggerItem key={r.id} as="li" className="residents__event">
                  <span className="residents__event-when">{r.date}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-summary"><strong>Daily log:</strong> {r.dailyLog}</div>
                    <div className="residents__event-summary"><strong>Education:</strong> {r.dailyEducation}</div>
                    <div className="residents__event-summary"><strong>Reflective:</strong> {r.reflective}</div>
                    <div className="residents__event-by">by {r.loggedBy}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "plans" && (
        <motion.div key="plans" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-plans" role="tabpanel" aria-labelledby="tab-plans" className="residents__panel card">
          <header className="residents__panel-head">
            <h3 className="residents__section-title">Plans &amp; assessments</h3>
            {canLog && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setPlanOpen(true)}>
                + Update plan
              </button>
            )}
          </header>
          {plans.length === 0 ? emptyState("No plans or assessments on file yet.") : (
            <StaggerList className="residents__timeline" as="ol">
              {plans.map((p) => (
                <StaggerItem key={p.id} as="li" className="residents__event">
                  <span className="residents__event-when">{p.updatedAt}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-kind">{PLAN_KIND_LABEL[p.kind]}</div>
                    <div className="residents__event-summary">{p.content}</div>
                    <div className="residents__event-by">by {p.updatedBy}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "incidents" && (
        <motion.div key="incidents" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-incidents" role="tabpanel" aria-labelledby="tab-incidents" className="residents__panel card">
          <header className="residents__panel-head">
            <h3 className="residents__section-title">Incidents &amp; reports</h3>
            {canLog && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setIncidentOpen(true)}>
                + New report
              </button>
            )}
          </header>
          {incidents.length === 0 ? emptyState("No incidents or reports on file yet.") : (
            <StaggerList className="residents__timeline" as="ol">
              {incidents.map((r) => (
                <StaggerItem key={r.id} as="li" className="residents__event">
                  <span className="residents__event-when">{r.occurredAt.replace("T", " ")}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-kind">
                      {INCIDENT_KIND_LABEL[r.kind]}{" "}
                      <span className={`badge badge--${severityTone[r.severity]}`}>{r.severity}</span>
                    </div>
                    <div className="residents__event-summary">{r.description}</div>
                    <div className="residents__event-by">by {r.reportedBy}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "health" && (
        <motion.div key="health" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-health" role="tabpanel" aria-labelledby="tab-health" className="residents__panel card">
          <header className="residents__panel-head">
            <h3 className="residents__section-title">Health &amp; reviews</h3>
            {canLog && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setHealthOpen(true)}>
                + Log entry
              </button>
            )}
          </header>
          {health.length === 0 ? emptyState("No health records or reviews on file yet.") : (
            <StaggerList className="residents__timeline" as="ol">
              {health.map((r) => (
                <StaggerItem key={r.id} as="li" className="residents__event">
                  <span className="residents__event-when">{r.date}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-kind">{HEALTH_KIND_LABEL[r.kind]}</div>
                    <div className="residents__event-summary">{r.notes}</div>
                    {r.attendees && r.attendees.length > 0 && (
                      <div className="residents__event-by">Attendees: {r.attendees.join(", ")}</div>
                    )}
                    <div className="residents__event-by">by {r.loggedBy}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "activity" && (
        <motion.div key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" className="residents__panel card">
          <header className="residents__panel-head">
            <h3 className="residents__section-title">Activity</h3>
            {canLog && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setActivityOpen(true)}>
                + Log activity
              </button>
            )}
          </header>
          {activity.length === 0 ? emptyState("No activity logged yet.") : (
            <StaggerList className="residents__timeline" as="ol">
              {activity.map((a) => (
                <StaggerItem key={a.id} as="li" className="residents__event">
                  <span className="residents__event-when">{a.date}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-summary">{a.description}</div>
                    <div className="residents__event-by">by {a.loggedBy}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "audit" && (
        <motion.div key="audit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-audit" role="tabpanel" aria-labelledby="tab-audit" className="residents__panel card">
          {audit.length === 0 ? (
            <p className="residents__detail-empty">
              No audit events reference {resident.code} yet.
            </p>
          ) : (
            <StaggerList className="residents__audit" as="ol">
              {audit.map((e) => (
                <StaggerItem key={e.id} as="li" className="residents__audit-row">
                  <time className="residents__audit-when">{e.at}</time>
                  <div className="residents__audit-body">
                    <div className="residents__audit-actor">
                      <strong>{e.actor}</strong>
                      <span className="residents__audit-role"> · {e.actorRole}</span>
                    </div>
                    <div className="residents__audit-action">{e.action}</div>
                    <div className="residents__audit-target">{e.target}</div>
                  </div>
                  <span className={`badge badge--${
                    e.severity === "critical" ? "danger"
                    : e.severity === "warning" ? "warning"
                    : e.severity === "notice" ? "info"
                    : "neutral"
                  }`}>
                    {e.severity}
                  </span>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {tab === "comments" && (
        <motion.div key="comments" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-comments" role="tabpanel" aria-labelledby="tab-comments" className="residents__panel card">
          {canLog && (
            <div className="residents__composer">
              {replyTarget && (
                <div className="residents__reply-banner">
                  <span>Replying to <strong>{replyTarget.author}</strong></span>
                  <button type="button" className="residents__reply-cancel" onClick={() => setReplyTo(null)} aria-label="Cancel reply">x</button>
                </div>
              )}
              <label htmlFor="resident-comment" className="sr-only">Add a comment</label>
              <textarea
                id="resident-comment"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault()
                    void submitComment()
                  }
                }}
                placeholder={
                  replyTarget
                    ? `Reply to ${replyTarget.author}...`
                    : `Leave a quick note on ${resident.name}...`
                }
              />
              <div className="residents__composer-foot">
                <span className="residents__composer-hint">
                  {replyTarget ? "⌘Enter to send reply" : "Comments are visible to the care team. ⌘Enter to send."}
                </span>
                <button type="button" className="btn btn--primary" disabled={!draft.trim()} onClick={() => void submitComment()}>
                  {replyTarget ? "Reply" : "Add comment"}
                </button>
              </div>
            </div>
          )}

          {roots.length === 0 ? (
            <p className="residents__detail-empty">No comments yet.</p>
          ) : (
            <StaggerList className="residents__comments">
              {roots.map((c) => {
                const replies = childMap.get(c.id) ?? []
                return (
                  <StaggerItem key={c.id} className="residents__comment">
                    <div className="residents__comment-head">
                      <strong>{c.author}</strong>
                      <span className="residents__comment-role">· {c.authorRole}</span>
                      <time className="residents__comment-when">{c.at}</time>
                    </div>
                    <p className="residents__comment-body">{c.body}</p>
                    {canLog && (
                      <button type="button" className="residents__reply-btn" onClick={() => {
                        setReplyTo(c.id)
                        document.getElementById("resident-comment")?.focus()
                      }}>
                        Reply
                      </button>
                    )}
                    {replies.length > 0 && (
                      <ul className="residents__replies">
                        {replies.map((r) => (
                          <li key={r.id} className="residents__reply">
                            <div className="residents__comment-head">
                              <strong>{r.author}</strong>
                              <span className="residents__comment-role">· {r.authorRole}</span>
                              <time className="residents__comment-when">{r.at}</time>
                            </div>
                            <p className="residents__comment-body">{r.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </StaggerItem>
                )
              })}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── New daily record ─────────────────────────── */}
      <Modal open={dailyOpen} onClose={() => setDailyOpen(false)} eyebrow="DAILY RECORD" title="Add daily record entry" size="md">
        <form onSubmit={handleAddDaily}>
          <label className="form-field">
            <span className="form-field__label">Date</span>
            <input type="date" name="date" className="form-field__control" required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Daily log</span>
            <textarea name="dailyLog" className="form-field__control" rows={2} required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Daily education</span>
            <textarea name="dailyEducation" className="form-field__control" rows={2} required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Reflective (young person's feedback)</span>
            <textarea name="reflective" className="form-field__control" rows={2} required />
          </label>
          <div className="modal__form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setDailyOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* ── Update plan ───────────────────────────────── */}
      <Modal open={planOpen} onClose={() => setPlanOpen(false)} eyebrow="PLANS & ASSESSMENTS" title="Update plan or assessment" size="md">
        <form onSubmit={handleSavePlan}>
          <label className="form-field">
            <span className="form-field__label">Type</span>
            <select name="kind" className="form-field__control" defaultValue="care_plan">
              {(Object.keys(PLAN_KIND_LABEL) as PlanKind[]).map((k) => (
                <option key={k} value={k}>{PLAN_KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Content</span>
            <textarea name="content" className="form-field__control" rows={4} required />
          </label>
          <div className="modal__form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setPlanOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* ── New incident/report ──────────────────────── */}
      <Modal open={incidentOpen} onClose={() => setIncidentOpen(false)} eyebrow="INCIDENTS & REPORTS" title="New incident or report" size="md">
        <form onSubmit={handleAddIncident}>
          <div className="form-row">
            <label className="form-field">
              <span className="form-field__label">Type</span>
              <select name="kind" className="form-field__control" defaultValue="incident">
                {(Object.keys(INCIDENT_KIND_LABEL) as IncidentReportKind[]).map((k) => (
                  <option key={k} value={k}>{INCIDENT_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Severity</span>
              <select name="severity" className="form-field__control" defaultValue="minor">
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            <span className="form-field__label">When</span>
            <input type="datetime-local" name="occurredAt" className="form-field__control" required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Description</span>
            <textarea name="description" className="form-field__control" rows={3} required />
          </label>
          <div className="modal__form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setIncidentOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* ── New health/review entry ──────────────────── */}
      <Modal open={healthOpen} onClose={() => setHealthOpen(false)} eyebrow="HEALTH & REVIEWS" title="Log health record or review" size="md">
        <form onSubmit={handleAddHealth}>
          <div className="form-row">
            <label className="form-field">
              <span className="form-field__label">Type</span>
              <select name="kind" className="form-field__control" defaultValue="health_report">
                {(Object.keys(HEALTH_KIND_LABEL) as HealthRecordKind[]).map((k) => (
                  <option key={k} value={k}>{HEALTH_KIND_LABEL[k]}</option>
                ))}
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
          <label className="form-field">
            <span className="form-field__label">Attendees (optional, comma-separated)</span>
            <input name="attendees" className="form-field__control" placeholder="e.g. LAC Minutes attendees" />
          </label>
          <div className="modal__form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setHealthOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* ── New activity ──────────────────────────────── */}
      <Modal open={activityOpen} onClose={() => setActivityOpen(false)} eyebrow="ACTIVITY" title="Log activity" size="sm">
        <form onSubmit={handleAddActivity}>
          <label className="form-field">
            <span className="form-field__label">Date</span>
            <input type="date" name="date" className="form-field__control" required />
          </label>
          <label className="form-field">
            <span className="form-field__label">Description</span>
            <textarea name="description" className="form-field__control" rows={3} required />
          </label>
          <div className="modal__form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setActivityOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
    </PageTransition>
  )
}

export default ResidentDetail
