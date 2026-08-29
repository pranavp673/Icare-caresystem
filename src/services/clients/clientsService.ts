/**
 * ClientsSvc client. Per-client profile, comments, and service history.
 *
 * Lives at `/api/clients/*` in the real backend; on the backend side it
 * aggregates HomeSvc (resident roster, keyworker) with CareSvc (placement
 * plans, safeguarding, incidents, notes). On the UI side it's a single
 * client so pages don't have to fan out.
 *
 * Scope rules (enforced in the gateway on top of these filters):
 *   • `people.view`      — full access to every client in the caller's home scope.
 *   • `team.view.all`    — read-only access to the same list (leads on the
 *                          same home can see the roster + service history
 *                          but not edit the profile).
 *   • Anything else      — no access; the page gate blocks before this
 *                          service is reached.
 *
 * The comments stream is intentionally append-only; there is no edit or
 * delete method. Auditable history lives in AuditSvc — comments here are
 * quick ops notes, not evidence-grade artefacts.
 */
import { mockResponse } from "../gateway/gatewayClient"
import {
  CLIENTS,
  CLIENT_COMMENTS,
  CLIENT_SERVICE_HISTORY,
} from "./clients.mock"
import type {
  ClientComment,
  ClientProfile,
  CreateClientCommentRequest,
  ListClientsQuery,
  RequestClientAccessPayload,
  ServiceEvent,
} from "./clients.types"

/** Parse "2026-04-11 14:32" → epoch for chronological sorting. */
const toEpoch = (at: string) => new Date(at.replace(" ", "T")).getTime()

export const listClients = (
  query: ListClientsQuery = {}
): Promise<ClientProfile[]> => {
  // TODO(integration): GET /api/clients?homes=&status=&q=
  let list: ClientProfile[] = CLIENTS
  if (query.homes && query.homes.length > 0) {
    const set = new Set(query.homes)
    list = list.filter((c) => set.has(c.home))
  }
  if (query.status) list = list.filter((c) => c.status === query.status)
  if (query.ownerId) {
    list = list.filter(
      (c) => c.primaryOwnerId === query.ownerId || c.assignedOwnerId === query.ownerId
    )
  }
  if (query.q) {
    const needle = query.q.toLowerCase()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.code.toLowerCase().includes(needle) ||
        c.keyworker.toLowerCase().includes(needle)
    )
  }
  return mockResponse(list)
}

export const getClient = (id: string): Promise<ClientProfile | null> => {
  // TODO(integration): GET /api/clients/${id}
  return mockResponse(CLIENTS.find((c) => c.id === id) ?? null)
}

export const listClientComments = (
  clientId: string
): Promise<ClientComment[]> => {
  // TODO(integration): GET /api/clients/${clientId}/comments
  const rows = CLIENT_COMMENTS.filter((c) => c.clientId === clientId).sort(
    (a, b) => toEpoch(b.at) - toEpoch(a.at)
  )
  return mockResponse(rows)
}

export const addClientComment = (
  req: CreateClientCommentRequest
): Promise<ClientComment> => {
  // TODO(integration): POST /api/clients/${clientId}/comments body=CreateClientCommentRequest
  //   Gateway forces authorId / author / authorRole from the signed-in
  //   claims — the body is just `{ body, parentId? }`. We stamp a
  //   placeholder here so the list can render optimistically during the
  //   mock phase.
  const stamp = new Date()
  const iso = `${stamp.toISOString().slice(0, 10)} ${stamp
    .toTimeString()
    .slice(0, 5)}`
  const created: ClientComment = {
    id: `cc-${Date.now()}`,
    clientId: req.clientId,
    authorId: "u-me",
    author: "You",
    authorRole: "—",
    at: iso,
    body: req.body,
    parentId: req.parentId ?? null,
  }
  return mockResponse(created)
}

export const requestClientAccess = (
  req: RequestClientAccessPayload
): Promise<{ status: "sent" }> => {
  // TODO(integration): POST /api/clients/${clientId}/access-request body={ reason }
  void req
  return mockResponse({ status: "sent" as const })
}

export const listClientHistory = (
  clientId: string
): Promise<ServiceEvent[]> => {
  // TODO(integration): GET /api/clients/${clientId}/history
  const rows = CLIENT_SERVICE_HISTORY.filter((s) => s.clientId === clientId)
    .slice()
    .sort((a, b) => toEpoch(b.at) - toEpoch(a.at))
  return mockResponse(rows)
}
