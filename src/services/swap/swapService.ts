/**
 * SwapSvc client. Peer-to-peer shift swaps. The signed-in user creates a
 * swap request, the counterparty accepts or declines. There is no
 * manager approval path — managers only see the activity feed via
 * `manageService.listSwaps`.
 */
import { mockResponse } from "../gateway/gatewayClient"
import { MY_REQUESTS } from "../me/me.mock"
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
  void id
  return mockResponse<SwapActivity>({
    id,
    requesterId: "",
    requester: { name: "—", initials: "—", role: "—", home: "—" },
    counterpartyId: "",
    counterparty: { name: "You", initials: "YO", home: "—" },
    fromStart: "",
    toStart: "",
    summary: "",
    when: "Just now",
    status: "accepted",
  })
}

export const declineSwap = (id: string): Promise<SwapActivity> => {
  // TODO(integration): POST /api/swaps/${id}/decline
  //   SwapSvc verifies the caller is the counterparty before updating.
  void id
  return mockResponse<SwapActivity>({
    id,
    requesterId: "",
    requester: { name: "—", initials: "—", role: "—", home: "—" },
    counterpartyId: "",
    counterparty: { name: "You", initials: "YO", home: "—" },
    fromStart: "",
    toStart: "",
    summary: "",
    when: "Just now",
    status: "declined",
  })
}

export const cancelSwap = (id: string): Promise<void> => {
  // TODO(integration): DELETE /api/swaps/${id}
  //   SwapSvc verifies the caller is the original requester before deleting.
  void id
  return mockResponse<void>(undefined)
}
