import type { EntityStatus } from './common'

export interface Team {
  id: string
  code: string
  name: string
  organizationId?: string | null
  leaderMemberId?: string | null
  status: EntityStatus
}

export interface Member {
  id: string
  code: string
  name: string
  teamId: string
  status: EntityStatus
}
