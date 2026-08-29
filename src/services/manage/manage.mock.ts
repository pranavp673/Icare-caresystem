/**
 * Manage hub mock — source of truth for the four Manage panels
 * (overrides, approvals, swaps, permissions) and their types. Lives
 * inside the services tree so `manageService`, `teamService`, and
 * `swapService` can own their dependencies without reaching back into
 * `src/pages/Manage/*`.
 *
 * Notes
 * ─────
 * • Datetimes use the local-clock format `yyyy-mm-ddTHH:mm` (no zone). The
 *   real backend will store everything in UTC; the UI emits this format from
 *   <input type="datetime-local"> via DateTimeField, and we render it back
 *   with `Intl.DateTimeFormat`.
 * • Swap requests are NOT in MANAGE_APPROVALS — swaps go directly to the
 *   teammate, not the manager. They live in MANAGE_SWAPS as observe-only
 *   visibility for the manager. Approvals only contain leave + overtime.
 *
 * The `pages/Manage/manage.mock.ts` counterpart keeps only the UI
 * labels (`REASON_LABEL`, `ROLE_LABEL_MANAGE`, `SWAP_STATUS_LABEL`)
 * and imports types from `services/manage/manage.types`. Generic
 * datetime helpers (`formatLocalDateTime`, `formatLocalRange`) live
 * in `src/lib/format.ts`.
 */

export type OverrideDraft = {
  id: string
  /** ISO local datetime — start of the shift slot. */
  start: string
  /** ISO local datetime — end of the shift slot. */
  end: string
  home: string
  slot: string
  original: string
  replacement: string
  reason: "sickness" | "no_show" | "holiday" | "training"
  status: "draft" | "ready"
}

export const MANAGE_OVERRIDES: OverrideDraft[] = [
  {
    id: "ov-1",
    start: "2026-04-11T14:00",
    end: "2026-04-11T22:00",
    home: "Willow House",
    slot: "Oak Unit · Senior RSW",
    original: "Hiroki T.",
    replacement: "Daniel T.",
    reason: "sickness",
    status: "ready",
  },
  {
    id: "ov-2",
    start: "2026-04-12T07:00",
    end: "2026-04-12T15:00",
    home: "Oakmoor House",
    slot: "Night cover · RSW",
    original: "—",
    replacement: "Clara F. (offered)",
    reason: "no_show",
    status: "draft",
  },
  {
    id: "ov-3",
    start: "2026-04-17T15:00",
    end: "2026-04-17T23:00",
    home: "Rowan Lodge",
    slot: "Senior RSW cover",
    original: "Tomás R.",
    replacement: "Agency cover",
    reason: "training",
    status: "ready",
  },
]

/**
 * Approvals — leave + overtime only. Swap items are out, see MANAGE_SWAPS.
 * `requesterId` matches a TeamMember.id so the service layer can scope
 * approvals to a specific team when the viewer only has base visibility.
 */
export type ApprovalItem = {
  id: string
  kind: "leave" | "overtime"
  requesterId: string
  requester: { name: string; initials: string; role: string; home: string }
  summary: string
  when: string
  priority: "low" | "normal" | "high"
  status: "pending" | "approved" | "declined"
}

export const MANAGE_APPROVALS: ApprovalItem[] = [
  {
    id: "ap-2",
    kind: "leave",
    requesterId: "tm-4",
    requester: { name: "Tomás R.", initials: "TR", role: "Senior RSW", home: "Willow House" },
    summary: "Annual leave · 2–4 May (3 days)",
    when: "Submitted yesterday",
    priority: "normal",
    status: "pending",
  },
  {
    id: "ap-3",
    kind: "overtime",
    requesterId: "tm-3",
    requester: { name: "Clara F.", initials: "CF", role: "RSW", home: "Oakmoor House" },
    summary: "+4h cover · Wed 16 Apr",
    when: "Submitted this morning",
    priority: "high",
    status: "pending",
  },
  {
    id: "ap-5",
    kind: "leave",
    requesterId: "tm-8",
    requester: { name: "Beatrice M.", initials: "BM", role: "RSW", home: "Rowan Lodge" },
    summary: "Sick leave · Mon 13 Apr",
    when: "Submitted 1h ago",
    priority: "high",
    status: "pending",
  },
  {
    id: "ap-6",
    kind: "leave",
    requesterId: "tm-2",
    requester: { name: "Daniel T.", initials: "DT", role: "RSW", home: "Willow House" },
    summary: "Annual leave · 19–20 Jun (2 days)",
    when: "Submitted 3d ago",
    priority: "normal",
    status: "approved",
  },
  {
    id: "ap-7",
    kind: "leave",
    requesterId: "tm-6",
    requester: { name: "Finn O.", initials: "FO", role: "RSW", home: "Oakmoor House" },
    summary: "Sick leave · 12–16 Jun (5 days)",
    when: "Submitted 1d ago",
    priority: "high",
    status: "approved",
  },
]

