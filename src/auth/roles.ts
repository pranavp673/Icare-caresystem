/**
 * Permission catalogue for ICare.
 *
 * Every screen and action is gated by a *permission* string. The UI never
 * knows what "role" the signed-in user has — it only sees a flat
 * `Permission[]` array returned by the backend (`GET /api/me/permissions`).
 *
 * On the backend, an IAM-style Access Control Service (AcsSvc) resolves
 * the user's effective permissions from:
 *   1. Named roles (RSW, Team Leader, …) — baseline bundles.
 *   2. Custom policies — per-user or per-team overrides set by managers.
 *   3. Time-scoped grants — emergency access windows with audit notes.
 *
 * The UI's only job is to consume the flattened result and gate features.
 *
 * Scope rule
 * ──────────
 * Some permissions come in a pair — a base grant and a `*.all` widening.
 *   • `team.view`      → everyone (see the Team page; content scoped to own team)
 *   • `team.view.all`  → leads and up (see every team in the home scope)
 *   • `audit.view`     → everyone (see the Audit page; scoped to own team)
 *   • `audit.view.all` → managers and up (see every event in the home scope)
 * Pages ask for the base permission at the route gate and then check the
 * `.all` widening inside the page to decide which query scope to fetch.
 *
 * TODO(admin-panel): a future admin console will manage policies per user,
 * per team, and per home through AcsSvc. See `docs/admin-panel.md`.
 */

export type Permission =
  // ── Personal — every authenticated user ──────────────
  | "me.view"
  | "leave.request"
  | "swap.request"
  | "variance.submit" //    submit a variance request (self, or team member for leads+)

  // ── Team scope ────────────────────────────────────────
  | "team.view" //          Team page scoped to own team (Lead+)
  | "team.view.all" //      every team in the home scope (Lead+)
  | "team.overrideAssign"
  | "team.analytics.view"

  // ── Home / operational scope ──────────────────────────
  | "home.view"
  | "home.analytics.view"
  | "people.view" //        view staff profiles
  | "people.edit" //        edit staff profiles (not creation of senior accounts)
  | "staff.add" //          add Team Leader / RSW to a home (Manager)

  // ── Residents ─────────────────────────────────────────
  | "residents.view" //     view resident profiles and care records
  | "residents.edit" //     edit resident details (not comments — see below)
  | "residents.comments.write" // add/edit notes on resident records (everyone EXCEPT admin)

  // ── Timesheets & variance ─────────────────────────────
  | "timesheets.view.all" // view all timesheets across a home (Manager, Deputy)
  | "variance.approve" //   approve or decline a variance request (Manager, Deputy)

  // ── Management actions ────────────────────────────────
  | "manage.view"
  | "approvals.review"
  | "permissions.grant"
  | "rota.publish"
  | "rota.config.edit" //   configure rota pattern and shift blocks (Admin, Manager, Deputy)
  | "teams.edit" //         create and configure teams (Admin, Manager, Deputy)

  // ── Audit scope ───────────────────────────────────────
  | "audit.view" //         Audit page scoped to own home (Manager, Deputy)
  | "audit.view.all" //     every event across the home's teams (RI/System Admin: across all homes)
  | "audit.export"

  // ── System / master-data (Admin only) ─────────────────
  /**
   * These permissions are exclusively held by the system Admin role.
   * Admin configures the structure (company, homes, senior staff accounts,
   * work patterns) that the operational roles then work within.
   * Admin does NOT hold any operational permissions (no variance.submit,
   * no residents.comments.write, no timesheets.view.all, etc.).
   */
  | "system.company.edit" //        edit Company master data
  | "system.home.edit" //           register / edit Home records
  | "system.workpatterns.edit" //   manage Work Pattern definitions
  | "system.staff.createSenior" //  create Registered Manager and Deputy Manager accounts
