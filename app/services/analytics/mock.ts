import type { AdAccountListItem, AccountQuery } from '../../domain/account'
import { accountSpendDaily } from '../../mocks'
import {
  aggregateSpendWindow,
  MOCK_TODAY,
  shiftDate
} from '../../utils/spend-aggregation'
import { accountService } from '../accounts/mock'
import type {
  AnalyticsService,
  QualityGroupBy,
  QualityPivotQuery,
  QualityPivotResult,
  QualityPivotRow,
  QualityPivotSortBy,
  QualitySpendPeriod
} from './types'
import { QUALITY_NONE_KEY } from './types'

function toAccountQuery(query: QualityPivotQuery): AccountQuery {
  const accountQuery: AccountQuery = {
    mediaIds: query.mediaIds,
    channelIds: query.channelIds,
    teamIds: query.teamIds,
    memberIds: query.memberIds,
    managerIds: query.managerIds,
    productIds: query.productIds,
    assetStatuses: query.assetStatuses,
    mediaStatuses: query.mediaStatuses,
    timezone: query.timezone,
    keyword: query.keyword,
    page: 1,
    pageSize: 500
  }

  if (query.spendPeriod === 'CUSTOM' && query.spendRange) {
    accountQuery.spendRange = query.spendRange
  }

  return accountQuery
}

function resolveSpendRange(
  period: QualitySpendPeriod,
  custom?: QualityPivotQuery['spendRange']
): { period: QualitySpendPeriod, range?: { from: string, to: string } } {
  if (period === 'CUSTOM' && custom?.from && custom?.to) {
    return { period: 'CUSTOM', range: custom }
  }
  if (period === 'TODAY') {
    return { period: 'TODAY', range: { from: MOCK_TODAY, to: MOCK_TODAY } }
  }
  if (period === '7D') {
    return { period: '7D', range: { from: shiftDate(MOCK_TODAY, -6), to: MOCK_TODAY } }
  }
  return { period: '30D', range: { from: shiftDate(MOCK_TODAY, -29), to: MOCK_TODAY } }
}

function spendForItem(
  item: AdAccountListItem,
  period: QualitySpendPeriod,
  range?: { from: string, to: string }
): number {
  if (period === 'TODAY') return item.todaySpend
  if (period === '7D') return item.spend7d
  if (period === '30D') return item.spend30d
  if (item.selectedPeriodSpend != null) return item.selectedPeriodSpend
  if (range) {
    const rows = accountSpendDaily.filter(row => row.accountId === item.id)
    return aggregateSpendWindow(item.id, rows, range).spend
  }
  return item.spend30d
}

function dimensionOf(
  item: AdAccountListItem,
  groupBy: QualityGroupBy
): { key: string, label: string, drillable: boolean } {
  switch (groupBy) {
    case 'media':
      return { key: item.media.id, label: item.media.name, drillable: true }
    case 'channel':
      return { key: item.channel.id, label: item.channel.name, drillable: true }
    case 'timezone':
      if (!item.timezone) {
        return { key: QUALITY_NONE_KEY, label: '(none)', drillable: false }
      }
      return { key: item.timezone, label: item.timezone, drillable: true }
    case 'team':
      if (!item.team) {
        return { key: QUALITY_NONE_KEY, label: '(none)', drillable: false }
      }
      return { key: item.team.id, label: item.team.name, drillable: true }
    case 'member':
      if (!item.member) {
        return { key: QUALITY_NONE_KEY, label: '(none)', drillable: false }
      }
      return { key: item.member.id, label: item.member.name, drillable: true }
    case 'manager':
      if (!item.manager) {
        return { key: QUALITY_NONE_KEY, label: '(none)', drillable: false }
      }
      return { key: item.manager.id, label: item.manager.name, drillable: true }
    case 'product':
      if (!item.product) {
        return { key: QUALITY_NONE_KEY, label: '(none)', drillable: false }
      }
      return { key: item.product.id, label: item.product.name, drillable: true }
    case 'assetStatus':
      return { key: item.assetStatus, label: item.assetStatus, drillable: true }
  }
}

function isActiveValid(item: AdAccountListItem): boolean {
  return item.mediaStatus === 'ACTIVE'
    && item.assetStatus !== 'DISABLED'
    && item.assetStatus !== 'ARCHIVED'
}

function emptyBucket(key: string, label: string, drillable: boolean): QualityPivotRow {
  return {
    key,
    label,
    drillable,
    accountCount: 0,
    activeValidCount: 0,
    inUseCount: 0,
    idleCount: 0,
    bannedCount: 0,
    banRate: 0,
    usageRate: 0,
    spend: 0
  }
}

function sortRows(
  rows: QualityPivotRow[],
  sortBy: QualityPivotSortBy = 'accountCount',
  sortOrder: 'asc' | 'desc' = 'desc'
): QualityPivotRow[] {
  const order = sortOrder === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[sortBy]
    const bv = b[sortBy]
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * order
    }
    return String(av).localeCompare(String(bv)) * order
  })
}

export const analyticsService: AnalyticsService = {
  async getQualityPivot(query: QualityPivotQuery): Promise<QualityPivotResult> {
    const spendPeriod = query.spendPeriod ?? '30D'
    const { period, range } = resolveSpendRange(spendPeriod, query.spendRange)

    const accountQuery = toAccountQuery({
      ...query,
      spendPeriod: period,
      spendRange: range
    })

    const page = await accountService.getAccounts(accountQuery)
    const items = page.data

    const buckets = new Map<string, QualityPivotRow>()

    for (const item of items) {
      const dim = dimensionOf(item, query.groupBy)
      let row = buckets.get(dim.key)
      if (!row) {
        row = emptyBucket(dim.key, dim.label, dim.drillable)
        buckets.set(dim.key, row)
      }

      row.accountCount += 1
      if (isActiveValid(item)) row.activeValidCount += 1
      if (item.assetStatus === 'IN_USE') row.inUseCount += 1
      if (item.assetStatus === 'IDLE') row.idleCount += 1
      if (item.mediaStatus === 'BANNED') row.bannedCount += 1
      row.spend += spendForItem(item, period, range)
    }

    const rows = [...buckets.values()].map((row) => {
      row.banRate = row.accountCount === 0 ? 0 : row.bannedCount / row.accountCount
      row.usageRate = row.accountCount === 0 ? 0 : row.inUseCount / row.accountCount
      return row
    })

    const sorted = sortRows(rows, query.sortBy ?? 'accountCount', query.sortOrder ?? 'desc')
    const totalSpend = sorted.reduce((sum, row) => sum + row.spend, 0)

    return {
      rows: sorted,
      meta: {
        groupBy: query.groupBy,
        spendPeriod: period,
        spendRange: range,
        totalAccounts: items.length,
        totalSpend
      }
    }
  }
}
