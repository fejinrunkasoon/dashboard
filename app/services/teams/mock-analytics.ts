import type {
  TeamChannelMatrix,
  TeamSpendRanking,
  TeamAccountStructure,
  TeamSpendTrend,
  TeamAnalyticsQuery,
  TeamSpendPeriod
} from './analytics-types'
import { teamService } from './mock'
import { channelService } from '../channels/mock'
import { addDays, format } from 'date-fns'
import { daysInRange } from '~/utils/spend-aggregation'

function getDaysForPeriod(period: TeamSpendPeriod): number {
  switch (period) {
    case 'TODAY': return 1
    case '7D': return 7
    case '30D': return 30
    case 'CUSTOM': return 7
    default: return 7
  }
}

function resolveTrendDays(query?: TeamAnalyticsQuery): number {
  if (query?.period === 'CUSTOM' && query.startDate && query.endDate) {
    return Math.min(daysInRange(query.startDate, query.endDate), 90)
  }
  return query?.period ? getDaysForPeriod(query.period) : 7
}

export const mockTeamAnalyticsService = {
  async getTeamChannelMatrix(query?: TeamAnalyticsQuery): Promise<TeamChannelMatrix> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const teams = await teamService.getTeamList({ status: 'ACTIVE' })
    const channels = await channelService.getChannelList({ status: 'ACTIVE' })

    const selectedTeams = query?.teamIds?.length
      ? teams.filter(t => query.teamIds!.includes(t.id)).slice(0, 10)
      : teams.slice(0, 10)

    const selectedChannels = channels.slice(0, 8)

    const data: number[][] = selectedTeams.map(() =>
      selectedChannels.map(() => {
        const rand = Math.random()
        if (rand < 0.6) return 0
        return Math.random() * 10000
      })
    )

    return {
      teams: selectedTeams.map(t => t.name),
      channels: selectedChannels.map(c => c.name),
      teamIds: selectedTeams.map(t => t.id),
      channelIds: selectedChannels.map(c => c.id),
      data
    }
  },

  async getTeamSpendRanking(query?: TeamAnalyticsQuery): Promise<TeamSpendRanking[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const teams = await teamService.getTeamList({ status: 'ACTIVE' })

    const selectedTeams = query?.teamIds?.length
      ? teams.filter(t => query.teamIds!.includes(t.id))
      : teams

    const rankings = selectedTeams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      spend: team.spend7d,
      rank: 0
    }))

    rankings.sort((a, b) => b.spend - a.spend)
    
    return rankings.map((r, index) => ({ ...r, rank: index + 1 })).slice(0, 10)
  },

  async getTeamAccountStructure(query?: TeamAnalyticsQuery): Promise<TeamAccountStructure[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const teams = await teamService.getTeamList({ status: 'ACTIVE' })

    const selectedTeams = query?.teamIds?.length
      ? teams.filter(t => query.teamIds!.includes(t.id))
      : teams.slice(0, 10)

    return selectedTeams.map(team => {
      const valid = team.accounts - team.idle - team.unfulfilledDemand
      return {
        teamId: team.id,
        teamName: team.name,
        valid,
        inUse: team.inUse,
        idle: team.idle,
        abnormal: Math.round(team.accounts * (team.banRate / 100)),
        total: team.accounts
      }
    })
  },

  async getTeamSpendTrend(query?: TeamAnalyticsQuery): Promise<TeamSpendTrend[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const days = resolveTrendDays(query)
    const teams = await teamService.getTeamList({ status: 'ACTIVE' })

    const selectedTeams = query?.teamIds?.length
      ? teams.filter(t => query.teamIds!.includes(t.id)).slice(0, 5)
      : teams.slice(0, 5)

    const today = new Date()
    const trends: TeamSpendTrend[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i)
      const dateStr = format(date, 'yyyy-MM-dd')

      trends.push({
        date: dateStr,
        teams: selectedTeams.map(team => ({
          teamId: team.id,
          teamName: team.name,
          spend: Math.max(0, (team.spend7d / 7) * (0.8 + Math.random() * 0.4))
        }))
      })
    }

    return trends
  }
}
