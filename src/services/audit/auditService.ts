/**
 * AuditSvc client. Mostly a read-only audit event stream + evidence-pack
 * export — every write action across the platform funnels into AuditSvc
 * on the real backend, so most callers only ever read. `recordEvent` is
 * the mock-phase stand-in for that funnel (see its own doc comment).
 */
import { mockResponse } from "../gateway/gatewayClient"
import { AUDIT_EVENTS } from "./audit.mock"
import type {
  AuditEvent,
  ExportJob,
  ExportRequest,
  ListAuditEventsQuery,
  PaginatedAuditEvents,
  RecordAuditEventRequest,
} from "./audit.types"

export const listEvents = (
  query: ListAuditEventsQuery = {}
): Promise<PaginatedAuditEvents> => {
  // TODO(integration): GET /api/audit/events?domain=&channel=&severity=&actorIds=&home=&from=&to=&q=&page=&pageSize=
  //   The backend enforces scope via the caller's JWT claims:
  //     • Base `audit.view` → actorIds forced to the caller's same-team
  //       member list; system actors (actorId === null) are excluded.
  //     • `audit.view.all` → actorIds omitted; full home scope returned.
  //   Pagination is handled server-side; the mock replicates it below.
  let list = AUDIT_EVENTS
  if (query.domain) list = list.filter((e) => e.domain === query.domain)
  if (query.channel) list = list.filter((e) => e.channel === query.channel)
  if (query.severity) list = list.filter((e) => e.severity === query.severity)
  if (query.actorIds && query.actorIds.length > 0) {
    const allowed = new Set(query.actorIds)
    list = list.filter((e) => e.actorId !== null && allowed.has(e.actorId))
  }
  if (query.homes && query.homes.length > 0) {
    const homes = query.homes
    list = list.filter((e) => !e.home || homes.includes(e.home))
  }
  if (query.q) {
    const needle = query.q.toLowerCase()
    list = list.filter(
      (e) =>
        e.actor.toLowerCase().includes(needle) ||
        e.action.toLowerCase().includes(needle) ||
        e.target.toLowerCase().includes(needle)
    )
  }
  const total = list.length
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize)
  return mockResponse<PaginatedAuditEvents>({ items, total, page, pageSize })
}

export const exportEvidencePack = (
  req: ExportRequest = {}
): Promise<ExportJob> => {
  // TODO(integration): POST /api/audit/export body=ExportRequest
  void req
  return mockResponse<ExportJob>({
    jobId: `exp-${Date.now()}`,
    status: "queued",
  })
}

export const getExportStatus = (jobId: string): Promise<ExportJob> => {
  // TODO(integration): GET /api/audit/export/${jobId}
  return mockResponse<ExportJob>({
    jobId,
    status: "ready",
    downloadUrl: `https://example.invalid/audit/${jobId}.zip`,
  })
}

/**
 * Record an audit event. On the real backend this never gets called
 * directly — every service writes to AuditSvc as a side effect of its
 * own action, funnelled server-side. In the mock, callers (e.g.
 * `residentsService`) call this explicitly, and — unlike other
 * services' create functions, which just return a new object for the
 * caller's own local state — this one also pushes into the shared
 * `AUDIT_EVENTS` array directly, so the event is visible next time
 * anyone (not just the caller) fetches the Audit Log.
 */
export const recordEvent = (req: RecordAuditEventRequest): Promise<AuditEvent> => {
  // TODO(integration): this call disappears entirely — real writes emit
  //   audit events server-side, the UI never calls AuditSvc to record one.
  const event: AuditEvent = {
    id: `e-${Date.now()}`,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    severity: "info",
    ...req,
  }
  AUDIT_EVENTS.unshift(event)
  return mockResponse(event)
}
