/**
 * Page-level UI constants for the Manage hub. The `OverrideDraft` /
 * `ApprovalItem` / `SwapActivity` / `PermissionRow` types and the
 * `MANAGE_*` seed rows live in `src/services/manage/manage.mock.ts` —
 * the services tree owns all domain data. This file is kept only for
 * labels specific to the Manage / Team / Me pages.
 *
 * Datetime display helpers (`formatLocalDateTime`, `formatLocalRange`)
 * used to live here too; they have been lifted into the shared
 * `src/lib/format.ts` module so non-Manage callers (MyDashboard,
 * TeamOverview) don't have to reach into a Manage page file for what
 * is actually generic display utility code.
 */
import type {
  OverrideDraft,
  PermissionRow,
  SwapActivity,
} from "../../services/manage/manage.types"

export const REASON_LABEL: Record<OverrideDraft["reason"], string> = {
  sickness: "Sickness",
  no_show: "No-show",
  holiday: "Holiday cover",
  training: "Training",
}

export const ACCESS_LEVEL_LABEL: Record<PermissionRow["accessLevel"], string> = {
  rsw: "RSW",
  team_lead: "Team Leader",
  deputy_manager: "Deputy Manager",
  registered_manager: "Registered Manager",
}

export const SWAP_STATUS_LABEL: Record<SwapActivity["status"], string> = {
  awaiting_teammate: "Awaiting teammate",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
}
