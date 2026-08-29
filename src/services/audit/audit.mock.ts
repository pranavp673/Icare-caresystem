/**
 * AuditSvc mock — source of truth for the audit event type hierarchy
 * and the `AUDIT_EVENTS` seed stream. Lives inside the services tree so
 * `auditService` can own its dependencies without reaching back into
 * `src/pages/Audit/*`.
 *
 * The legacy `pages/Audit/audit.mock.ts` keeps only the UI constants
 * (`DOMAIN_LABEL`, `DOMAIN_HINT`, `DOMAIN_ORDER`) used by `AuditLog.tsx`
 * and now imports `AuditDomain` from `services/audit/audit.types`.
 */
export type AuditSeverity = "info" | "notice" | "warning" | "critical"
export type AuditChannel = "auth" | "rota" | "care" | "permissions"

/**
 * Hierarchical domain — what the user has permission to see is organised
 * by *what kind of thing* was touched, not what module emitted the event.
 *
 *   home          — home-wide events (Ofsted visits, Reg 44, evidence packs)
 *   team          — schedule/permission actions (swaps, overrides, roles)
 *   people        — notes on young people in care (placement plans, incidents,
 *                   safeguarding flagged against a resident)
 *   professional  — individual action by a professional (clock-in, auth)
 */
export type AuditDomain = "home" | "team" | "people" | "professional"

export type AuditEvent = {
  id: string
  at: string // ISO-ish display string
  /** Team-member id when the actor is a known user in the system.
   *  `null` for system/external actors (scheduler, Ofsted, auditor SVC). */
  actorId: string | null
  actor: string
  actorRole: string
  action: string
  target: string
  /** Which home the event belongs to (for scope-based RBAC later). */
  home?: string
  domain: AuditDomain
  channel: AuditChannel
  severity: AuditSeverity
}

export const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "e1",
    at: "2026-04-11 07:02",
    actorId: "tm-1",
    actor: "Amira O.",
    actorRole: "RSW",
    action: "Clocked in",
    target: "Shift #W-8821",
    home: "Willow House",
    domain: "professional",
    channel: "rota",
    severity: "info",
  },
  {
    id: "e2",
    at: "2026-04-11 06:48",
    actorId: "tm-4",
    actor: "Tomás R.",
    actorRole: "Senior RSW",
    action: "Logged waking night handover",
    target: "Subject A-1139",
    home: "Willow House",
    domain: "people",
    channel: "care",
    severity: "info",
  },
  {
    id: "e3",
    at: "2026-04-11 06:32",
    actorId: null,
    actor: "System",
    actorRole: "Rota scheduler",
    action: "Auto-filled vacancy",
    target: "Shift #W-8870 · Willow House",
    home: "Willow House",
    domain: "team",
    channel: "rota",
    severity: "notice",
  },
  {
    id: "e4",
    at: "2026-04-11 03:14",
    actorId: "tm-2",
    actor: "Daniel T.",
    actorRole: "RSW",
    action: "Logged incident",
    target: "Subject A-1137 · IN-0219",
    home: "Willow House",
    domain: "people",
    channel: "care",
    severity: "warning",
  },
  {
    id: "e5",
    at: "2026-04-10 22:10",
    actorId: "tm-5",
    actor: "Priya A.",
    actorRole: "Registered Manager",
    action: "Granted permission",
    target: "audit:read to Clara F.",
    home: "Oakmoor House",
    domain: "team",
    channel: "permissions",
    severity: "warning",
  },
  {
    id: "e6",
    at: "2026-04-10 21:55",
    actorId: "tm-5",
    actor: "Priya A.",
    actorRole: "Registered Manager",
    action: "Published rota",
    target: "Week 15 · Apr 14–20",
    home: "Willow House",
    domain: "team",
    channel: "rota",
    severity: "notice",
  },
  {
    id: "e7",
    at: "2026-04-10 18:03",
    actorId: "tm-3",
    actor: "Clara F.",
    actorRole: "RSW",
    action: "Sign-in failed (bad password)",
    target: "—",
    home: "Oakmoor House",
    domain: "professional",
    channel: "auth",
    severity: "warning",
  },
  {
    id: "e8",
    at: "2026-04-10 17:41",
    actorId: "tm-5",
    actor: "Priya A.",
    actorRole: "Registered Manager",
    action: "Accepted swap",
    target: "Amira O. ↔ Daniel T.",
    home: "Willow House",
    domain: "team",
    channel: "rota",
    severity: "info",
  },
  {
    id: "e9",
    at: "2026-04-10 16:12",
    actorId: null,
    actor: "Reg 44 Visitor",
    actorRole: "External",
    action: "Exported evidence pack",
    target: "Mar 2026 · Willow",
    home: "Willow House",
    domain: "home",
    channel: "permissions",
    severity: "critical",
  },
  {
    id: "e10",
    at: "2026-04-10 14:00",
    actorId: "tm-4",
    actor: "Tomás R.",
    actorRole: "Senior RSW",
    action: "Closed placement plan revision",
    target: "Subject A-1142",
    home: "Willow House",
    domain: "people",
    channel: "care",
    severity: "info",
  },
  {
    id: "e11",
    at: "2026-04-10 11:20",
    actorId: null,
    actor: "Ofsted Inspector",
    actorRole: "External",
    action: "Posted compliance note",
    target: "Oakmoor · safeguarding procedure",
    home: "Oakmoor House",
    domain: "home",
    channel: "care",
    severity: "notice",
  },
  {
    id: "e12",
    at: "2026-04-10 09:04",
    actorId: "tm-6",
    actor: "Finn O.",
    actorRole: "RSW",
    action: "Requested overtime",
    target: "+4h · Wed 16 Apr",
    home: "Oakmoor House",
    domain: "professional",
    channel: "rota",
    severity: "info",
  },
]
