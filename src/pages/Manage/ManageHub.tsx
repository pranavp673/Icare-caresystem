import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./ManageHub.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import Modal from "../../components/Modal/Modal"
import DateTimeField from "../../components/DateTimeField/DateTimeField"
import TeammatePicker from "../../components/TeammatePicker/TeammatePicker"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { PageTransition, StaggerList, StaggerItem } from "../../components/Motion"
import {
  ACCESS_LEVEL_LABEL,
  REASON_LABEL,
  SWAP_STATUS_LABEL,
} from "./manage.mock"
import { formatLocalRange } from "../../lib/format"
import { manageService } from "../../services"
import type {
  ApprovalItem,
  OverrideDraft,
  PermissionRow,
  SwapActivity,
} from "../../services/manage/manage.types"

/**
 * MANAGE-001 — Management hub.
 *
 * Five linked tabs so the header stays consistent across views:
 *
 *   All         — everything in one stack (overrides + approvals + swaps + perms)
 *   Overrides   — shift reassignments in flight
 *   Approvals   — pending leave / overtime to decide (NO swaps — see below)
 *   Swaps       — swap activity feed, observe-only (decisions live with the
 *                 teammate the swap was sent *to*; manager has visibility but
 *                 no buttons here)
 *   Permissions — grant / revoke role-scoped access
 *
 * Permission gates
 *   manage.view         — lands here (enforced at RequirePermission)
 *   approvals.review    — Approvals tab visible, Approve/Decline enabled
 *   permissions.grant   — Permissions tab visible
 *   team.overrideAssign — "New override" action in header
 *
 * Datetimes
 *   Override start/end are stored as local-clock ISO strings
 *   ("yyyy-mm-ddTHH:mm") and rendered through `formatLocalRange` so the
 *   user sees consistent labels regardless of where the data was entered.
 */

type Tab = "leaves" | "swaps" | "overtime" | "permissions"

const priorityTone = (p: ApprovalItem["priority"]) =>
  p === "high" ? "danger" : p === "low" ? "neutral" : "info"

const priorityLabel = (p: ApprovalItem["priority"]) =>
  p === "high" ? "Urgent" : p === "low" ? "Low" : "Normal"

const swapStatusTone = (s: SwapActivity["status"]) => {
  switch (s) {
    case "accepted":
      return "success"
    case "declined":
      return "danger"
    case "cancelled":
      return "neutral"
    default:
      return "warning"
  }
}

