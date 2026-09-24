import type { EntityStatus } from './common'

/** Tenant boundary — all core business data belongs to an Organization. */
export interface Organization {
  id: string
  code: string
  name: string
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export type AppRole =
  | 'ORG_ADMIN'
  | 'TEAM_MANAGER'
  | 'TEAM_MEMBER'
  | 'PLATFORM_ADMIN'

/**
 * Application user — maps to Member for team affiliation.
 * Distinct from Provider OAuth identity.
 */
export interface AppUser {
  id: string
  memberId: string
  organizationId: string
  displayName: string
  roles: AppRole[]
  status: EntityStatus
}