/**
 * Swaps — visibility-only feed. Managers and teammates both consume this
 * through the Team Overview page. Decisions live with the teammate the
 * swap was requested *to* (counterparty); managers do NOT approve or
 * decline swaps — they only watch so they can intervene with an override
 * if a swap stalls.
 *
 * `requesterId` / `counterpartyId` match TeamMember.id so the service
 * layer can scope the feed to a single team when the viewer only has the
 * base `team.view` permission.
 */
export type SwapActivity = {
  id: string
  requesterId: string
  requester: { name: string; initials: string; role: string; home: string }
  counterpartyId: string
  counterparty: { name: string; initials: string; home: string }
  /** ISO local datetime — start of the original shift being given up. */
  fromStart: string
  /** ISO local datetime — start of the requested replacement shift. */
  toStart: string
  summary: string
  when: string
  status: "awaiting_teammate" | "accepted" | "declined" | "cancelled"
}

export const MANAGE_SWAPS: SwapActivity[] = [
  {
    id: "sw-1",
    requesterId: "tm-1",
    requester: { name: "Amira O.", initials: "AO", role: "RSW", home: "Willow House" },
    counterpartyId: "tm-2",
    counterparty: { name: "Daniel T.", initials: "DT", home: "Willow House" },
    fromStart: "2026-04-14T07:00",
    toStart: "2026-04-16T07:00",
    summary: "Mon 14 Apr 07:00 → Wed 16 Apr 07:00",
    when: "Sent 2h ago",
    status: "awaiting_teammate",
  },
  {
    id: "sw-2",
    requesterId: "tm-7",
    requester: { name: "Hiroki T.", initials: "HT", role: "RSW", home: "Willow House" },
    counterpartyId: "tm-8",
    counterparty: { name: "Beatrice M.", initials: "BM", home: "Willow House" },
    fromStart: "2026-04-17T14:00",
    toStart: "2026-04-19T14:00",
    summary: "Thu 17 Apr 14:00 → Sat 19 Apr 14:00",
    when: "Sent 3d ago",
    status: "awaiting_teammate",
  },
  {
    id: "sw-3",
    requesterId: "tm-3",
    requester: { name: "Clara F.", initials: "CF", role: "RSW", home: "Oakmoor House" },
    counterpartyId: "tm-6",
    counterparty: { name: "Finn O.", initials: "FO", home: "Oakmoor House" },
    fromStart: "2026-04-09T07:00",
    toStart: "2026-04-11T07:00",
    summary: "Thu 9 Apr 07:00 → Sat 11 Apr 07:00",
    when: "Accepted yesterday",
    status: "accepted",
  },
  {
    id: "sw-4",
    requesterId: "tm-1",
    requester: { name: "Amira O.", initials: "AO", role: "RSW", home: "Willow House" },
    counterpartyId: "tm-3",
    counterparty: { name: "Clara F.", initials: "CF", home: "Oakmoor House" },
    fromStart: "2026-06-18T07:00",
    toStart: "2026-06-20T07:00",
    summary: "Thu 18 Jun 07:00 → Sat 20 Jun 07:00",
    when: "Sent 1d ago",
    status: "awaiting_teammate",
  },
]

export type PermissionRow = {
  id: string
  name: string
  initials: string
  /**
   * Access-level label managed by AcsSvc — display-only on the UI. These
   * are the tiers a Registered Manager+ can grant to their own staff via
   * the Permissions panel (FR-MGR-05) — RI and System Admin are not
   * granted this way, so they're not options here.
   */
  accessLevel: "rsw" | "team_lead" | "deputy_manager" | "registered_manager"
  scope: string
  lastChanged: string
}

export const MANAGE_PERMISSIONS: PermissionRow[] = [
  {
    id: "pm-1",
    name: "Daniel T.",
    initials: "DT",
    accessLevel: "team_lead",
    scope: "Willow · Maple Unit",
    lastChanged: "12 Mar 2026 by Priya A.",
  },
  {
    id: "pm-2",
    name: "Tomás R.",
    initials: "TR",
    accessLevel: "team_lead",
    scope: "Willow · Oak Unit",
    lastChanged: "28 Feb 2026 by Priya A.",
  },
  {
    id: "pm-3",
    name: "Priya A.",
    initials: "PA",
    accessLevel: "registered_manager",
    scope: "Willow · All units",
    lastChanged: "04 Jan 2026 by Sam O.",
  },
  {
    id: "pm-4",
    name: "Clara F.",
    initials: "CF",
    accessLevel: "rsw",
    scope: "Oakmoor",
    lastChanged: "15 Feb 2026 by Sam O.",
  },
]
