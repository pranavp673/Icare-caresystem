import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import "./TeamOverview.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import { PageTransition, FadeIn, StaggerList, StaggerItem, statContainerVariants, statCardVariants, standardTransition } from "../../components/Motion"
import Modal from "../../components/Modal/Modal"
import DateTimeField from "../../components/DateTimeField/DateTimeField"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { formatLocalDateTime, formatLocalRange } from "../../lib/format"
import { manageService, teamService } from "../../services"
import type {
  OverrideDraft,
  TeamMember,
  TeamStat,
} from "../../services/team/team.types"
import type {
  ApprovalItem,
  SwapActivity,
} from "../../services/manage/manage.types"

/**
 * TEAM-001 — Team overview.
 *
 * The Team page is visible to *every* role; what changes is scope.
 *
 *   • Base `team.view` (everyone) — the signed-in user sees their own
 *     teammates (same `teamId`) and nothing else. Action buttons are
 *     hidden because they don't carry the actioning permissions.
 *   • `team.view.all` (team_lead, home_manager, admin) — widens to the
 *     whole home scope (`user.homes`). Leads keep the review buttons
 *     via `approvals.review`; managers additionally get override.
 *
 * Sections:
 *   1. Stats row            — 4 coverage KPIs (hidden when `team.analytics.view`
 *                             is absent — professionals see the roster only)
 *   2. Filter bar           — search + home + status chips
 *   3. Team list            — row per member with hours bar, pending pills,
 *                             and action buttons wired to modals / toasts
 *   4. Team activity        — peer leave / overtime / swap feed so the
 *                             whole team can see what's in flight without
 *                             actioning anything (actions stay gated).
 *
 * Permission gates (checked via useAuth().can):
 *   team.view           — shows the page at all (already filtered at nav)
 *   team.view.all       — widens scope from own team → home scope
 *   team.analytics.view — reveals the KPI stats row
 *   team.overrideAssign — reveals "Override" action at row + page level
 *   approvals.review    — reveals "Review" on pending swaps/leaves and
 *                         the Approve/Decline buttons in the activity feed
 */

const STATUS_LABEL: Record<TeamMember["status"], string> = {
  on_shift: "On shift",
  off: "Off duty",
  on_leave: "On leave",
}

const STATUS_TONE: Record<TeamMember["status"], "success" | "neutral" | "info"> = {
  on_shift: "success",
  off: "neutral",
  on_leave: "info",
}

type HomeFilter = "all" | string
type TypeFilter = "all" | "leave" | "swap"
type ApprovalStatusFilter = "pending" | "approved" | "all"

