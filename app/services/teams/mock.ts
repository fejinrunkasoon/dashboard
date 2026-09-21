import type { NamedRef } from '../../domain/account'
import type { AccountDemandStatus } from '../../domain/demand'
import {
  accountAssignments,
  accountProductAssignments,
  accounts,
  demandAllocations,
  demandItems,
  demands,
  members,
  products,
  teams
} from '../../mocks'
import { accountSpendDaily } from '../../mocks/spend-daily'
import { aggregateSpendMetrics } from '../../utils/spend-aggregation'
import type {
  TeamDemandListItem,
  TeamDetailBundle,
  TeamListItem,
  TeamListQuery,
  TeamMemberListItem,
  TeamMetrics,
  TeamProductPerformanceItem,
  TeamService
} from './types'

const OPEN_DEMAND_STATUSES: AccountDemandStatus[] = [
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_ALLOCATED'
]

function named(id: string, code: string | undefined, name: string): NamedRef {
  return { id, code, name }
}

function currentAssignmentsForTeam(teamId: string) {
  return accountAssignments.filter(item => item.teamId === teamId && item.endedAt == null)
}

function currentProductId(accountId: string): string | null {
  const row = accountProductAssignments.find(
    item => item.accountId === accountId && item.endedAt == null
  )
  return row?.productId ?? null
}

function usageRate(inUse: number, accounts: number): number {
  if (accounts === 0) return 0
  return Math.round((inUse / accounts) * 100)
}

function banRate(bannedCount: number, accounts: number): number {
  if (accounts === 0) return 0
  return Math.round((bannedCount / accounts) * 100)
}

function demandQuantities(demandId: string): {
  requestedQuantity: number
  allocatedQuantity: number
  unfulfilledQuantity: number
} {
  const items = demandItems.filter(item => item.demandId === demandId)
  let requestedQuantity = 0
  let allocatedQuantity = 0
  for (const item of items) {
    requestedQuantity += item.requestedQuantity
    const allocated = demandAllocations.filter(row => row.demandItemId === item.id).length
    allocatedQuantity += allocated
  }
  return {
    requestedQuantity,
    allocatedQuantity,
    unfulfilledQuantity: Math.max(0, requestedQuantity - allocatedQuantity)
  }
}

function unfulfilledForTeam(teamId: string): number {
  return demands
    .filter(item => item.teamId === teamId && OPEN_DEMAND_STATUSES.includes(item.status))
    .reduce((sum, demand) => sum + demandQuantities(demand.id).unfulfilledQuantity, 0)
}

function buildDemandListItem(demandId: string): TeamDemandListItem | null {
  const demand = demands.find(item => item.id === demandId)
  if (!demand) return null
  const qty = demandQuantities(demand.id)
  return {
    id: demand.id,
    demandNo: demand.demandNo,
    status: demand.status,
    priority: demand.priority,
    expectedDate: demand.expectedDate ?? null,
    reason: demand.reason ?? null,
    requestedQuantity: qty.requestedQuantity,
    allocatedQuantity: qty.allocatedQuantity,
    unfulfilledQuantity: qty.unfulfilledQuantity,
    createdAt: demand.createdAt,
    updatedAt: demand.updatedAt
  }
}

function metricsForAccountIds(accountIds: string[], memberCount: number, teamId: string): TeamMetrics {
  let inUse = 0
  let idle = 0
  let bannedCount = 0
  let todaySpend = 0
  let spend7d = 0
  let spend30d = 0
  let internalSpend7d = 0
  let externalSpend7d = 0

  for (const accountId of accountIds) {
    const account = accounts.find(item => item.id === accountId)
    if (!account) continue

    if (account.assetStatus === 'IN_USE') inUse += 1
    if (account.assetStatus === 'IDLE') idle += 1
    if (account.mediaStatus === 'BANNED') bannedCount += 1

    const spendRows = accountSpendDaily.filter(row => row.accountId === accountId)
    const metrics = aggregateSpendMetrics(accountId, account.spendLimit, spendRows)
    todaySpend += metrics.todaySpend
    spend7d += metrics.spend7d
    spend30d += metrics.spend30d

    const productId = currentProductId(accountId)
    const product = productId ? products.find(item => item.id === productId) : null
    if (product?.ownershipType === 'INTERNAL') internalSpend7d += metrics.spend7d
    if (product?.ownershipType === 'EXTERNAL') externalSpend7d += metrics.spend7d
  }

  const accountsCount = accountIds.length
  return {
    memberCount,
    accounts: accountsCount,
    inUse,
    idle,
    usageRate: usageRate(inUse, accountsCount),
    todaySpend,
    spend7d,
    spend30d,
    internalSpend7d,
    externalSpend7d,
    bannedCount,
    banRate: banRate(bannedCount, accountsCount),
    unfulfilledDemand: unfulfilledForTeam(teamId)
  }
}

function leaderForTeam(teamId: string): NamedRef | null {
  const team = teams.find(item => item.id === teamId)
  if (!team?.leaderMemberId) return null
  const leader = members.find(item => item.id === team.leaderMemberId)
  if (!leader) return null
  return named(leader.id, leader.code, leader.name)
}

function buildListItem(teamId: string): TeamListItem | null {
  const team = teams.find(item => item.id === teamId)
  if (!team) return null

  const teamMembers = members.filter(item => item.teamId === team.id)
  const assignments = currentAssignmentsForTeam(team.id)
  const accountIds = assignments.map(item => item.accountId)
  const metrics = metricsForAccountIds(accountIds, teamMembers.length, team.id)

  return {
    id: team.id,
    code: team.code,
    name: team.name,
    status: team.status,
    leader: leaderForTeam(team.id),
    memberCount: metrics.memberCount,
    accounts: metrics.accounts,
    inUse: metrics.inUse,
    idle: metrics.idle,
    usageRate: metrics.usageRate,
    todaySpend: metrics.todaySpend,
    spend7d: metrics.spend7d,
    internalSpend7d: metrics.internalSpend7d,
    externalSpend7d: metrics.externalSpend7d,
    banRate: metrics.banRate,
    unfulfilledDemand: metrics.unfulfilledDemand
  }
}

