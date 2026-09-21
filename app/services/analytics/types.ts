import type { AccountAssetStatus, AccountQuery, AccountMediaStatus } from '../../domain/account'
import type { SpendDateRange, SpendPeriodPreset } from '../../domain/common'

export type QualityGroupBy =
  | 'media'
  | 'channel'
  | 'timezone'
  | 'team'
  | 'member'
  | 'manager'
  | 'product'
  | 'assetStatus'

export type QualitySpendPeriod = SpendPeriodPreset

export type QualityPivotSortBy =
  | 'label'
  | 'accountCount'
  | 'activeValidCount'
  | 'inUseCount'
  | 'idleCount'
  | 'bannedCount'
  | 'banRate'
  | 'usageRate'
  | 'spend'

export interface QualityPivotQuery {
  groupBy: QualityGroupBy
  spendPeriod?: QualitySpendPeriod
  spendRange?: SpendDateRange
  mediaIds?: string[]
  channelIds?: string[]
  teamIds?: string[]
  memberIds?: string[]
  managerIds?: string[]
  productIds?: string[]
  assetStatuses?: AccountAssetStatus[]
  mediaStatuses?: AccountMediaStatus[]
  timezone?: string
  keyword?: string
  sortBy?: QualityPivotSortBy
  sortOrder?: 'asc' | 'desc'
}

export interface QualityPivotRow {
  key: string
  label: string
  /** false when key is null-bucket — UI must disable drill-down */
  drillable: boolean
  accountCount: number
  activeValidCount: number
  inUseCount: number
  idleCount: number
  bannedCount: number
  /** 0–1 ratio */
  banRate: number
  /** 0–1 ratio */
  usageRate: number
  /** Media Spend only for selected period */
  spend: number
}

export interface QualityPivotMeta {
  groupBy: QualityGroupBy
  spendPeriod: QualitySpendPeriod
  spendRange?: SpendDateRange
  totalAccounts: number
  totalSpend: number
}

export interface QualityPivotResult {
  rows: QualityPivotRow[]
  meta: QualityPivotMeta
}

export interface AnalyticsService {
  getQualityPivot(query: QualityPivotQuery): Promise<QualityPivotResult>
}

/** Sentinel for missing dimension value (no team / product / etc.). */
export const QUALITY_NONE_KEY = '__none__'
