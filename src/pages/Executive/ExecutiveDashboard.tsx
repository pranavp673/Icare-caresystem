import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import "./ExecutiveDashboard.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import {
  PageTransition,
  FadeIn,
  StaggerList,
  StaggerItem,
  staggerContainer,
  staggerItem,
  standardTransition,
} from "../../components/Motion"
import { useAuth } from "../../auth/AuthContext"
import {
  MOCK_HOME_HEALTH,
  MOCK_ESCALATIONS,
  MOCK_PENDING,
  MOCK_STAFF_ON_DUTY,
  MOCK_TODAY_EVENTS,
} from "./executive.mock"
import type { HomeHealth, Escalation, IncidentSeverity, StaffOnDuty, TodayEvent } from "./executive.mock"

/**
 * Executive dashboard for manager-tier users (Deputy Manager, Registered
 * Manager, RI, System Admin).
 *
 * Not a personal schedule view — this is an operational command centre.
 * Shows at-a-glance health of the user's home(s), escalations requiring
 * attention, and pending approval queue. Automatically scoped by the
 * signed-in user's `homes` array:
 *   - RI / System Admin → all homes (multi-home layout)
 *   - Registered Manager / Deputy Manager → their single home (always — see auth/user.ts)
 */

// ── Helpers ────────────────────────────────────────────

const severityColor = (s: IncidentSeverity): string => {
  switch (s) {
    case "critical":
      return "var(--color-danger)"
    case "major":
      return "var(--color-warning)"
    case "moderate":
      return "var(--color-info)"
    default:
      return "var(--color-fg-subtle)"
  }
}

const severityBadge = (s: IncidentSeverity): string => {
  switch (s) {
    case "critical":
      return "badge--danger"
    case "major":
      return "badge--warning"
    case "moderate":
      return "badge--info"
    default:
      return ""
  }
}

const categoryIcon = (cat: Escalation["category"]): string => {
  switch (cat) {
    case "incident":
      return "⚠" // ⚠
    case "staffing":
      return "\u{1F465}" // 👥
    case "compliance":
      return "\u{1F4CB}" // 📋
    case "complaint":
      return "\u{1F4E9}" // 📩
    default:
      return "•"
  }
}

const healthColor = (score: number): string => {
  if (score >= 80) return "var(--color-success)"
  if (score >= 60) return "var(--color-warning)"
  return "var(--color-danger)"
}

const staffPercent = (h: HomeHealth): number =>
  h.staffRequired > 0
    ? Math.round((h.staffPresent / h.staffRequired) * 100)
    : 100

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const hasCritical = (h: HomeHealth): boolean =>
  h.incidents.some(
    (i) => i.severity === "critical" || i.severity === "major"
  )

// ── Component ──────────────────────────────────────────

