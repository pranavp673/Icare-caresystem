/**
 * SupervisionSvc types — request/response DTOs. See supervision.mock.ts
 * for the domain type and seed data.
 */

export type CreateSupervisionRequest = {
  supervisorId: string
  superviseeId: string
  homeId: string
  date: string
  notes: string
}

export type { SupervisionRecord } from "./supervision.mock"
