/**
 * SwapSvc client. The signed-in user creates a swap request, the
 * counterparty accepts or declines. Accepting starts the FR-TS-05
 * manager-approval chain (`manageService.approveSwap`) rather than
 * finishing the swap outright — see `acceptSwap` below.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { MY_REQUESTS } from "../me/me.mock"
import { MANAGE_SWAPS } from "../manage/manage.mock"
import type {
  CreateSwapRequest,
  MyRequest,
  SwapActivity,
  SwapsFilter,
} from "./swap.types"

export const createSwap = (req: CreateSwapRequest): Promise<MyRequest> => {
  // TODO(integration): POST /api/swaps body=CreateSwapRequest
  const created: MyRequest = {
    id: `r-${Date.now()}`,
    kind: "swap",
    summary: req.note
      ? `Swap ${req.fromStart} → ${req.toStart} — ${req.note}`
      : `Swap ${req.fromStart} → ${req.toStart}`,
    when: "Sent just now",
    status: "awaiting_teammate",
    teammate: req.counterpartyId,
  }
  return mockResponse(created)
}

export const listMySwaps = (
  status: SwapsFilter = "open"
): Promise<MyRequest[]> => {
  // TODO(integration): GET /api/swaps/mine?status=${status}
  const mine = MY_REQUESTS.filter((r) => r.kind === "swap")
  const data =
    status === "all"
      ? mine
      : mine.filter((r) => r.status === "awaiting_teammate")
  return mockResponse(data)
}

export const acceptSwap = (id: string): Promise<SwapActivity> => {
  // TODO(integration): POST /api/swaps/${id}/accept
  //   SwapSvc verifies the caller is the counterparty before updating.
  const swap = MANAGE_SWAPS.find((s) => s.id === id)
  if (!swap) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Swap not found" })
  }
  // Accepting kicks off the FR-TS-05 manager-approval chain, not the end
  // of the process — see manageService.approveSwap for the two steps.
  swap.status = "pending_team_leader"
  swap.when = "Accepted just now"
  return mockResponse({ ...swap })
}

export const declineSwap = (id: string): Promise<SwapActivity> => {
  // TODO(integration): POST /api/swaps/${id}/decline
  //   SwapSvc verifies the caller is the counterparty before updating.
  const swap = MANAGE_SWAPS.find((s) => s.id === id)
  if (!swap) {
    return Promise.reject({ status: 404, code: "NOT_FOUND", message: "Swap not found" })
  }
  swap.status = "declined"
  swap.when = "Declined just now"
  return mockResponse({ ...swap })
}

export const cancelSwap = (id: string): Promise<void> => {
  // TODO(integration): DELETE /api/swaps/${id}
  //   SwapSvc verifies the caller is the original requester before deleting.
  void id
  return mockResponse<void>(undefined)
}
