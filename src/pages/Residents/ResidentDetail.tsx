import React, { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import "./Residents.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { auditService, residentsService } from "../../services"
import { PageTransition, FadeIn, StaggerList, StaggerItem } from "../../components/Motion"
import type {
  ResidentComment,
  ResidentProfile,
  ResidentStatus,
  ServiceEvent,
  ServiceEventKind,
} from "../../services/residents/residents.types"
import type { AuditEvent } from "../../services/audit/audit.types"

/**
 * RESIDENT-002 — Resident detail.
 *
 * Four surfaces for a single resident:
 *   1. Profile        — demographics, keyworker, primary contact, summary
 *   2. Service history — chronological care events
 *   3. Audit trail    — read-only AuditSvc events referencing this resident
 *   4. Comments       — hierarchical, append-only ops notes
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

const kindLabel: Record<ServiceEventKind, string> = {
  admission: "Admission",
  placement_plan: "Placement plan",
  health_review: "Health review",
  incident: "Incident",
  appointment: "Appointment",
  note: "Note",
}

type Tab = "profile" | "history" | "audit" | "comments"

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
  const { can, user, scope } = useAuth()
  const toast = useToast()
  const canPeople = can("people.view")

  const [resident, setResident] = useState<ResidentProfile | null>(null)
  const [history, setHistory] = useState<ServiceEvent[]>([])
  const [comments, setComments] = useState<ResidentComment[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void residentsService.getResident(id).then((c) => {
      if (!cancelled) setResident(c)
    })
    void residentsService.listResidentHistory(id).then((rows) => {
      if (!cancelled) setHistory(rows)
    })
    void residentsService.listResidentComments(id).then((rows) => {
      if (!cancelled) setComments(rows)
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

  const isAssigned = resident
    ? user.id === resident.primaryOwnerId || user.id === resident.assignedOwnerId
    : false
  const hasFullAccess = canPeople || isAssigned
  // Admin holds people.view but NOT residents.comments.write — the only
  // place Admin is explicitly blocked from writing. Gate both conditions.
  const canComment = hasFullAccess && can("residents.comments.write")

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

  const [accessReason, setAccessReason] = useState("")
  const [accessSent, setAccessSent] = useState(false)
  const submitAccessRequest = async () => {
    if (!resident || !accessReason.trim()) return
    await residentsService.requestResidentAccess({
      residentId: resident.id,
      reason: accessReason.trim(),
    })
    setAccessSent(true)
    toast.success("Access requested", {
      description: `Your request has been sent to ${resident.name}'s care team manager.`,
    })
  }

  const sortedHistory = useMemo(() => history, [history])
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

  if (!hasFullAccess) {
    return (
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
              Keyworker · {resident.keyworker}
            </span>
          </div>
        </div>

        <section className="residents__panel card">
          <h3 className="residents__section-title">Summary</h3>
          <p className="residents__summary">{resident.summary}</p>
        </section>

        <div className="residents__restricted card">
          <div className="residents__restricted-icon" aria-hidden="true">&#x1f512;</div>
          <h3 className="residents__restricted-title">
            Full details are restricted
          </h3>
          <p className="residents__restricted-desc">
            You are not assigned to {resident.name}. Service history, contact
            details, audit trail, and comments are only visible to the
            assigned care team and managers.
          </p>

          {accessSent ? (
            <div className="residents__restricted-sent">
              <span className="residents__restricted-sent-icon" aria-hidden="true">&#x2713;</span>
              Request sent — the care team manager will review your request.
            </div>
          ) : (
            <div className="residents__request-form">
              <label>
                <span className="residents__section-title">Reason for access</span>
                <textarea
                  rows={2}
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="Why do you need access to this resident's records?"
                />
              </label>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!accessReason.trim()}
                onClick={() => void submitAccessRequest()}
              >
                Request access
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

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
            ["history", "Service history"],
            ["audit", "Audit trail"],
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
            <div><dt>Phone</dt><dd>{canPeople ? resident.primaryContact.phone : "•••• ••• ••••"}</dd></div>
          </dl>
          {!canPeople && (
            <p className="residents__hint">
              Contact phone is masked. Home managers can see and dial the full number.
            </p>
          )}

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

      {tab === "history" && (
        <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
        <section id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="residents__panel card">
          {sortedHistory.length === 0 ? (
            <p className="residents__detail-empty">No service events yet.</p>
          ) : (
            <StaggerList className="residents__timeline" as="ol">
              {sortedHistory.map((e) => (
                <StaggerItem key={e.id} as="li" className={`residents__event residents__event--${e.kind}`}>
                  <span className="residents__event-when">{e.at}</span>
                  <div className="residents__event-body">
                    <div className="residents__event-kind">{kindLabel[e.kind]}</div>
                    <div className="residents__event-summary">{e.summary}</div>
                    <div className="residents__event-by">by {e.by}</div>
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
          {canComment && (
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
                    {canComment && (
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
    </div>
    </PageTransition>
  )
}

export default ResidentDetail
