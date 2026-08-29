/**
 * Page-level UI constants for the Audit log. The `AuditEvent` /
 * `AuditDomain` / `AuditChannel` / `AuditSeverity` types and the
 * `AUDIT_EVENTS` seed stream now live in
 * `src/services/audit/audit.mock.ts` — the services tree owns all
 * domain data. This file is kept only for labels and layout hints
 * specific to the Audit page UI.
 */
import type { AuditDomain } from "../../services/audit/audit.types"

export const DOMAIN_LABEL: Record<AuditDomain, string> = {
  home: "Home events",
  team: "Team events",
  people: "People comments",
  professional: "Professional actions",
}

export const DOMAIN_HINT: Record<AuditDomain, string> = {
  home: "Ofsted visits, Reg 44, evidence packs, and home-wide compliance.",
  team: "Rota changes, swaps, overrides, and permission updates.",
  people: "Placement plans, safeguarding, and incident notes on young people.",
  professional: "Individual actions — clock-ins, auth, requests.",
}

export const DOMAIN_ORDER: AuditDomain[] = [
  "home",
  "team",
  "people",
  "professional",
]