const TeamOverview: React.FC = () => {
  const { user, scope, can } = useAuth()
  const toast = useToast()
  const canOverride = can("team.overrideAssign")
  const canReview = can("approvals.review")
  const canSeeAnalytics = can("team.analytics.view")
  const canSeeAll = can("team.view.all")

  const [query, setQuery] = useState("")
  const [homeFilter, setHomeFilter] = useState<HomeFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatusFilter>("pending")

  const [overrideMember, setOverrideMember] = useState<TeamMember | null>(null)
  const [reviewMember, setReviewMember] = useState<TeamMember | null>(null)
  // Track members whose pending items have been resolved, so the UI
  // reflects the action.
  const [resolved, setResolved] = useState<Record<string, boolean>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [forwardRow, setForwardRow] = useState<{ id: string; requester: { name: string }; typeLabel: string } | null>(null)
  const [forwardNote, setForwardNote] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [openMenuId])

  const handleAction = useCallback((action: string, row: { id: string; requester: { name: string }; typeLabel: string }) => {
    setOpenMenuId(null)
    switch (action) {
      case "approve":
        setResolved((r) => ({ ...r, [row.id]: true }))
        toast.success("Request approved", {
          description: `${row.requester.name} · ${row.typeLabel}`,
        })
        break
      case "reject":
        setResolved((r) => ({ ...r, [row.id]: true }))
        toast.warning("Request declined", {
          description: `${row.requester.name} · ${row.typeLabel}`,
        })
        break
      case "details":
        toast.info("Details requested", {
          description: `Asked ${row.requester.name} for more information`,
        })
        break
      case "forward":
        setForwardRow(row)
        setForwardNote("")
        break
    }
  }, [toast])

  // TeamSvc data: members scoped by permission (own team for base
  // `team.view`, whole-home scope for `team.view.all`) plus KPI stats.
  // Refetched only on mount; filters are applied locally.
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStat[]>([])
  const [peerApprovals, setPeerApprovals] = useState<ApprovalItem[]>([])
  const [peerSwaps, setPeerSwaps] = useState<SwapActivity[]>([])
  useEffect(() => {
    let cancelled = false
    // Decide query scope once, up front: leads/managers widen to the
    // whole home scope; everyone else sees just their team.
    const memberQuery = canSeeAll
      ? { homes: scope.homes }
      : { teamId: user.teamId }
    void Promise.all([
      teamService.listMembers(memberQuery),
      teamService.getStats("week"),
    ]).then(([m, s]) => {
      if (cancelled) return
      setMembers(m)
      setStats(s)
      // Scope peer activity to whichever members we just fetched — the
      // service layer handles the filter, so the page just forwards the
      // ids to both manageService feeds.
      const memberIds = m.map((row) => row.id)
      if (memberIds.length === 0) {
        setPeerApprovals([])
        setPeerSwaps([])
        return
      }
      void Promise.all([
        manageService.listApprovals({ requesterIds: memberIds }),
        manageService.listSwaps({ memberIds }),
      ]).then(([apps, swaps]) => {
        if (cancelled) return
        setPeerApprovals(apps)
        setPeerSwaps(swaps)
      })
    })
    return () => {
      cancelled = true
    }
  }, [canSeeAll, scope.homes, user.teamId])

  const homes = useMemo(
    () => Array.from(new Set(members.map((m) => m.home))).sort(),
    [members]
  )

  // ── Build unified request rows from approvals + swaps ──
  type RequestRow = {
    id: string
    requester: { name: string; initials: string; role: string; home: string }
    counterparty: { name: string; initials: string; home: string } | null
    typeLabel: string
    typeTone: string
    summary: string
    when: string
    statusLabel: string
    statusTone: string
    canAction: boolean
  }

  const requestRows = useMemo<RequestRow[]>(() => {
    const rows: RequestRow[] = []
    const q = query.trim().toLowerCase()

    // Leave / overtime approvals
    for (const a of peerApprovals) {
      if (typeFilter === "swap") continue
      if (homeFilter !== "all" && a.requester.home !== homeFilter) continue
      if (q && !a.requester.name.toLowerCase().includes(q) && !a.summary.toLowerCase().includes(q)) continue
      const rowStatus = a.status === "approved" ? "Approved" : "Pending"
      if (approvalStatusFilter === "pending" && rowStatus !== "Pending") continue
      if (approvalStatusFilter === "approved" && rowStatus !== "Approved") continue
      rows.push({
        id: a.id,
        requester: a.requester,
        counterparty: null,
        typeLabel: a.kind === "leave" ? "Leave" : "Overtime",
        typeTone: a.kind === "leave" ? "info" : "warning",
        summary: a.summary,
        when: a.when,
        statusLabel: rowStatus,
        statusTone: a.status === "approved" ? "success" : "warning",
        canAction: a.status === "pending",
      })
    }

    // Swap requests
    for (const s of peerSwaps) {
      if (typeFilter === "leave") continue
      if (homeFilter !== "all" && s.requester.home !== homeFilter && s.counterparty.home !== homeFilter) continue
      if (q && !s.requester.name.toLowerCase().includes(q) && !s.counterparty.name.toLowerCase().includes(q)) continue
      const statusLabel =
        s.status === "awaiting_teammate" ? "Pending"
        : s.status === "accepted" ? "Approved"
        : s.status === "declined" ? "Declined"
        : "Cancelled"
      if (approvalStatusFilter === "pending" && statusLabel !== "Pending") continue
      if (approvalStatusFilter === "approved" && statusLabel !== "Approved") continue
      const statusTone =
        s.status === "awaiting_teammate" ? "warning"
        : s.status === "accepted" ? "success"
        : s.status === "declined" ? "danger"
        : "neutral"
      rows.push({
        id: s.id,
        requester: s.requester,
        counterparty: s.counterparty,
        typeLabel: "Swap",
        typeTone: "neutral",
        summary: s.summary,
        when: s.when,
        statusLabel,
        statusTone,
        canAction: s.status === "awaiting_teammate",
      })
    }

    // Pending first, then approved, then others
    const order = (s: string) => s === "Pending" ? 0 : s === "Approved" ? 1 : 2
    rows.sort((a, b) => order(a.statusLabel) - order(b.statusLabel))
    return rows
  }, [peerApprovals, peerSwaps, query, homeFilter, typeFilter, approvalStatusFilter])

  const handleOverrideSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!overrideMember) return
    const form = new FormData(e.currentTarget)
    const start = String(form.get("start") || "")
    const end = String(form.get("end") || "")
    const reasonRaw = String(form.get("reason") || "sickness")
    const note = String(form.get("note") || "")
    if (!start || !end) {
      toast.danger("Pick start and end times", {
        description: "Override needs both a start and end datetime.",
      })
      return
    }
    // `reason` is typed as the `OverrideDraft["reason"]` discriminator —
    // the <select> options already line up with those values one-to-one.
    const reason = reasonRaw as OverrideDraft["reason"]
    void teamService
      .createOverride({
        memberId: overrideMember.id,
        start,
        end,
        reason,
        note: note || undefined,
      })
      .then(() => {
        toast.success("Override drafted", {
          description: `${overrideMember.name} · ${formatLocalRange(start, end)} — ${reason}`,
        })
        setOverrideMember(null)
      })
  }

  // Default the override datetime fields to "tomorrow 14:00 → 22:00" so the
  // form has a sensible starting point for a typical afternoon shift.
  const defaultOverrideStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
    return toLocalIso(d)
  }, [])
  const defaultOverrideEnd = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(22, 0, 0, 0)
    return toLocalIso(d)
  }, [])

  const approveReview = (m: TeamMember) => {
    setResolved((r) => ({ ...r, [m.id]: true }))
    toast.success("Request approved", { description: `${m.name} · cleared` })
    setReviewMember(null)
  }
  const declineReview = (m: TeamMember) => {
    setResolved((r) => ({ ...r, [m.id]: true }))
    toast.warning("Request declined", {
      description: `${m.name} — they've been notified`,
    })
    setReviewMember(null)
  }

  return (
    <PageTransition><div className="team">
      <PageHeader
        eyebrow=""
        title="Team"
        subtitle={
          canSeeAll
            ? "Coverage, pending requests, and overrides for every professional in your home scope."
            : "Your teammates and the leave, overtime, and swaps they have in flight."
        }
        actions={
          <>
            <HomeFilter />
            {canOverride && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() =>
                  toast.info("Pick a team member", {
                    description:
                      "Use the per-row Override button to draft a reassignment.",
                  })
                }
              >
                New override
              </button>
            )}
          </>
        }
      />

      {/* ── Stats row ──────────────────────────────────── */}
      {canSeeAnalytics && (
        <motion.ul className="team__stats" variants={statContainerVariants} initial="initial" animate="animate">
          {stats.map((s) => (
            <motion.li key={s.label} className={`stat-card stat-card--${s.tone}`} variants={statCardVariants} transition={standardTransition}>
              <span className="stat-card__label">{s.label}</span>
              <span className="stat-card__value">{s.value}</span>
              {s.delta && <span className="stat-card__delta">{s.delta}</span>}
            </motion.li>
          ))}
        </motion.ul>
      )}

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="team__filters">
        <label className="team__search">
          <span className="sr-only">Search team</span>
          <input
            type="search"
            placeholder="Search by name, role, or home…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="team__chips" role="group" aria-label="Home">
          <button
            type="button"
            className={`team__chip ${homeFilter === "all" ? "is-on" : ""}`}
            onClick={() => setHomeFilter("all")}
          >
            All homes
          </button>
          {homes.map((h) => (
            <button
              key={h}
              type="button"
              className={`team__chip ${homeFilter === h ? "is-on" : ""}`}
              onClick={() => setHomeFilter(h)}
            >
              {h}
            </button>
          ))}
        </div>

        <div className="team__chips" role="group" aria-label="Type">
          {(["all", "leave", "swap"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`team__chip ${typeFilter === t ? "is-on" : ""}`}
              onClick={() => setTypeFilter(t as TypeFilter)}
            >
              {t === "all" ? "All types" : t === "leave" ? "Leave / Overtime" : "Swaps"}
            </button>
          ))}
        </div>

        <div className="team__chips" role="group" aria-label="Status">
          {(["pending", "approved", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`team__chip ${approvalStatusFilter === s ? "is-on" : ""}`}
              onClick={() => setApprovalStatusFilter(s as ApprovalStatusFilter)}
            >
              {s === "all" ? "All statuses" : s === "pending" ? "Pending" : "Approved"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Requests & approvals table ─────────────────── */}
      <FadeIn delay={0.08}><section className="team__list card" aria-label="Requests and approvals">
        <header className="team__list-head">
          <div className="team__col team__col--who">Requested by</div>
          <div className="team__col team__col--with">With member</div>
          <div className="team__col team__col--type">Type</div>
          <div className="team__col team__col--summary">Details</div>
          <div className="team__col team__col--status">Status</div>
        </header>

        {requestRows.length === 0 ? (
          <div className="team__empty">No pending requests or approvals.</div>
        ) : (
          <StaggerList className="team__rows">
            {requestRows.map((row) => {
              const isResolved = resolved[row.id]
              return (
                <StaggerItem key={row.id} className="team__row">
                  {/* Requester */}
                  <div className="team__col team__col--who">
                    <span className="team__avatar" aria-hidden="true">
                      {row.requester.initials}
                    </span>
                    <div className="team__who-text">
                      <div className="team__name">{row.requester.name}</div>
                      <div className="team__role">{row.requester.role} · {row.requester.home}</div>
                    </div>
                  </div>

                  {/* With member (swaps only) */}
                  <div className="team__col team__col--with">
                    {row.counterparty ? (
                      <div className="team__with-member">
                        <span className="team__avatar team__avatar--small" aria-hidden="true">
                          {row.counterparty.initials}
                        </span>
                        <div className="team__who-text">
                          <div className="team__name">{row.counterparty.name}</div>
                          <div className="team__role">{row.counterparty.home}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="team__pending-none">—</span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="team__col team__col--type">
                    <span className={`badge badge--${row.typeTone}`}>
                      {row.typeLabel}
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="team__col team__col--summary">
                    <div className="team__summary-text">{row.summary}</div>
                    <div className="team__summary-when muted">{row.when}</div>
                  </div>

                  {/* Status + Actions dropdown */}
                  <div
                    className="team__col team__col--status"
                    ref={openMenuId === row.id ? menuRef : undefined}
                  >
                    <div className="team__status-wrap">
                      <span className={`badge badge--${isResolved ? "success" : row.statusTone}`}>
                        {isResolved ? "Approved" : row.statusLabel}
                      </span>
                      {canReview && row.canAction && !isResolved && (
                        <button
                          type="button"
                          className="team__status-arrow"
                          aria-label="Actions"
                          onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.47 5.47a.75.75 0 0 1 1.06 0L8 7.94l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {openMenuId === row.id && (
                      <div className="team__status-menu">
                        <button type="button" className="team__menu-item team__menu-item--approve" onClick={() => handleAction("approve", row)}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>
                          Approve
                        </button>
                        <button type="button" className="team__menu-item team__menu-item--reject" onClick={() => handleAction("reject", row)}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                          Reject
                        </button>
                        <div className="team__menu-divider" />
                        <button type="button" className="team__menu-item" onClick={() => handleAction("details", row)}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25V8.5h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" /></svg>
                          Ask for details
                        </button>
                        <button type="button" className="team__menu-item" onClick={() => handleAction("forward", row)}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" /></svg>
                          Forward request
                        </button>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerList>
        )}
      </section></FadeIn>

      {/* ── Team activity (hidden for Senior Managers — they use the table above) ── */}
      {!can("system.company.edit") && (
      <FadeIn delay={0.12}><section
        className="team__activity card"
        aria-label="Team activity in flight"
      >
        <header className="team__activity-head">
          <h2 className="team__activity-title">Team activity</h2>
          <p className="team__activity-sub">
            Leave, overtime, and swap requests from{" "}
            {canSeeAll ? "everyone in your home scope" : "your teammates"}.
            Managers and leads can action these from the Manage hub.
          </p>
        </header>

        {peerApprovals.length === 0 && peerSwaps.length === 0 ? (
          <div className="team__empty">
            No team leave, overtime, or swaps are in flight right now.
          </div>
        ) : (
          <StaggerList className="team__activity-list">
            {peerApprovals.map((a) => (
              <StaggerItem
                key={a.id}
                className={`team__activity-row team__activity-row--${a.kind}`}
              >
                <span className="team__avatar" aria-hidden="true">
                  {a.requester.initials}
                </span>
                <div className="team__activity-text">
                  <div className="team__activity-head-row">
                    <strong>{a.requester.name}</strong>
                    <span className="muted"> · {a.requester.role} · {a.requester.home}</span>
                    <span
                      className={`badge badge--${
                        a.kind === "leave" ? "info" : "warning"
                      }`}
                    >
                      {a.kind === "leave" ? "Leave" : "Overtime"}
                    </span>
                  </div>
                  <div className="team__activity-summary">{a.summary}</div>
                  <div className="team__activity-when muted">{a.when}</div>
                </div>
              </StaggerItem>
            ))}

            {peerSwaps.map((s) => (
              <StaggerItem key={s.id} className="team__activity-row team__activity-row--swap">
                <span className="team__avatar" aria-hidden="true">
                  {s.requester.initials}
                </span>
                <div className="team__activity-text">
                  <div className="team__activity-head-row">
                    <strong>{s.requester.name}</strong>
                    <span className="muted"> ↔ {s.counterparty.name}</span>
                    <span className="badge badge--neutral">Swap</span>
                  </div>
                  <div className="team__activity-summary">
                    {formatLocalDateTime(s.fromStart)} →{" "}
                    {formatLocalDateTime(s.toStart)}
                  </div>
                  <div className="team__activity-when muted">
                    {s.when}
                    {s.status === "awaiting_teammate"
                      ? " · awaiting teammate"
                      : s.status === "accepted"
                      ? " · accepted"
                      : s.status === "declined"
                      ? " · declined"
                      : " · cancelled"}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section></FadeIn>
      )}

      {/* ── Override modal ─────────────────────────────── */}
      <Modal
        open={!!overrideMember}
        onClose={() => setOverrideMember(null)}
        eyebrow="OVERRIDE"
        title={
          overrideMember ? `Override — ${overrideMember.name}` : "Override assign"
        }
        description={
          overrideMember
            ? `${overrideMember.role} · ${overrideMember.home}`
            : undefined
        }
        size="md"
      >
        {overrideMember && (
          <form onSubmit={handleOverrideSubmit}>
            <div className="form-row">
              <DateTimeField
                name="start"
                label="Shift start"
                required
                defaultValue={defaultOverrideStart}
              />
              <DateTimeField
                name="end"
                label="Shift end"
                required
                defaultValue={defaultOverrideEnd}
              />
            </div>
            <label className="form-field">
              <span className="form-field__label">Replacement</span>
              <input
                name="replacement"
                className="form-field__control"
                placeholder="Who covers this shift"
              />
            </label>
            <label className="form-field">
              <span className="form-field__label">Reason</span>
              <select
                name="reason"
                className="form-field__control"
                defaultValue="sickness"
              >
                <option value="sickness">Sickness</option>
                <option value="no_show">No-show</option>
                <option value="holiday">Holiday cover</option>
                <option value="training">Training</option>
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Note (optional)</span>
              <textarea
                name="note"
                className="form-field__control"
                placeholder="What should the audit log say?"
              />
            </label>
            <div className="modal__form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOverrideMember(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Draft override
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Review modal ───────────────────────────────── */}
      <Modal
        open={!!reviewMember}
        onClose={() => setReviewMember(null)}
        eyebrow="REVIEW"
        title={reviewMember ? `${reviewMember.name} — pending items` : "Review"}
        description={reviewMember?.role}
        size="sm"
        footer={
          reviewMember && (
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => declineReview(reviewMember)}
              >
                Decline all
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => approveReview(reviewMember)}
              >
                Approve all
              </button>
            </>
          )
        }
      >
        {reviewMember && (
          <ul className="team__review-list">
            {reviewMember.leavesPending > 0 && (
              <li className="team__review-item team__review-item--leave">
                <span className="eyebrow">Leave request</span>
                <span>{reviewMember.leavesPending} day(s) pending manager approval</span>
              </li>
            )}
            {reviewMember.swapsPending > 0 && (
              <li className="team__review-item team__review-item--swap">
                <span className="eyebrow">Swap request</span>
                <span>{reviewMember.swapsPending} swap(s) awaiting your decision</span>
              </li>
            )}
            {reviewMember.leavesPending === 0 && reviewMember.swapsPending === 0 && (
              <li className="team__review-item">
                <span>Nothing left to review.</span>
              </li>
            )}
          </ul>
        )}
      </Modal>

      {/* ── Forward modal ──────────────────────────────── */}
      <Modal
        open={!!forwardRow}
        onClose={() => setForwardRow(null)}
        eyebrow="FORWARD REQUEST"
        title={forwardRow ? `Forward — ${forwardRow.requester.name}` : "Forward request"}
        description={forwardRow ? `${forwardRow.typeLabel} request` : undefined}
        size="sm"
      >
        {forwardRow && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const recipient = fd.get("recipient") as string
              toast.success("Request forwarded", {
                description: `${forwardRow.requester.name}'s request forwarded to ${recipient}`,
              })
              setForwardRow(null)
            }}
          >
            <label className="form-field">
              <span className="form-field__label">Forward to</span>
              <select name="recipient" className="form-field__control" required>
                <option value="">Select a person…</option>
                {members
                  .filter((m) => m.name !== forwardRow.requester.name)
                  .map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} — {m.role} · {m.home}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Note (optional)</span>
              <textarea
                name="note"
                className="form-field__control"
                placeholder="Add context for the recipient…"
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
              />
            </label>
            <div className="modal__form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setForwardRow(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Forward
              </button>
            </div>
          </form>
        )}
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

export default TeamOverview
