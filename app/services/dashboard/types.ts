import type { Alert } from '../../domain/alert'

export interface DashboardOverviewInput {
  /** Number of days ending at MOCK_TODAY for spend windows (clamped 7–30). */
  trendDays?: number
}

export interface DashboardKpis {
  accountCount: number
  inUse: number
  /** 0–1 */
  usageRate: number
  /** Media spend in the selected date window. */
  periodSpend: number
  /** Current mediaBanned stock — not fabricated "today new bans" */
  bannedCount: number
  openAlerts: number
}

export interface DashboardSpendTrendPoint {
  date: string
  mediaId: string
  mediaName: string
  spend: number
}

export interface DashboardOwnershipSpend {
  internalSpend: number
  externalSpend: number
}

export interface DashboardAccountStructure {
  available: number
  assigned: number
  inUse: number
  idle: number
  disabled: number
  archived: number
  mediaBanned: number
}

export interface DashboardChannelRow {
  id: string
  name: string
  currentValid: number
  inUse: number
  /** Media spend in the selected date window. */
  spend: number
  abnormal: number
}

export interface DashboardTeamRow {
  id: string
  name: string
  accounts: number
  usageRate: number
  /** Media spend in the selected date window. */
  spend: number
  banRate: number
}

export interface DashboardOverviewBundle {
  /** Days in the active spend window (clamped 7–30). */
  rangeDays: number
  kpis: DashboardKpis
  spendTrend: DashboardSpendTrendPoint[]
  ownershipSpend: DashboardOwnershipSpend
  accountStructure: DashboardAccountStructure
  channels: DashboardChannelRow[]
  teams: DashboardTeamRow[]
  alerts: Alert[]
}

export interface DashboardService {
  getOverview(input?: DashboardOverviewInput): Promise<DashboardOverviewBundle>
}
