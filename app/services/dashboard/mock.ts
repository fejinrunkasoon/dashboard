import {
  accounts,
  accountAssignments,
  accountProductAssignments,
  accountSpendDaily,
  mediaPlatforms,
  products
} from '../../mocks'
import { MOCK_TODAY, shiftDate } from '../../utils/spend-aggregation'
import { accountService } from '../accounts/mock'
import { alertService } from '../alerts/mock'
import { channelService } from '../channels/mock'
import { teamService } from '../teams/mock'
import type {
  DashboardOverviewBundle,
  DashboardOverviewInput,
  DashboardService,
  DashboardSpendTrendPoint
} from './types'

function clampTrendDays(days?: number): number {
  const n = days ?? 30
  return Math.max(7, Math.min(30, Math.round(n)))
}

function currentProductId(accountId: string): string | null {
  const row = accountProductAssignments.find(
    item => item.accountId === accountId && item.endedAt == null
  )
  return row?.productId ?? null
}

function currentTeamId(accountId: string): string | null {
  const row = accountAssignments.find(
    item => item.accountId === accountId && item.endedAt == null
  )
  return row?.teamId ?? null
}

export const dashboardService: DashboardService = {
  async getOverview(input: DashboardOverviewInput = {}): Promise<DashboardOverviewBundle> {
    const trendDays = clampTrendDays(input.trendDays)
    const from = shiftDate(MOCK_TODAY, -(trendDays - 1))

    const [stats, openAlerts, alertPage, channelList, teamList] = await Promise.all([
      accountService.getAccountStats({}),
      alertService.getOpenCount(),
      alertService.getAlerts({
        statuses: ['OPEN', 'IN_PROGRESS'],
        page: 1,
        pageSize: 5
      }),
      channelService.getChannelList(),
      teamService.getTeamList()
    ])

    const usageRate = stats.total === 0 ? 0 : stats.inUse / stats.total

    const ownershipByAccount = new Map<string, 'INTERNAL' | 'EXTERNAL'>()
    for (const account of accounts) {
      const productId = currentProductId(account.id)
      const product = productId ? products.find(item => item.id === productId) : null
      if (product?.ownershipType === 'INTERNAL' || product?.ownershipType === 'EXTERNAL') {
        ownershipByAccount.set(account.id, product.ownershipType)
      }
    }

    const channelIdByAccount = Object.fromEntries(
      accounts.map(item => [item.id, item.sourceChannelId])
    )
    const teamIdByAccount = new Map<string, string>()
    for (const account of accounts) {
      const teamId = currentTeamId(account.id)
      if (teamId) teamIdByAccount.set(account.id, teamId)
    }

    let internalSpend = 0
    let externalSpend = 0
    let periodSpend = 0
    const channelSpend = new Map<string, number>()
    const teamSpend = new Map<string, number>()

    const mediaNameById = Object.fromEntries(
      mediaPlatforms.map(item => [item.id, item.name])
    )
    const accountMediaById = Object.fromEntries(
      accounts.map(item => [item.id, item.mediaId])
    )

    const trendMap = new Map<string, DashboardSpendTrendPoint>()
    for (const row of accountSpendDaily) {
      if (row.date < from || row.date > MOCK_TODAY) continue

      periodSpend += row.spend

      const ownership = ownershipByAccount.get(row.accountId)
      if (ownership === 'INTERNAL') internalSpend += row.spend
      else if (ownership === 'EXTERNAL') externalSpend += row.spend

      const channelId = channelIdByAccount[row.accountId]
      if (channelId) {
        channelSpend.set(channelId, (channelSpend.get(channelId) ?? 0) + row.spend)
      }

      const teamId = teamIdByAccount.get(row.accountId)
      if (teamId) {
        teamSpend.set(teamId, (teamSpend.get(teamId) ?? 0) + row.spend)
      }

      const mediaId = accountMediaById[row.accountId]
      if (!mediaId) continue
      const key = `${row.date}::${mediaId}`
      const existing = trendMap.get(key)
      if (existing) {
        existing.spend += row.spend
      } else {
        trendMap.set(key, {
          date: row.date,
          mediaId,
          mediaName: mediaNameById[mediaId] ?? mediaId,
          spend: row.spend
        })
      }
    }

    const spendTrend = [...trendMap.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.mediaName.localeCompare(b.mediaName)
    )

    const channels = [...channelList]
      .map(item => ({
        id: item.id,
        name: item.name,
        currentValid: item.currentValid,
        inUse: item.inUse,
        spend: channelSpend.get(item.id) ?? 0,
        abnormal: item.abnormal
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)

    const teams = [...teamList]
      .map(item => ({
        id: item.id,
        name: item.name,
        accounts: item.accounts,
        usageRate: item.usageRate,
        spend: teamSpend.get(item.id) ?? 0,
        banRate: item.banRate
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)

    return {
      rangeDays: trendDays,
      kpis: {
        accountCount: stats.total,
        inUse: stats.inUse,
        usageRate,
        periodSpend,
        bannedCount: stats.mediaBanned,
        openAlerts
      },
      spendTrend,
      ownershipSpend: {
        internalSpend,
        externalSpend
      },
      accountStructure: {
        available: stats.available,
        assigned: stats.assigned,
        inUse: stats.inUse,
        idle: stats.idle,
        disabled: stats.disabled,
        archived: stats.archived,
        mediaBanned: stats.mediaBanned
      },
      channels,
      teams,
      alerts: alertPage.data
    }
  }
}
