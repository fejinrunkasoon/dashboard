import type { SpendPeriodPreset } from '../../domain/common'

export type TeamSpendPeriod = SpendPeriodPreset

export interface TeamChannelMatrix {
  teams: string[]
  channels: string[]
  data: number[][]
  teamIds: string[]
  channelIds: string[]
}

export interface TeamSpendRanking {
  teamId: string
  teamName: string
  teamCode: string
  spend: number
  rank: number
}

export interface TeamAccountStructure {
  teamId: string
  teamName: string
  valid: number
  inUse: number
  idle: number
  abnormal: number
  total: number
}

export interface TeamSpendTrendPoint {
  teamId: string
  teamName: string
  spend: number
}

export interface TeamSpendTrend {
  date: string
  teams: TeamSpendTrendPoint[]
}

export interface TeamAnalyticsQuery {
  period?: TeamSpendPeriod
  teamIds?: string[]
  status?: string
  startDate?: string
  endDate?: string
}

export interface TeamAnalyticsService {
  getTeamChannelMatrix(query?: TeamAnalyticsQuery): Promise<TeamChannelMatrix>
  getTeamSpendRanking(query?: TeamAnalyticsQuery): Promise<TeamSpendRanking[]>
  getTeamAccountStructure(query?: TeamAnalyticsQuery): Promise<TeamAccountStructure[]>
  getTeamSpendTrend(query?: TeamAnalyticsQuery): Promise<TeamSpendTrend[]>
}