const ExecutiveDashboard: React.FC = () => {
  const { user } = useAuth()
  const [expandedHome, setExpandedHome] = useState<string | null>(null)

  // Scope data to the user's homes
  const userHomeIds = useMemo(() => new Set(user.homes.map((h) => h.id)), [user.homes])
  // Registered Manager/Deputy Manager are always single-home, RI/System Admin
  // are always multi-home (see auth/user.ts) — homes.length is a reliable proxy,
  // so no separate permission check is needed here.
  const isMultiHome = user.homes.length > 1

  const homes = useMemo(
    () => MOCK_HOME_HEALTH.filter((h) => userHomeIds.has(h.id)),
    [userHomeIds]
  )
  const escalations = useMemo(
    () => MOCK_ESCALATIONS.filter((e) => userHomeIds.has(e.homeId)),
    [userHomeIds]
  )
  const pending = useMemo(
    () => MOCK_PENDING.filter((p) => userHomeIds.has(p.homeId)),
    [userHomeIds]
  )

  // Aggregate totals
  const totals = useMemo(() => {
    const totalStaffReq = homes.reduce((s, h) => s + h.staffRequired, 0)
    const totalStaffPres = homes.reduce((s, h) => s + h.staffPresent, 0)
    const totalIncidents = homes.reduce((s, h) => s + h.incidentCount, 0)
    const criticalCount = homes.reduce(
      (s, h) =>
        s +
        h.incidents
          .filter((i) => i.severity === "critical" || i.severity === "major")
          .reduce((a, i) => a + i.count, 0),
      0
    )
    const totalEscalations = escalations.length
    const totalPending = pending.length
    const totalResidents = homes.reduce((s, h) => s + h.residentCount, 0)
    return {
      totalStaffReq,
      totalStaffPres,
      totalIncidents,
      criticalCount,
      totalEscalations,
      totalPending,
      totalResidents,
      homeCount: homes.length,
    }
  }, [homes, escalations, pending])

  return (
    <PageTransition>
      <div className="sr-dash">
        <PageHeader
          eyebrow={isMultiHome ? "ALL-HOMES OVERSIGHT" : "HOME MANAGEMENT"}
          title={`Good morning, ${user.name.split(" ")[0]}`}
          subtitle={
            totals.homeCount > 1
              ? `${totals.homeCount} homes under your oversight — here's how things stand today.`
              : `${homes[0]?.name ?? "Your home"} — here's how things stand today.`
          }
          actions={
            <Link to="/me/personal" className="btn btn--ghost">
              My personal leave &amp; schedule
            </Link>
          }
        />

        {/* ── Summary strip ────────────────────────────── */}
        <FadeIn delay={0.05}>
          <div className="sr-dash__summary">
            <div className="sr-dash__stat">
              <span className="sr-dash__stat-value">{totals.homeCount}</span>
              <span className="sr-dash__stat-label">Homes</span>
            </div>
            <div className="sr-dash__stat">
              <span className="sr-dash__stat-value">
                {totals.totalStaffPres}
                <span className="sr-dash__stat-of">/{totals.totalStaffReq}</span>
              </span>
              <span className="sr-dash__stat-label">Staff today</span>
            </div>
            <div className="sr-dash__stat">
              <span className="sr-dash__stat-value">{totals.totalResidents}</span>
              <span className="sr-dash__stat-label">Young people</span>
            </div>
            <div className={`sr-dash__stat ${totals.criticalCount > 0 ? "sr-dash__stat--alert" : ""}`}>
              <span className="sr-dash__stat-value">{totals.totalIncidents}</span>
              <span className="sr-dash__stat-label">
                Incidents{" "}
                {totals.criticalCount > 0 && (
                  <span className="sr-dash__stat-critical">
                    {totals.criticalCount} critical/major
                  </span>
                )}
              </span>
            </div>
            <div className={`sr-dash__stat ${totals.totalEscalations > 0 ? "sr-dash__stat--warn" : ""}`}>
              <span className="sr-dash__stat-value">{totals.totalEscalations}</span>
              <span className="sr-dash__stat-label">Escalations</span>
            </div>
            <div className="sr-dash__stat">
              <span className="sr-dash__stat-value">{totals.totalPending}</span>
              <span className="sr-dash__stat-label">Pending approvals</span>
            </div>
          </div>
        </FadeIn>

        {/* ── Home cards ───────────────────────────────── */}
        <FadeIn delay={0.1}>
          <section>
            <h2 className="section-title sr-dash__section-title">Homes overview</h2>
            <motion.div
              className={`sr-dash__homes ${homes.length === 1 ? "sr-dash__homes--single" : ""}`}
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {homes.map((home) => (
                <HomeCard
                  key={home.id}
                  home={home}
                  escalations={escalations.filter(
                    (e) => e.homeId === home.id
                  )}
                  pendingCount={
                    pending.filter((p) => p.homeId === home.id).length
                  }
                  expanded={expandedHome === home.id}
                  onToggle={() =>
                    setExpandedHome((prev) =>
                      prev === home.id ? null : home.id
                    )
                  }
                />
              ))}

              {/* Single-home view: fill space with staff + schedule panels */}
              {homes.length === 1 && (
                <div className="sr-dash__side-panels">
                  <StaffOnDutyPanel homeId={homes[0].id} />
                  <TodaySchedulePanel homeId={homes[0].id} />
                </div>
              )}
            </motion.div>
          </section>
        </FadeIn>

        {/* ── Escalations ──────────────────────────────── */}
        <FadeIn delay={0.15}>
          <div className="sr-dash__bottom-grid">
            <section className="card card--padded">
              <header className="section-head">
                <h3 className="section-title">Escalations to you</h3>
                <span className={`badge ${escalations.length > 0 ? "badge--danger" : ""}`}>
                  {escalations.length}
                </span>
              </header>
              {escalations.length === 0 ? (
                <p className="sr-dash__empty">No active escalations.</p>
              ) : (
                <StaggerList className="sr-dash__esc-list">
                  {escalations.map((e) => (
                    <StaggerItem key={e.id} className="sr-dash__esc-item">
                      <span className="sr-dash__esc-icon">
                        {categoryIcon(e.category)}
                      </span>
                      <div className="sr-dash__esc-body">
                        <div className="sr-dash__esc-title">{e.title}</div>
                        <div className="sr-dash__esc-meta">
                          {e.homeName} &middot; {e.raisedBy} &middot;{" "}
                          {timeAgo(e.raisedAt)}
                        </div>
                      </div>
                      <span className={`badge ${severityBadge(e.severity)}`}>
                        {e.severity}
                      </span>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>

            {/* ── Pending approvals ────────────────────── */}
            <section className="card card--padded">
              <header className="section-head">
                <h3 className="section-title">Pending approvals</h3>
                <span className={`badge ${pending.length > 0 ? "badge--warning" : ""}`}>
                  {pending.length}
                </span>
              </header>
              {pending.length === 0 ? (
                <p className="sr-dash__empty">Nothing waiting for your approval.</p>
              ) : (
                <StaggerList className="sr-dash__pending-list">
                  {pending.map((p) => (
                    <StaggerItem key={p.id} className="sr-dash__pending-item">
                      <span className={`sr-dash__pending-type sr-dash__pending-type--${p.type}`}>
                        {p.type === "leave" && "◷"}
                        {p.type === "overtime" && "+"}
                        {p.type === "swap" && "⇄"}
                        {p.type === "variance" && "Δ"}
                      </span>
                      <div className="sr-dash__pending-body">
                        <div className="sr-dash__pending-summary">
                          {p.summary}
                        </div>
                        <div className="sr-dash__pending-meta">
                          {p.homeName} &middot; {p.requestedBy} &middot;{" "}
                          {timeAgo(p.requestedAt)}
                        </div>
                      </div>
                      <div className="sr-dash__pending-actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--primary"
                        >
                          Review
                        </button>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </section>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}

// ── Home Card sub-component ────────────────────────────

type HomeCardProps = {
  home: HomeHealth
  escalations: Escalation[]
  pendingCount: number
  expanded: boolean
  onToggle: () => void
}

const HomeCard: React.FC<HomeCardProps> = ({
  home,
  escalations,
  pendingCount,
  expanded,
  onToggle,
}) => {
  const pct = staffPercent(home)
  const critical = hasCritical(home)
  const scoreColor = healthColor(home.healthScore)

  return (
    <motion.div
      className={`sr-home-card ${critical ? "sr-home-card--alert" : ""}`}
      variants={staggerItem}
      transition={standardTransition}
      layout
    >
      {/* Header */}
      <div className="sr-home-card__header" onClick={onToggle}>
        <div className="sr-home-card__title-row">
          <h3 className="sr-home-card__name">{home.name}</h3>
          <div
            className="sr-home-card__score"
            style={{ "--score-color": scoreColor } as React.CSSProperties}
          >
            {home.healthScore}
          </div>
        </div>
        <div className="sr-home-card__subtitle">
          {home.residentCount} young people &middot; Updated {timeAgo(home.lastUpdated)}
        </div>
      </div>

      {/* Metrics row */}
      <div className="sr-home-card__metrics">
        {/* Staff gauge */}
        <div className="sr-home-card__metric">
          <div className="sr-home-card__metric-label">Staffing</div>
          <div className="sr-home-card__gauge">
            <div className="sr-home-card__gauge-track">
              <div
                className="sr-home-card__gauge-fill"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: pct >= 90 ? "var(--color-success)" : pct >= 70 ? "var(--color-warning)" : "var(--color-danger)",
                }}
              />
            </div>
            <span className="sr-home-card__gauge-text">
              {home.staffPresent}/{home.staffRequired}
            </span>
          </div>
          {home.staffOnLeave > 0 && (
            <div className="sr-home-card__metric-note">
              {home.staffOnLeave} on leave
            </div>
          )}
        </div>

        {/* Incidents */}
        <div className="sr-home-card__metric">
          <div className="sr-home-card__metric-label">Incidents</div>
          <div className="sr-home-card__incident-row">
            {home.incidentCount === 0 ? (
              <span className="sr-home-card__incident-zero">None</span>
            ) : (
              home.incidents.map((inc) => (
                <span
                  key={inc.severity}
                  className="sr-home-card__incident-pip"
                  style={{ "--pip-color": severityColor(inc.severity) } as React.CSSProperties}
                  title={`${inc.count} ${inc.severity}`}
                >
                  {inc.count}
                  <span className="sr-home-card__incident-sev">
                    {inc.severity.charAt(0).toUpperCase()}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Escalations & pending */}
        <div className="sr-home-card__metric">
          <div className="sr-home-card__metric-label">Needs attention</div>
          <div className="sr-home-card__attention-row">
            {home.escalations > 0 && (
              <span className="sr-home-card__attention-chip sr-home-card__attention-chip--esc">
                {home.escalations} escalation{home.escalations !== 1 ? "s" : ""}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="sr-home-card__attention-chip sr-home-card__attention-chip--pending">
                {pendingCount} pending
              </span>
            )}
            {home.escalations === 0 && pendingCount === 0 && (
              <span className="sr-home-card__attention-clear">All clear</span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: escalation details */}
      {expanded && escalations.length > 0 && (
        <div className="sr-home-card__detail">
          <div className="sr-home-card__detail-title">Escalations</div>
          {escalations.map((e) => (
            <div key={e.id} className="sr-home-card__detail-row">
              <span className={`badge badge--sm ${severityBadge(e.severity)}`}>
                {e.severity}
              </span>
              <span className="sr-home-card__detail-text">{e.title}</span>
              <span className="sr-home-card__detail-time">
                {timeAgo(e.raisedAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer action */}
      <div className="sr-home-card__footer">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggle}>
          {expanded ? "Collapse" : "View details"}
        </button>
      </div>
    </motion.div>
  )
}

// ── Staff on duty panel ──────────────────────────────

const STATUS_META: Record<StaffOnDuty["status"], { label: string; className: string }> = {
  on_shift: { label: "On shift", className: "sr-staff__status--active" },
  on_break: { label: "Break", className: "sr-staff__status--break" },
  arriving: { label: "Arriving", className: "sr-staff__status--arriving" },
  on_leave: { label: "Leave", className: "sr-staff__status--leave" },
}

const StaffOnDutyPanel: React.FC<{ homeId: string }> = ({ homeId }) => {
  const staff = MOCK_STAFF_ON_DUTY[homeId] ?? []
  const onShift = staff.filter((s) => s.status === "on_shift").length
  const total = staff.length

  return (
    <div className="card card--padded sr-staff-panel">
      <header className="section-head">
        <h3 className="section-title">Staff on duty</h3>
        <span className="badge">{onShift}/{total}</span>
      </header>
      <ul className="sr-staff__list">
        {staff.map((s) => {
          const meta = STATUS_META[s.status]
          return (
            <li key={s.id} className="sr-staff__row">
              <span className={`sr-staff__avatar ${meta.className}`}>
                {s.initials}
              </span>
              <div className="sr-staff__info">
                <span className="sr-staff__name">{s.name}</span>
                <span className="sr-staff__role">{s.role}</span>
              </div>
              <div className="sr-staff__right">
                <span className="sr-staff__shift">{s.shift}</span>
                <span className={`sr-staff__status ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Today's schedule panel ───────────────────────────

const EVENT_CAT_CLASS: Record<TodayEvent["category"], string> = {
  meeting: "sr-sched__dot--meeting",
  visit: "sr-sched__dot--visit",
  review: "sr-sched__dot--review",
  admin: "sr-sched__dot--admin",
}

const TodaySchedulePanel: React.FC<{ homeId: string }> = ({ homeId }) => {
  const events = MOCK_TODAY_EVENTS.filter((e) => e.homeId === homeId).sort(
    (a, b) => a.time.localeCompare(b.time)
  )

  return (
    <div className="card card--padded sr-sched-panel">
      <header className="section-head">
        <h3 className="section-title">Today's schedule</h3>
        <span className="badge">{events.length}</span>
      </header>
      {events.length === 0 ? (
        <p className="sr-dash__empty">Nothing scheduled for today.</p>
      ) : (
        <ul className="sr-sched__list">
          {events.map((ev) => (
            <li key={ev.id} className="sr-sched__row">
              <span className="sr-sched__time">{ev.time}</span>
              <span className={`sr-sched__dot ${EVENT_CAT_CLASS[ev.category]}`} />
              <span className="sr-sched__title">{ev.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ExecutiveDashboard
