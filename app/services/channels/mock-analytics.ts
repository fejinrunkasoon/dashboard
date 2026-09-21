import type {
  ChannelScore,
  ChannelScoreLevel,
  ChannelSpendTrend,
  ChannelSpendDistribution,
  ChannelAccountStructure,
  ChannelAnalyticsQuery,
  SpendPeriod
} from './analytics-types'
import type { ChannelListItem } from './types'
import { channelService } from './mock'
import { addDays, format } from 'date-fns'
import { daysInRange } from '~/utils/spend-aggregation'

function normalizeScore(value: number, min: number, max: number): number {
  if (value <= min) return 0
  if (value >= max) return 100
  return ((value - min) / (max - min)) * 100
}

function calculateChannelScore(channel: ChannelListItem): ChannelScore {
  const weights = {
    stability: 0.20,
    validRate: 0.20,
    abnormalRate: 0.15,
    lifetime: 0.15,
    spend: 0.20,
    balance: 0.10
  }

  const maxSpend = 50000
  const maxBalance = 10000

  const validRate = channel.deliveredAccounts > 0
    ? (channel.currentValid / channel.deliveredAccounts) * 100
    : 0

  const abnormalRate = channel.currentValid > 0
    ? 100 - (channel.abnormal / channel.currentValid) * 100
    : 100

  const dimensions = {
    stability: normalizeScore(channel.averageLifetimeDays ?? 0, 0, 365),
    validRate,
    abnormalRate,
    lifetime: normalizeScore(channel.averageLifetimeDays ?? 0, 0, 180),
    spend: normalizeScore(channel.spend30d, 0, maxSpend),
    balance: Math.random() * 60 + 40
  }

  const overall = Math.round(
    dimensions.stability * weights.stability +
    dimensions.validRate * weights.validRate +
    dimensions.abnormalRate * weights.abnormalRate +
    dimensions.lifetime * weights.lifetime +
    dimensions.spend * weights.spend +
    dimensions.balance * weights.balance
  )

  let level: ChannelScoreLevel = 'NEEDS_IMPROVEMENT'
  if (overall >= 80) level = 'EXCELLENT'
  else if (overall >= 60) level = 'GOOD'

  return {
    channelId: channel.id,
    channelName: channel.name,
    channelCode: channel.code,
    overall,
    dimensions,
    rank: 0,
    level
  }
}

function getDaysForPeriod(period: SpendPeriod): number {
  switch (period) {
    case 'TODAY': return 1
    case '7D': return 7
    case '30D': return 30
    case 'CUSTOM': return 7
    default: return 30
  }
}

function resolveTrendDays(query?: ChannelAnalyticsQuery): number {
  if (query?.period === 'CUSTOM' && query.startDate && query.endDate) {
    return Math.min(daysInRange(query.startDate, query.endDate), 90)
  }
  return query?.period ? getDaysForPeriod(query.period) : 30
}

export const mockChannelAnalyticsService = {
  async getChannelScores(query?: ChannelAnalyticsQuery): Promise<ChannelScore[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    let channels = await channelService.getChannelList({
      mediaId: query?.mediaId,
      status: 'ACTIVE'
    })

    if (query?.channelIds?.length) {
      channels = channels.filter(c => query.channelIds!.includes(c.id))
    }

    let scores = channels.map(calculateChannelScore)

    scores.sort((a, b) => b.overall - a.overall)
    scores = scores.map((score, index) => ({ ...score, rank: index + 1 }))

    if (query?.level) {
      scores = scores.filter(s => s.level === query.level)
    }

    return scores
  },

  async getChannelSpendTrend(query?: ChannelAnalyticsQuery): Promise<ChannelSpendTrend[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const days = resolveTrendDays(query)
    const channels = await channelService.getChannelList({
      mediaId: query?.mediaId,
      status: 'ACTIVE'
    })

    const selectedChannels = query?.channelIds?.length
      ? channels.filter(c => query.channelIds!.includes(c.id)).slice(0, 5)
      : channels.slice(0, 5)

    const today = new Date()
    const trends: ChannelSpendTrend[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i)
      const dateStr = format(date, 'yyyy-MM-dd')

      trends.push({
        date: dateStr,
        channels: selectedChannels.map(ch => ({
          channelId: ch.id,
          channelName: ch.name,
          spend: Math.max(0, (ch.spend30d / 30) * (0.8 + Math.random() * 0.4))
        }))
      })
    }

    return trends
  },

  async getChannelSpendDistribution(query?: ChannelAnalyticsQuery): Promise<ChannelSpendDistribution[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const channels = await channelService.getChannelList({
      mediaId: query?.mediaId,
      status: 'ACTIVE'
    })

    const topChannels = channels
      .sort((a, b) => b.spend30d - a.spend30d)
      .slice(0, 8)

    const totalSpend = topChannels.reduce((sum, ch) => sum + ch.spend30d, 0)

    return topChannels.map(ch => ({
      channelId: ch.id,
      channelName: ch.name,
      spend: ch.spend30d,
      percentage: totalSpend > 0 ? (ch.spend30d / totalSpend) * 100 : 0
    }))
  },

  async getChannelAccountStructure(query?: ChannelAnalyticsQuery): Promise<ChannelAccountStructure[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const channels = await channelService.getChannelList({
      mediaId: query?.mediaId,
      status: 'ACTIVE'
    })

    const topChannels = query?.channelIds?.length
      ? channels.filter(c => query.channelIds!.includes(c.id))
      : channels.slice(0, 10)

    return topChannels.map(ch => ({
      channelId: ch.id,
      channelName: ch.name,
      valid: ch.currentValid - ch.inUse - ch.abnormal,
      inUse: ch.inUse,
      idle: Math.max(0, ch.currentValid - ch.inUse - ch.abnormal),
      abnormal: ch.abnormal
    }))
  }
}
