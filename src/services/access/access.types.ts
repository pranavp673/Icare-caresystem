/**
 * AccessSvc types — request DTOs. See access.mock.ts for the domain
 * type and seed data.
 */

export type RevokeGrantRequest = {
  revokedBy: string
  revokedReason: string
}

export type { HomeAccessGrant, AccessGrantStatus } from "./access.mock"
