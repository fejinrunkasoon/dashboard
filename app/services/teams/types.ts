import type { EntityStatus, ProductOwnership } from '../../domain/common'
import type {
  AccountDemandStatus,
  DemandPriority
} from '../../domain/demand'
import type { Member, Team } from '../../domain/organization'
import type { NamedRef } from '../../domain/account'

export interface TeamListQuery {
  keyword?: string
  status?: EntityStatus
  idle?: 'yes' | 'no'
  unfulfilled?: 'yes' | 'no'
  banned?: 'yes' | 'no'
  /** low < 60, mid 60–80, high >= 80 */
  usage?: 'low' | 'mid' | 'high'
}

export interface TeamMetrics {
  memberCount: number
  accounts: number
  inUse: number
  idle: number
  usageRate: number
  todaySpend: number
  spend7d: number
  spend30d: number
  /** 7D spend on INTERNAL products */
  internalSpend7d: number
  /** 7D spend on EXTERNAL products */
  externalSpend7d: number
  bannedCount: number
  banRate: number
  unfulfilledDemand: number
}

export interface TeamListItem {
  id: string
  code: string
  name: string
  status: EntityStatus
  leader: NamedRef | null
  memberCount: number
  accounts: number
  inUse: number
  idle: number
  usageRate: number
  todaySpend: number
  spend7d: number
  internalSpend7d: number
  externalSpend7d: number
  banRate: number
  unfulfilledDemand: number
}

export interface TeamMemberListItem {
  id: string
  code: string
  name: string
  status: EntityStatus
  accounts: number
  inUse: number
  idle: number
  usageRate: number
  todaySpend: number
  spend7d: number
  spend30d: number
}

export interface TeamProductPerformanceItem {
  productId: string
  productName: string
  ownershipType: ProductOwnership
  accountCount: number
  spend7d: number
  spend30d: number
}

export interface TeamDemandListItem {
  id: string
  demandNo: string
  status: AccountDemandStatus
  priority: DemandPriority
  expectedDate?: string | null
  reason?: string | null
  requestedQuantity: number
  allocatedQuantity: number
  unfulfilledQuantity: number
  createdAt: string
  updatedAt: string
}

export interface TeamDetailBundle {
  team: Team
  leader: NamedRef | null
  metrics: TeamMetrics
  recentDemands: TeamDemandListItem[]
}

/**
 * Team Center metrics (Phase 5 / plan §27):
 * - Scope = current AccountAssignment (endedAt == null) for the team
 * - Usage Rate = InUse / Accounts
 * - Ban Rate = BANNED / Accounts among current assignments
 * - Unfulfilled Demand = Σ max(0, requested − allocated) for open demands
 * - Idle here = team-held IDLE accounts; pool eligibility stays in isInAccountPool only
 */
export interface TeamService {
  getTeams(): Promise<Team[]>
  getTeamById(id: string): Promise<Team | null>
  getMembers(teamId?: string): Promise<Member[]>
  getMemberById(id: string): Promise<Member | null>
  getTeamList(query?: TeamListQuery): Promise<TeamListItem[]>
  getTeamDetail(id: string): Promise<TeamDetailBundle | null>
  getTeamMembersWithMetrics(teamId: string): Promise<TeamMemberListItem[]>
  getTeamProductPerformance(teamId: string): Promise<TeamProductPerformanceItem[]>
  getTeamDemands(teamId: string): Promise<TeamDemandListItem[]>
}