const ManageHub: React.FC = () => {
  const { can } = useAuth()
  const toast = useToast()
  const canApprove = can("approvals.review")
  const canGrant = can("permissions.grant")
  const canOverride = can("team.overrideAssign")

  // Live state — actions mutate these, not the imported constants.
  // Initial values come from manageService (which fans in across
  // RotaSvc, RequestSvc, SwapSvc, and AcsSvc's permissions proxy).
  const [overrides, setOverrides] = useState<OverrideDraft[]>([])
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [swaps, setSwaps] = useState<SwapActivity[]>([])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      manageService.listOverrides("all"),
      manageService.listApprovals(),
      manageService.listSwaps(),
      manageService.listPermissions(),
    ]).then(([o, a, s, p]) => {
      if (cancelled) return
      setOverrides(o)
      setApprovals(a)
      setSwaps(s)
      setPermissions(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Modals for the action buttons.
  const [newOverrideOpen, setNewOverrideOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOverride, setEditOverride] = useState<OverrideDraft | null>(null)
  const [changingPerm, setChangingPerm] = useState<PermissionRow | null>(null)

  const visibleTabs = useMemo<Tab[]>(() => {
    const tabs: Tab[] = []
    if (canApprove) tabs.push("leaves")
    tabs.push("swaps")
    tabs.push("overtime")
    if (canGrant) tabs.push("permissions")
    return tabs
  }, [canApprove, canGrant])

  const [tab, setTab] = useState<Tab>(canApprove ? "leaves" : "swaps")

  // ── Action handlers ─────────────────────────────────
  const approveItem = (a: ApprovalItem) => {
    // RequestSvc (via gateway). Optimistically remove from the list, then
    // re-insert on failure if the toast bridge reports an error. Since the
    // mock can't fail this is effectively a one-way removal for now.
    setApprovals((list) => list.filter((x) => x.id !== a.id))
    void manageService.approveRequest(a.id).then(() => {
      toast.success(`Approved ${a.kind} request`, {
        description: `${a.requester.name} — ${a.summary}`,
      })
    })
  }
  const declineItem = (a: ApprovalItem) => {
    setApprovals((list) => list.filter((x) => x.id !== a.id))
    void manageService.declineRequest(a.id).then(() => {
      toast.warning(`Declined ${a.kind} request`, {
        description: `${a.requester.name} — ${a.summary}`,
      })
    })
  }
  const markReady = (o: OverrideDraft) => {
    // Optimistic flip to ready, then confirm through RotaSvc.
    setOverrides((list) =>
      list.map((x) => (x.id === o.id ? { ...x, status: "ready" } : x))
    )
    void manageService.markOverrideReady(o.id).then(() => {
      toast.success("Override marked ready", {
        description: `${o.home} · ${o.slot}`,
      })
    })
  }
  const discardOverrideHandler = (o: OverrideDraft) => {
    setOverrides((list) => list.filter((x) => x.id !== o.id))
    void manageService.discardOverride(o.id).then(() => {
      toast.info("Override discarded", { description: `${o.home} · ${o.slot}` })
    })
  }
  const handleChangeAccessLevel = (row: PermissionRow, level: PermissionRow["accessLevel"]) => {
    void manageService
      .updateAccessLevel(row.id, { accessLevel: level })
      .then((updated) => {
        setPermissions((list) =>
          list.map((x) => (x.id === updated.id ? updated : x))
        )
        setChangingPerm(null)
        toast.success(`Access level updated`, {
          description: `${row.name} → ${ACCESS_LEVEL_LABEL[level]}`,
        })
      })
  }
  const handleCreateOverride = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const start = String(form.get("start") || "")
    const end = String(form.get("end") || "")
    if (!start || !end) {
      toast.danger("Pick start and end times", {
        description: "Override needs both a start and end datetime.",
      })
      return
    }
    void manageService
      .createOverride({
        start,
        end,
        home: String(form.get("home") || "Willow House"),
        slot: String(form.get("slot") || "Unassigned slot"),
        original: String(form.get("original") || "—"),
        replacement: String(form.get("replacement") || "TBD"),
        reason:
          (form.get("reason") as OverrideDraft["reason"]) || "sickness",
      })
      .then((draft) => {
        setOverrides((list) => [draft, ...list])
        setNewOverrideOpen(false)
        toast.success("Override created", {
          description: `${draft.home} · ${formatLocalRange(start, end)}`,
        })
      })
  }
  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") || "")
    const accessLevel = String(form.get("accessLevel") || "rsw") as PermissionRow["accessLevel"]
    void manageService.inviteTeammate({ email, accessLevel }).then(() => {
      setInviteOpen(false)
      toast.success("Invitation sent", {
        description: `${email} — pending their first sign-in`,
      })
    })
  }
  const handleEditSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editOverride) return
    const form = new FormData(e.currentTarget)
    void manageService
      .updateOverride(editOverride.id, {
        replacement: String(
          form.get("replacement") || editOverride.replacement
        ),
        start: String(form.get("start") || editOverride.start),
        end: String(form.get("end") || editOverride.end),
      })
      .then((updated) => {
        setOverrides((list) =>
          list.map((x) => (x.id === updated.id ? updated : x))
        )
        setEditOverride(null)
        toast.success("Override updated", {
          description: `${updated.home} · ${updated.slot}`,
        })
      })
  }

  // ── Panel fragments (reused by All tab) ─────────────
  const renderOverridesList = (list: OverrideDraft[]) => (
    <StaggerList className="manage__overrides">
      {list.map((o) => (
        <StaggerItem key={o.id} className="manage__override">
          <div className="manage__override-when">
            <span className="eyebrow">{REASON_LABEL[o.reason]}</span>
            <span className="manage__override-time">
              {formatLocalRange(o.start, o.end)}
            </span>
          </div>
          <div className="manage__override-body">
            <div className="manage__override-title">
              {o.home} · {o.slot}
            </div>
            <div className="manage__override-swap">
              <span className="manage__override-name">{o.original}</span>
              <span aria-hidden="true" className="manage__override-arrow">
                →
              </span>
              <span className="manage__override-name manage__override-name--to">
                {o.replacement}
              </span>
            </div>
          </div>
          <div className="manage__override-actions">
            <span
              className={`badge badge--${o.status === "ready" ? "success" : "info"}`}
            >
              {o.status === "ready" ? "Ready" : "Draft"}
            </span>
            {canOverride && (
              <>
                {o.status === "draft" && (
                  <button
                    type="button"
                    className="btn btn--ghost manage__btn"
                    onClick={() => markReady(o)}
                  >
                    Mark ready
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--secondary manage__btn"
                  onClick={() => setEditOverride(o)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--ghost manage__btn"
                  onClick={() => discardOverrideHandler(o)}
                  aria-label="Discard override"
                  title="Discard"
                >
                  ×
                </button>
              </>
            )}
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  )

  const renderApprovalsList = (list: ApprovalItem[]) => (
    <StaggerList className="manage__approvals">
      {list.map((a) => (
        <StaggerItem
          key={a.id}
          className={`manage__approval manage__approval--${a.kind}`}
        >
          <span className="manage__avatar" aria-hidden="true">
            {a.requester.initials}
          </span>
          <div className="manage__approval-body">
            <div className="manage__approval-head">
              <span className="manage__approval-name">{a.requester.name}</span>
              <span className="manage__approval-role">{a.requester.role} · {a.requester.home}</span>
              <span className={`badge badge--${priorityTone(a.priority)}`}>
                {priorityLabel(a.priority)}
              </span>
            </div>
            <div className="manage__approval-summary">{a.summary}</div>
            <div className="manage__approval-when">{a.when}</div>
          </div>
          <div className="manage__approval-actions">
            <button
              type="button"
              className="btn btn--ghost manage__btn"
              onClick={() => declineItem(a)}
            >
              Decline
            </button>
            <button
              type="button"
              className="btn btn--primary manage__btn"
              onClick={() => approveItem(a)}
            >
              Approve
            </button>
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  )

  const renderSwapsList = (list: SwapActivity[]) => (
    <StaggerList className="manage__swaps">
      {list.map((s) => (
        <StaggerItem key={s.id} className="manage__swap">
          <div className="manage__swap-parties">
            <span className="manage__avatar" aria-hidden="true">
              {s.requester.initials}
            </span>
            <span className="manage__swap-arrow" aria-hidden="true">
              ⇄
            </span>
            <span
              className="manage__avatar manage__avatar--counterparty"
              aria-hidden="true"
            >
              {s.counterparty.initials}
            </span>
          </div>
          <div className="manage__swap-body">
            <div className="manage__swap-head">
              <span className="manage__swap-name">{s.requester.name}</span>
              <span className="manage__swap-mid">→</span>
              <span className="manage__swap-name manage__swap-name--to">
                {s.counterparty.name}
              </span>
              <span className="manage__swap-role">{s.requester.role} · {s.requester.home}</span>
            </div>
            <div className="manage__swap-summary">{s.summary}</div>
            <div className="manage__swap-when">{s.when}</div>
          </div>
          <div className="manage__swap-status">
            <span className={`badge badge--${swapStatusTone(s.status)}`}>
              {SWAP_STATUS_LABEL[s.status]}
            </span>
            <span className="manage__swap-observe">View only</span>
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  )

  const renderPermissionsList = (list: PermissionRow[]) => (
    <StaggerList className="manage__perms">
      {list.map((p) => (
        <StaggerItem key={p.id} className="manage__perm">
          <span className="manage__avatar" aria-hidden="true">
            {p.initials}
          </span>
          <div className="manage__perm-body">
            <div className="manage__perm-name">{p.name}</div>
            <div className="manage__perm-scope">{p.scope}</div>
          </div>
          <div className="manage__perm-role">
            <span className="badge badge--info">{ACCESS_LEVEL_LABEL[p.accessLevel]}</span>
          </div>
          <div className="manage__perm-meta">
            <span className="eyebrow">Last change</span>
            <span>{p.lastChanged}</span>
          </div>
          <div className="manage__perm-actions">
            <button
              type="button"
              className="btn btn--ghost manage__btn"
              onClick={() => setChangingPerm(p)}
            >
              Change role
            </button>
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  )

  const emptyState = (label: string) => (
    <div className="manage__empty">
      <p>{label}</p>
    </div>
  )

  // For the New override datetime defaults, anchor on "today 14:00" so the
  // form has sensible values without surprising the user.
  const defaultStart = useMemo(() => {
    const d = new Date()
    d.setSeconds(0, 0)
    d.setHours(14, 0)
    return toLocalIso(d)
  }, [])
  const defaultEnd = useMemo(() => {
    const d = new Date()
    d.setSeconds(0, 0)
    d.setHours(22, 0)
    return toLocalIso(d)
  }, [])

  return (
    <PageTransition><div className="manage">
      <PageHeader
        eyebrow=""
        title="Manage"
        subtitle="Overrides, approvals, swap activity, and permissions — the levers you pull to keep homes covered."
        actions={
          <>
            <HomeFilter />
            {canOverride && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setNewOverrideOpen(true)}
              >
                New override
              </button>
            )}
          </>
        }
      />

      {/* ── Tab strip ──────────────────────────────────── */}
      <div className="manage__tabs" role="tablist">
        {visibleTabs.map((t) => (
          <button
            type="button"
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`manage__tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "leaves" && `Leaves (${approvals.length})`}
            {t === "swaps" && `Swaps (${swaps.length})`}
            {t === "overtime" && `Overtime (${overrides.length})`}
            {t === "permissions" && `Permissions (${permissions.length})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      {tab === "leaves" && canApprove && (
        <motion.section
          key="leaves"
          className="card"
          aria-labelledby="manage-leaves"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <header className="manage__panel-head">
            <h2 id="manage-leaves" className="section-title">
              Leave approvals
            </h2>
            <span className="eyebrow">{approvals.length} awaiting decision</span>
          </header>
          {approvals.length === 0
            ? emptyState("Inbox zero — nothing to decide.")
            : renderApprovalsList(approvals)}
        </motion.section>
      )}

      {tab === "swaps" && (
        <motion.section
          key="swaps"
          className="card"
          aria-labelledby="manage-swaps"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <header className="manage__panel-head">
            <h2 id="manage-swaps" className="section-title">
              Swap activity
            </h2>
            <span className="eyebrow">
              {swaps.length} in flight · view only
            </span>
          </header>
          {swaps.length === 0
            ? emptyState("No swaps in flight.")
            : renderSwapsList(swaps)}
        </motion.section>
      )}

      {tab === "overtime" && (
        <motion.section
          key="overtime"
          className="card"
          aria-labelledby="manage-overtime"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <header className="manage__panel-head">
            <h2 id="manage-overtime" className="section-title">
              Overtime &amp; overrides
            </h2>
            <span className="eyebrow">{overrides.length} active</span>
          </header>
          {overrides.length === 0
            ? emptyState("No overrides in flight.")
            : renderOverridesList(overrides)}
        </motion.section>
      )}

      {tab === "permissions" && canGrant && (
        <motion.section
          key="permissions"
          className="card"
          aria-labelledby="manage-permissions"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <header className="manage__panel-head">
            <h2 id="manage-permissions" className="section-title">
              Access &amp; permissions
            </h2>
            <button
              type="button"
              className="btn btn--secondary manage__btn"
              onClick={() => setInviteOpen(true)}
            >
              Invite teammate
            </button>
          </header>
          {renderPermissionsList(permissions)}
        </motion.section>
      )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────── */}
      <Modal
        open={newOverrideOpen}
        onClose={() => setNewOverrideOpen(false)}
        eyebrow="OVERRIDE"
        title="New shift override"
        description="Reassign a shift to keep a home covered."
        size="md"
      >
        <form onSubmit={handleCreateOverride} id="new-override-form">
          <div className="form-row">
            <label className="form-field">
              <span className="form-field__label">Home</span>
              <select
                name="home"
                className="form-field__control"
                defaultValue="Willow House"
              >
                <option>Willow House</option>
                <option>Oakmoor House</option>
                <option>Rowan Lodge</option>
              </select>
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
          </div>
          <div className="form-row">
            <DateTimeField
              name="start"
              label="Start"
              required
              defaultValue={defaultStart}
            />
            <DateTimeField
              name="end"
              label="End"
              required
              defaultValue={defaultEnd}
            />
          </div>
          <label className="form-field">
            <span className="form-field__label">Slot</span>
            <input
              name="slot"
              className="form-field__control"
              placeholder="Oak Unit · Senior RSW"
              defaultValue="Oak Unit · Senior RSW"
            />
          </label>
          <div className="form-row">
            <TeammatePicker
              name="original"
              label="Original"
              wide
              hint="Person originally assigned to this shift."
            />
            <TeammatePicker
              name="replacement"
              label="Replacement"
              wide
              hint="Who takes it — managers can pick anyone in scope."
            />
          </div>
          <div className="modal__form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setNewOverrideOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save draft
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editOverride}
        onClose={() => setEditOverride(null)}
        eyebrow="OVERRIDE"
        title={editOverride ? `Edit — ${editOverride.home}` : "Edit override"}
        description={editOverride ? editOverride.slot : undefined}
        size="md"
      >
        {editOverride && (
          <form onSubmit={handleEditSave}>
            <div className="form-row">
              <DateTimeField
                name="start"
                label="Start"
                required
                defaultValue={editOverride.start}
              />
              <DateTimeField
                name="end"
                label="End"
                required
                defaultValue={editOverride.end}
              />
            </div>
            <label className="form-field">
              <span className="form-field__label">Replacement</span>
              <input
                name="replacement"
                className="form-field__control"
                defaultValue={editOverride.replacement}
              />
            </label>
            <div className="modal__form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setEditOverride(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Save changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        eyebrow="PEOPLE"
        title="Invite a teammate"
        description="They'll receive a one-time link to set up sign-in."
        size="sm"
      >
        <form onSubmit={handleInvite}>
          <label className="form-field">
            <span className="form-field__label">Work email</span>
            <input
              type="email"
              name="email"
              required
              className="form-field__control"
              placeholder="name@carehome.co.uk"
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">Starting role</span>
            <select
              name="accessLevel"
              className="form-field__control"
              defaultValue="rsw"
            >
              <option value="rsw">RSW</option>
              <option value="team_lead">Team Leader</option>
              <option value="deputy_manager">Deputy Manager</option>
              <option value="registered_manager">Registered Manager</option>
            </select>
          </label>
          <div className="modal__form-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Send invite
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!changingPerm}
        onClose={() => setChangingPerm(null)}
        eyebrow="ROLE"
        title={changingPerm ? `Change role — ${changingPerm.name}` : "Change role"}
        description={changingPerm?.scope}
        size="sm"
      >
        {changingPerm && (
          <div className="manage__role-picker">
            {(Object.keys(ACCESS_LEVEL_LABEL) as Array<PermissionRow["accessLevel"]>).map(
              (r) => (
                <button
                  type="button"
                  key={r}
                  className={`manage__role-option ${
                    r === changingPerm.accessLevel ? "is-current" : ""
                  }`}
                  onClick={() => handleChangeAccessLevel(changingPerm, r)}
                >
                  <span className="manage__role-option-name">
                    {ACCESS_LEVEL_LABEL[r]}
                  </span>
                  {r === changingPerm.accessLevel && (
                    <span className="badge badge--info">Current</span>
                  )}
                </button>
              )
            )}
          </div>
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

export default ManageHub
