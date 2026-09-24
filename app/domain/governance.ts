/** Governance: which Team manages an account, and which Users can access it. */

export type UserAccountAssignmentType = 'IMPORTED_BY' | 'ASSIGNED'

export type TeamAccountLinkStatus = 'ACTIVE' | 'ENDED'

/**
 * Which Team is responsible for managing this Media Account.
 * Independent of Connection (OAuth channel).
 */
export interface TeamAccountLink {
  id: string
  organizationId: string
  teamId: string
  mediaAccountId: string
  status: TeamAccountLinkStatus
  assignedByUserId?: string | null
  assignedAt: string
  endedAt?: string | null
}

/**
 * User-level account visibility (IMPORTED_BY or manager ASSIGNED).
 * Distinct from operational AccountAssignment (pool allocate workflow).
 */
export interface UserAccountAccess {
  id: string
  organizationId: string
  mediaAccountId: string
  userId: string
  assignmentType: UserAccountAssignmentType
  assignedByUserId?: string | null
  assignedAt: string
  status: 'ACTIVE' | 'ENDED'
  endedAt?: string | null
}
