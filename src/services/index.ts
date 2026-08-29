/**
 * Service barrel. Pages should import their data clients from here, not
 * from `*.mock.ts`. Each export is a namespace so call sites read like
 * `meService.getSnapshot()` / `manageService.listOverrides()`, matching
 * the file-per-microservice layout under `src/services/`.
 *
 * Boundary rule: only `src/services/gateway/gatewayClient.ts` is allowed
 * to import axios. Service files only see `mockResponse` (mock phase) or
 * the gateway request helpers (integration phase).
 */
export * as identityService from "./identity/identityService"
export * as meService from "./me/meService"
export * as calendarService from "./calendar/calendarService"
export * as teamService from "./team/teamService"
export * as homeService from "./home/homeService"
export * as clientsService from "./clients/clientsService"
export * as residentsService from "./residents/residentsService"
export * as manageService from "./manage/manageService"
export * as commonFilesService from "./commonFiles/commonFilesService"
export * as swapService from "./swap/swapService"
export * as auditService from "./audit/auditService"
export * as dashboardService from "./dashboard/dashboardService"
export * as rotaService from "./rota/rotaService"
export * as adminService from "./admin/adminService"

export type { ApiError, ServiceCallOptions } from "./gateway/gatewayClient"
