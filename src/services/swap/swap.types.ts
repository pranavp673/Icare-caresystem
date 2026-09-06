/**
 * SwapSvc types. The requester offers a shift to a counterparty; the
 * counterparty accepts or declines. Once accepted, a two-step manager
 * approval follows (FR-TS-05: Team Leader, then Registered Manager)
 * before the swap is final — that step lives in `manageService.approveSwap`,
 * surfaced in Time Sheet's Swaps tab, not here.
 */
import type { SwapActivity } from "../manage/manage.mock"
import type { MyRequest } from "../me/me.mock"

export type CreateSwapRequest = {
  /** ISO local datetime of the original shift the requester wants to give up. */
  fromStart: string
  /** ISO local datetime of the replacement shift being offered in return. */
  toStart: string
  /** Counterparty teammate id (the person being asked). */
  counterpartyId: string
  /** Free-text note attached to the swap request. */
  note?: string
}

export type SwapsFilter = "open" | "all"

export type { SwapActivity, MyRequest }
