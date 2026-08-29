import React, { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import "./Clients.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { auditService, clientsService } from "../../services"
import { PageTransition, FadeIn, StaggerList, StaggerItem } from "../../components/Motion"
import type {
  ClientComment,
  ClientProfile,
  ClientStatus,
  ServiceEvent,
  ServiceEventKind,
} from "../../services/clients/clients.types"
import type { AuditEvent } from "../../services/audit/audit.types"

/**
 * CLIENT-002 — Client detail.
 *
 * Four surfaces for a single resident:
 *   1. Profile        — demographics, keyworker, primary contact, summary
 *   2. Service history — chronological care events
 *   3. Audit trail    — read-only AuditSvc events referencing this client
 *   4. Comments       — hierarchical, append-only ops notes
 *
 * Access model
 *   people.view                — managers. Full access, can comment.
 *   primaryOwner / assignedOwner — assigned professional. Full access, can comment.
 *   other users               — abstract only (name, status, summary).
 *                                Can request access; service history, contacts,
 *                                audit trail, and comments are locked.
 */

const statusLabel: Record<ClientStatus, string> = {
  stable: "Stable",
  "needs-review": "Needs review",
  new: "New admission",
  transitioning: "Transitioning",
}
const statusTone: Record<ClientStatus, "neutral" | "success" | "warning" | "info"> = {
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

/** Parse "2026-04-11 14:32" → epoch for chronological sorting. */
const toEpoch = (at: string) => new Date(at.replace(" ", "T")).getTime()

/** Build a tree: root comments (newest-first) with replies (oldest-first). */
const buildThread = (flat: ClientComment[]) => {
  const roots: ClientComment[] = []
  const childMap = new Map<string, ClientComment[]>()
  for (const c of flat) {
    if (!c.parentId) {
      roots.push(c)
    } else {
      const arr = childMap.get(c.parentId) ?? []
      arr.push(c)
      childMap.set(c.parentId, arr)
    }
  }
  // Replies within a thread read top-to-bottom (chronological).
  for (const [, replies] of childMap) {
    replies.sort((a, b) => toEpoch(a.at) - toEpoch(b.at))
  }
  return { roots, childMap }
}

const ClientDetail: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>()
  const { can, user, scope } = useAuth()
  const toast = useToast()
  const canPeople = can("people.view")

  // ── Core fetches ─────────────────────────────────────
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [history, setHistory] = useState<ServiceEvent[]>([])
  const [comments, setComments] = useState<ClientComment[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void clientsService.getClient(id).then((c) => {
      if (!cancelled) setClient(c)
    })
    void clientsService.listClientHistory(id).then((rows) => {
      if (!cancelled) setHistory(rows)
    })
    void clientsService.listClientComments(id).then((rows) => {
      if (!cancelled) setComments(rows)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!client) {
      setAudit([])
      return
    }
    let cancelled = false
    // TODO(integration): replace with ?subjectCode= query param on AuditSvc
    void auditService.listEvents({ homes: scope.homes, pageSize: 200 }).then((res) => {
      if (cancelled) return
      const needle = client.code.toLowerCase()
      setAudit(
        res.items.filter((e) => e.target.toLowerCase().includes(needle))
      )
    })
    return () => {
      cancelled = true
    }
  }, [client, scope.homes])

  // ── Access model ─────────────────────────────────────
  const isAssigned = client
    ? user.id === client.primaryOwnerId || user.id === client.assignedOwnerId
    : false
  const hasFullAccess = canPeople || isAssigned
  const canComment = hasFullAccess

  // ── Tab state ────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("profile")

  // ── Comment composer ─────────────────────────────────
  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const submitComment = async () => {
    if (!client || !draft.trim()) return
    const created = await clientsService.addClientComment({
      clientId: client.id,
      body: draft.trim(),
      parentId: replyTo ?? undefined,
    })
    setComments((list) => [created, ...list])
    setDraft("")
    setReplyTo(null)
    toast.success("Comment added", {
      description: `Visible to ${client.name}'s care team`,
    })
  }

  // ── Request access ───────────────────────────────────
  const [accessReason, setAccessReason] = useState("")
  const [accessSent, setAccessSent] = useState(false)
  const submitAccessRequest = async () => {
    if (!client || !accessReason.trim()) return
    await clientsService.requestClientAccess({
      clientId: client.id,
      reason: accessReason.trim(),
    })
    setAccessSent(true)
    toast.success("Access requested", {
      description: `Your request has been sent to ${client.name}'s care team manager.`,
    })
  }

  // ── History sorted newest-first ──────────────────────
  const sortedHistory = useMemo(() => history, [history])

  // ── Threaded comments ────────────────────────────────
  const { roots, childMap } = useMemo(() => buildThread(comments), [comments])

  const replyTarget = replyTo
    ? comments.find((c) => c.id === replyTo) ?? null
    : null

  if (!client) {
    return (
      <div className="clients">
        <PageHeader
          title="Client"
          subtitle="Loading client profile…"
          actions={
            <Link to="/clients" className="btn btn--ghost">
              ← Back
            </Link>
          }
        />
      </div>
    )
  }

  // ── Restricted view for unassigned users ──────────────
  if (!hasFullAccess) {
    return (
      <div className="clients clients--detail">
        <PageHeader
          eyebrow="CLIENT"
          title={client.name}
          subtitle={`${client.code} · ${client.home} · Room ${client.roomNumber}`}
          actions={
            <Link to="/clients" className="btn btn--ghost">
              ← All clients
            </Link>
          }
        />

        <div className="clients__detail-head card">
          <div className="clients__avatar clients__avatar--lg" aria-hidden="true">
            {client.initials}
          </div>
          <div className="clients__detail-meta">
            <span className={`badge badge--${statusTone[client.status]}`}>
              {statusLabel[client.status]}
            </span>
            <span className="clients__meta-chip">Age {client.age}</span>
            <span className="clients__meta-chip">
              Keyworker · {client.keyworker}
            </span>
          </div>
        </div>

        <section className="clients__panel card">
          <h3 className="clients__section-title">Summary</h3>
          <p className="clients__summary">{client.summary}</p>
        </section>

        <div className="clients__restricted card">
          <div className="clients__restricted-icon" aria-hidden="true">🔒</div>
          <h3 className="clients__restricted-title">
            Full details are restricted
          </h3>
          <p className="clients__restricted-desc">
            You are not assigned to {client.name}. Service history, contact
            details, audit trail, and comments are only visible to the
            assigned care team and managers.
          </p>

          {accessSent ? (
            <div className="clients__restricted-sent">
              <span className="clients__restricted-sent-icon" aria-hidden="true">✓</span>
              Request sent — the care team manager will review your request.
            </div>
          ) : (
            <div className="clients__request-form">
              <label>
                <span className="clients__section-title">Reason for access</span>
                <textarea
                  rows={2}
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="Why do you need access to this client's records?"
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

  // ── Full access view ─────────────────────────────────
  return (
    <PageTransition>
    <div className="clients clients--detail">
      <PageHeader
        eyebrow="CLIENT"
        title={client.name}
        subtitle={`${client.code} · ${client.home} · Room ${client.roomNumber}`}
        actions={
          <Link to="/clients" className="btn btn--ghost">
            ← All clients
          </Link>
        }
      />

      <FadeIn>
      <div className="clients__detail-head card">
        <div className="clients__avatar clients__avatar--lg" aria-hidden="true">
          {client.initials}
        </div>
        <div className="clients__detail-meta">
          <span className={`badge badge--${statusTone[client.status]}`}>
            {statusLabel[client.status]}
          </span>
          <span className="clients__meta-chip">Age {client.age}</span>
          <span className="clients__meta-chip">
            Admitted {client.admissionDate}
          </span>
          <span className="clients__meta-chip">
            Keyworker · {client.keyworker}
          </span>
        </div>
      </div>
      </FadeIn>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="clients__tabs" role="tablist" aria-label="Client sections">
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
            className={`clients__tab ${tab === key ? "is-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === "comments" && comments.length > 0 && (
              <span className="clients__tab-count">{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      {/* ── Profile ────────────────────────────────────── */}
      {tab === "profile" && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
        <section id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="clients__panel card">
          <h3 className="clients__section-title">Summary</h3>
          <p className="clients__summary">{client.summary}</p>

          <h3 className="clients__section-title">Primary contact</h3>
          <dl className="clients__contact">
            <div>
              <dt>Name</dt>
              <dd>{client.primaryContact.name}</dd>
            </div>
            <div>
              <dt>Relation</dt>
              <dd>{client.primaryContact.relation}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                {canPeople ? client.primaryContact.phone : "•••• ••• ••••"}
              </dd>
            </div>
          </dl>
          {!canPeople && (
            <p className="clients__hint">
              Contact phone is masked. Home managers can see and dial the
              full number.
            </p>
          )}

          <h3 className="clients__section-title">Key facts</h3>
          <dl className="clients__facts">
            <div>
              <dt>Date of birth</dt>
              <dd>{client.dateOfBirth}</dd>
            </div>
            <div>
              <dt>Home</dt>
              <dd>{client.home}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{client.roomNumber}</dd>
            </div>
            <div>
              <dt>Last review</dt>
              <dd>{client.lastReviewDays}d ago</dd>
            </div>
          </dl>
        </section>
        </motion.div>
      )}

      {/* ── Service history ────────────────────────────── */}
      {tab === "history" && (
        <motion.div
          key="history"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
        <section id="panel-history" role="tabpanel" aria-labelledby="tab-history" className="clients__panel card">
          {sortedHistory.length === 0 ? (
            <p className="clients__detail-empty">No service events yet.</p>
          ) : (
            <StaggerList className="clients__timeline" as="ol">
              {sortedHistory.map((e) => (
                <StaggerItem
                  key={e.id}
                  as="li"
                  className={`clients__event clients__event--${e.kind}`}
                >
                  <span className="clients__event-when">{e.at}</span>
                  <div className="clients__event-body">
                    <div className="clients__event-kind">{kindLabel[e.kind]}</div>
                    <div className="clients__event-summary">{e.summary}</div>
                    <div className="clients__event-by">by {e.by}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {/* ── Audit trail ────────────────────────────────── */}
      {tab === "audit" && (
        <motion.div
          key="audit"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
        <section id="panel-audit" role="tabpanel" aria-labelledby="tab-audit" className="clients__panel card">
          {audit.length === 0 ? (
            <p className="clients__detail-empty">
              No audit events reference {client.code} yet.
            </p>
          ) : (
            <StaggerList className="clients__audit" as="ol">
              {audit.map((e) => (
                <StaggerItem key={e.id} as="li" className="clients__audit-row">
                  <time className="clients__audit-when">{e.at}</time>
                  <div className="clients__audit-body">
                    <div className="clients__audit-actor">
                      <strong>{e.actor}</strong>
                      <span className="clients__audit-role"> · {e.actorRole}</span>
                    </div>
                    <div className="clients__audit-action">{e.action}</div>
                    <div className="clients__audit-target">{e.target}</div>
                  </div>
                  <span
                    className={`badge badge--${
                      e.severity === "critical"
                        ? "danger"
                        : e.severity === "warning"
                        ? "warning"
                        : e.severity === "notice"
                        ? "info"
                        : "neutral"
                    }`}
                  >
                    {e.severity}
                  </span>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        </motion.div>
      )}

      {/* ── Comments (hierarchical) ────────────────────── */}
      {tab === "comments" && (
        <motion.div
          key="comments"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
        <section id="panel-comments" role="tabpanel" aria-labelledby="tab-comments" className="clients__panel card">
          {canComment && (
            <div className="clients__composer">
              {replyTarget && (
                <div className="clients__reply-banner">
                  <span>
                    Replying to <strong>{replyTarget.author}</strong>
                  </span>
                  <button
                    type="button"
                    className="clients__reply-cancel"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                  >
                    ×
                  </button>
                </div>
              )}
              <label htmlFor="client-comment" className="sr-only">
                Add a comment
              </label>
              <textarea
                id="client-comment"
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
                    ? `Reply to ${replyTarget.author}…`
                    : `Leave a quick note on ${client.name}…`
                }
              />
              <div className="clients__composer-foot">
                <span className="clients__composer-hint">
                  {replyTarget
                    ? "⌘Enter to send reply"
                    : "Comments are visible to the care team. ⌘Enter to send."}
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!draft.trim()}
                  onClick={() => void submitComment()}
                >
                  {replyTarget ? "Reply" : "Add comment"}
                </button>
              </div>
            </div>
          )}

          {roots.length === 0 ? (
            <p className="clients__detail-empty">No comments yet.</p>
          ) : (
            <StaggerList className="clients__comments">
              {roots.map((c) => {
                const replies = childMap.get(c.id) ?? []
                return (
                  <StaggerItem key={c.id} className="clients__comment">
                    <div className="clients__comment-head">
                      <strong>{c.author}</strong>
                      <span className="clients__comment-role">· {c.authorRole}</span>
                      <time className="clients__comment-when">{c.at}</time>
                    </div>
                    <p className="clients__comment-body">{c.body}</p>
                    {canComment && (
                      <button
                        type="button"
                        className="clients__reply-btn"
                        onClick={() => {
                          setReplyTo(c.id)
                          document.getElementById("client-comment")?.focus()
                        }}
                      >
                        Reply
                      </button>
                    )}

                    {replies.length > 0 && (
                      <ul className="clients__replies">
                        {replies.map((r) => (
                          <li key={r.id} className="clients__reply">
                            <div className="clients__comment-head">
                              <strong>{r.author}</strong>
                              <span className="clients__comment-role">
                                · {r.authorRole}
                              </span>
                              <time className="clients__comment-when">
                                {r.at}
                              </time>
                            </div>
                            <p className="clients__comment-body">{r.body}</p>
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

export default ClientDetail
