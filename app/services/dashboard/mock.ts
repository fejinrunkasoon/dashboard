import { accounts, accountSpendDaily, mediaPlatforms } from '../../mocks'
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

export const dashboardService: DashboardService = {
  async getOverview(input: DashboardOverviewInput = {}): Promise<DashboardOverviewBundle> {
    const trendDays = clampTrendDays(input.trendDays)
    const from = shiftDate(MOCK_TODAY, -(trendDays - 1))

    const [stats, accountPage, openAlerts, alertPage, channelList, teamList] = await Promise.all([
      accountService.getAccountStats({}),
      accountService.getAccounts({ page: 1, pageSize: 500 }),
      alertService.getOpenCount(),
      alertService.getAlerts({
        statuses: ['OPEN', 'IN_PROGRESS'],
        page: 1,
        pageSize: 5
      }),
      channelService.getChannelList(),
      teamService.getTeamList()
    ])

    const items = accountPage.data
    const todaySpend = items.reduce((sum, item) => sum + item.todaySpend, 0)
    const usageRate = stats.total === 0 ? 0 : stats.inUse / stats.total

    let internalSpend = 0
    let externalSpend = 0
    for (const item of items) {
      if (item.product?.ownershipType === 'INTERNAL') {
        internalSpend += item.spend30d
      } else if (item.product?.ownershipType === 'EXTERNAL') {
        externalSpend += item.spend30d
      }
    }

    const mediaNameById = Object.fromEntries(
      mediaPlatforms.map(item => [item.id, item.name])
    )
    const accountMediaById = Object.fromEntries(
      accounts.map(item => [item.id, item.mediaId])
    )

    const trendMap = new Map<string, DashboardSpendTrendPoint>()
    for (const row of accountSpendDaily) {
      if (row.date < from || row.date > MOCK_TODAY) continue
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
      .sort((a, b) => b.spend30d - a.spend30d)
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        name: item.name,
        currentValid: item.currentValid,
        inUse: item.inUse,
        spend30d: item.spend30d,
        abnormal: item.abnormal
      }))

    const teams = [...teamList]
      .sort((a, b) => b.spend7d - a.spend7d)
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        name: item.name,
        accounts: item.accounts,
        usageRate: item.usageRate,
        spend7d: item.spend7d,
        banRate: item.banRate
      }))

    return {
      kpis: {
        accountCount: stats.total,
        inUse: stats.inUse,
        usageRate,
        todaySpend,
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
