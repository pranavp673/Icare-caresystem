/**
 * ClientsSvc types. The service aggregates per-client detail across
 * HomeSvc (who lives where) and CareSvc (placement plan, safeguarding,
 * incidents, notes) so the UI doesn't have to fan out on every render.
 *
 * The public types are re-exported from the mock so pages can depend on
 * the service barrel alone and never touch the mock file directly.
 */
import type {
  ClientComment,
  ClientProfile,
  ClientStatus,
  ServiceEvent,
  ServiceEventKind,
} from "./clients.mock"

export type ListClientsQuery = {
  /** Restrict to clients living at any of these home names. */
  homes?: string[]
  /** Status chip filter. Undefined = all statuses. */
  status?: ClientStatus
  /** Free-text search across name / code / keyworker. */
  q?: string
  /** Show only clients where the caller is primary or assigned owner. */
  ownerId?: string
}

export type CreateClientCommentRequest = {
  clientId: string
  body: string
  /** When replying to an existing comment. */
  parentId?: string
}

export type RequestClientAccessPayload = {
  clientId: string
  reason: string
}

export type { ClientComment, ClientProfile, ClientStatus, ServiceEvent, ServiceEventKind }
