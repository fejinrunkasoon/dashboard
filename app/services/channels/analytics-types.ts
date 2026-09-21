import type { SpendPeriodPreset } from '../../domain/common'

export type ChannelScoreLevel = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT'
export type SpendPeriod = SpendPeriodPreset

export interface ChannelScoreDimensions {
  stability: number
  validRate: number
  abnormalRate: number
  lifetime: number
  spend: number
  balance: number
}

export interface ChannelScore {
  channelId: string
  channelName: string
  channelCode: string
  overall: number
  dimensions: ChannelScoreDimensions
  rank: number
  level: ChannelScoreLevel
}

export interface ChannelSpendTrendPoint {
  channelId: string
  channelName: string
  spend: number
}

export interface ChannelSpendTrend {
  date: string
  channels: ChannelSpendTrendPoint[]
}

export interface ChannelSpendDistribution {
  channelId: string
  channelName: string
  spend: number
  percentage: number
}

export interface ChannelAccountStructure {
  channelId: string
  channelName: string
  valid: number
  inUse: number
  idle: number
  abnormal: number
}

export interface ChannelAnalyticsQuery {
  period?: SpendPeriod
  mediaId?: string
  channelIds?: string[]
  level?: ChannelScoreLevel
  startDate?: string
  endDate?: string
}

export interface ChannelAnalyticsService {
  getChannelScores(query?: ChannelAnalyticsQuery): Promise<ChannelScore[]>
  getChannelSpendTrend(query?: ChannelAnalyticsQuery): Promise<ChannelSpendTrend[]>
  getChannelSpendDistribution(query?: ChannelAnalyticsQuery): Promise<ChannelSpendDistribution[]>
  getChannelAccountStructure(query?: ChannelAnalyticsQuery): Promise<ChannelAccountStructure[]>
}