function buildDetail(teamId: string): TeamDetailBundle | null {
  const team = teams.find(item => item.id === teamId)
  if (!team) return null

  const teamMembers = members.filter(item => item.teamId === team.id)
  const assignments = currentAssignmentsForTeam(team.id)
  const accountIds = assignments.map(item => item.accountId)
  const metrics = metricsForAccountIds(accountIds, teamMembers.length, team.id)

  const recentDemands = demands
    .filter(item => item.teamId === team.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(item => buildDemandListItem(item.id))
    .filter((item): item is TeamDemandListItem => item != null)
    .slice(0, 5)

  return {
    team,
    leader: leaderForTeam(team.id),
    metrics,
    recentDemands
  }
}

export const teamService: TeamService = {
  async getTeams() {
    return [...teams]
  },

  async getTeamById(id) {
    return teams.find(item => item.id === id) ?? null
  },

  async getMembers(teamId) {
    if (!teamId) return [...members]
    return members.filter(item => item.teamId === teamId)
  },

  async getMemberById(id) {
    return members.find(item => item.id === id) ?? null
  },

  async getTeamList(query: TeamListQuery = {}) {
    let rows = teams
      .map(item => buildListItem(item.id))
      .filter((item): item is TeamListItem => item != null)

    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      rows = rows.filter(item =>
        item.name.toLowerCase().includes(q)
        || item.code.toLowerCase().includes(q)
        || (item.leader?.name ?? '').toLowerCase().includes(q)
      )
    }
    if (query.status) {
      rows = rows.filter(item => item.status === query.status)
    }
    if (query.idle === 'yes') rows = rows.filter(item => item.idle > 0)
    if (query.idle === 'no') rows = rows.filter(item => item.idle === 0)
    if (query.unfulfilled === 'yes') rows = rows.filter(item => item.unfulfilledDemand > 0)
    if (query.unfulfilled === 'no') rows = rows.filter(item => item.unfulfilledDemand === 0)
    if (query.banned === 'yes') rows = rows.filter(item => item.banRate > 0)
    if (query.banned === 'no') rows = rows.filter(item => item.banRate <= 0)
    if (query.usage === 'low') rows = rows.filter(item => item.usageRate < 60)
    if (query.usage === 'mid') {
      rows = rows.filter(item => item.usageRate >= 60 && item.usageRate < 80)
    }
    if (query.usage === 'high') rows = rows.filter(item => item.usageRate >= 80)

    return rows
  },

  async getTeamDetail(id) {
    return buildDetail(id)
  },

  async getTeamMembersWithMetrics(teamId) {
    const teamMemberRows = members.filter(item => item.teamId === teamId)
    const assignments = currentAssignmentsForTeam(teamId)

    return teamMemberRows.map((member) => {
      const memberAccountIds = assignments
        .filter(item => item.memberId === member.id)
        .map(item => item.accountId)

      let inUse = 0
      let idle = 0
      let todaySpend = 0
      let spend7d = 0
      let spend30d = 0

      for (const accountId of memberAccountIds) {
        const account = accounts.find(item => item.id === accountId)
        if (!account) continue
        if (account.assetStatus === 'IN_USE') inUse += 1
        if (account.assetStatus === 'IDLE') idle += 1
        const spendRows = accountSpendDaily.filter(row => row.accountId === accountId)
        const metrics = aggregateSpendMetrics(accountId, account.spendLimit, spendRows)
        todaySpend += metrics.todaySpend
        spend7d += metrics.spend7d
        spend30d += metrics.spend30d
      }

      const accountsCount = memberAccountIds.length
      return {
        id: member.id,
        code: member.code,
        name: member.name,
        status: member.status,
        accounts: accountsCount,
        inUse,
        idle,
        usageRate: usageRate(inUse, accountsCount),
        todaySpend,
        spend7d,
        spend30d
      } satisfies TeamMemberListItem
    })
  },

  async getTeamProductPerformance(teamId) {
    const assignments = currentAssignmentsForTeam(teamId)
    const byProduct = new Map<string, TeamProductPerformanceItem>()

    for (const assignment of assignments) {
      const productId = currentProductId(assignment.accountId)
      if (!productId) continue
      const product = products.find(item => item.id === productId)
      if (!product) continue

      const account = accounts.find(item => item.id === assignment.accountId)
      const spendRows = accountSpendDaily.filter(row => row.accountId === assignment.accountId)
      const metrics = aggregateSpendMetrics(
        assignment.accountId,
        account?.spendLimit,
        spendRows
      )

      const existing = byProduct.get(product.id)
      if (existing) {
        existing.accountCount += 1
        existing.spend7d += metrics.spend7d
        existing.spend30d += metrics.spend30d
      } else {
        byProduct.set(product.id, {
          productId: product.id,
          productName: product.name,
          ownershipType: product.ownershipType,
          accountCount: 1,
          spend7d: metrics.spend7d,
          spend30d: metrics.spend30d
        })
      }
    }

    return [...byProduct.values()].sort((a, b) => b.spend7d - a.spend7d)
  },

  async getTeamDemands(teamId) {
    return demands
      .filter(item => item.teamId === teamId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(item => buildDemandListItem(item.id))
      .filter((item): item is TeamDemandListItem => item != null)
  }
}
