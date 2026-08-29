/*
 * Sidebar navigation config (v5 — role-gated).
 *
 * Each NavItem now carries an optional `requiredPerms` list. AppShell
 * filters NAV_GROUPS at render time using `can()` from AuthContext so
 * each role sees only the items they are permitted to access.
 *
 * Gate rule: user must hold AT LEAST ONE of the listed permissions.
 * Omitting `requiredPerms` (or an empty array) keeps the item visible
 * to every authenticated user.
 *
 * Role → what they see:
 *   System Admin        → full access, including Admin group (system setup pages)
 *   RI                  → everything except Admin group, view-only (no approve/edit actions)
 *   Registered Manager  → everything except Admin group
 *   Deputy Manager       → same as Registered Manager
 *   Team Leader          → Dashboard, Team, Calendar, Rota, Residents (read), Manage
 *   RSW                  → Dashboard, Team (own), Calendar, Residents (read)
 */

import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Users,
  UserCircle,
  SlidersHorizontal,
  Calendar,
  RefreshCw,
  ScrollText,
  Settings2,
  UserCog,
} from "lucide-react"
import type { Permission } from "../auth/roles"

export type NavItem = {
  id: string
  to: string
  label: string
  icon: LucideIcon
  matchPrefix?: string
  hint?: string
  /**
   * The user must hold AT LEAST ONE of these permissions for this item to
   * appear in the sidebar. Omit for items visible to all authenticated users.
   */
  requiredPerms?: Permission[]
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "analytics",
    label: "Analytics",
    items: [
      {
        id: "me",
        to: "/me",
        label: "Dashboard",
        icon: LayoutDashboard,
        hint: "Your hours, leaves, and open requests",
        requiredPerms: ["me.view"],
      },
      {
        id: "metrics",
        to: "/metrics",
        label: "Metrics",
        icon: TrendingUp,
        hint: "KPIs, daily snapshots, and trends",
        requiredPerms: ["home.analytics.view"],
      },
    ],
  },
  {
    id: "care",
    label: "Care",
    items: [
      {
        id: "homes",
        to: "/homes",
        label: "Homes",
        icon: Building2,
        matchPrefix: "/homes",
        hint: "Care homes you oversee",
        requiredPerms: ["home.view"],
      },
      {
        id: "team",
        to: "/team",
        label: "Team",
        icon: Users,
        matchPrefix: "/team",
        hint: "Your teammates and their schedules",
        requiredPerms: ["team.view"],
      },
      {
        id: "residents",
        to: "/residents",
        label: "Residents",
        icon: UserCircle,
        matchPrefix: "/residents",
        hint: "Per-resident profile, care history, and notes",
        requiredPerms: ["residents.view"],
      },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    items: [
      {
        id: "calendar",
        to: "/calendar",
        label: "Calendar",
        icon: Calendar,
        hint: "Shifts, swaps, and leaves at a glance",
        requiredPerms: ["me.view"],
      },
      {
        id: "rota",
        to: "/rota",
        label: "Rota",
        icon: RefreshCw,
        matchPrefix: "/rota",
        hint: "Weekly team coverage and shift schedules",
        // Team Leaders and above — care workers use Calendar for their own schedule
        requiredPerms: ["team.analytics.view"],
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    items: [
      {
        id: "manage",
        to: "/manage",
        label: "Manage",
        icon: SlidersHorizontal,
        matchPrefix: "/manage",
        hint: "Leaves, swaps, overtime, and permissions",
        requiredPerms: ["manage.view"],
      },
    ],
  },
  {
    id: "audit",
    label: "Audit",
    items: [
      {
        id: "audit",
        to: "/audit",
        label: "Audit Log",
        icon: ScrollText,
        matchPrefix: "/audit",
        hint: "Every significant event, append-only",
        // Manager and Deputy only — per confirmed matrix
        requiredPerms: ["audit.view"],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      {
        id: "admin-setup",
        to: "/admin/setup",
        label: "System setup",
        icon: Settings2,
        matchPrefix: "/admin/setup",
        hint: "Configure company, homes, teams, and rota pattern",
        requiredPerms: ["system.company.edit"],
      },
      {
        id: "admin-residents",
        to: "/admin/residents",
        label: "Manage residents",
        icon: UserCog,
        matchPrefix: "/admin/residents",
        hint: "Edit resident master data",
        requiredPerms: ["system.home.edit"],
      },
    ],
  },
]

/** Flat list for backward compat (route matching, etc.). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
