import type {
  AccountMonthlySettlement,
  ChannelMonthlySettlementSummary,
  SettlementQuery
} from '../../domain/finance'
import {
  accountChannelAssignments,
  accountServiceFeePolicyAssignments,
  accounts,
  serviceFeePolicies,
  serviceFeeTiers
} from '../../mocks/entities'
import { accountSpendDaily } from '../../mocks/spend-daily'
import { calculateServiceFee } from '../../utils/service-fee-calculator'
import { DEFAULT_CURRENCY, monthRange, sumSpend } from '../../utils/spend-aggregation'
import type { ChannelSettlementService } from './types'

function resolveChannelId(accountId: string, year: number, month: number): string {
  const range = monthRange(year, month)
  const midpoint = `${range.from}T12:00:00.000Z`
  const match = accountChannelAssignments.find(item =>
    item.accountId === accountId
    && item.startedAt <= midpoint
    && (item.endedAt == null || item.endedAt > midpoint)
  )
  if (match) return match.channelId
  return accounts.find(item => item.id === accountId)?.sourceChannelId ?? ''
}

function resolvePolicyId(accountId: string, year: number, month: number): string | null {
  const range = monthRange(year, month)
  const midpoint = `${range.from}T12:00:00.000Z`
  const match = accountServiceFeePolicyAssignments.find(item =>
    item.accountId === accountId
    && item.startedAt <= midpoint
    && (item.endedAt == null || item.endedAt > midpoint)
  )
  if (match) return match.policyId
  return accounts.find(item => item.id === accountId)?.serviceFeePolicyId ?? null
}

function buildAccountSettlements(query: SettlementQuery): AccountMonthlySettlement[] {
  const currency = query.currency ?? DEFAULT_CURRENCY
  const range = monthRange(query.year, query.month)
  const results: AccountMonthlySettlement[] = []

  for (const account of accounts) {
    const channelId = resolveChannelId(account.id, query.year, query.month)
    if (query.channelId && channelId !== query.channelId) continue

    const policyId = resolvePolicyId(account.id, query.year, query.month)
    if (!policyId) continue

    const policy = serviceFeePolicies.find(item => item.id === policyId)
    if (!policy) continue

    const tiers = serviceFeeTiers.filter(item => item.policyId === policyId)
    const rows = accountSpendDaily.filter(row => row.accountId === account.id)
    const mediaSpend = sumSpend(rows, range)
    if (mediaSpend <= 0 && query.channelId) {
      // still include zero-spend accounts for channel-scoped audits? skip zeros for clarity
    }
    if (mediaSpend <= 0) continue

    const fee = calculateServiceFee(mediaSpend, policy, tiers)
    results.push({
      accountId: account.id,
      channelId,
      year: query.year,
      month: query.month,
      currency,
      mediaSpend: fee.mediaSpend,
      serviceFeePolicyId: policyId,
      matchedTierId: fee.matchedTierId ?? null,
      appliedRate: fee.appliedRate,
      serviceFee: fee.serviceFee
    })
  }

  return results
}

export const channelSettlementService: ChannelSettlementService = {
  async getAccountMonthlySettlements(query) {
    return buildAccountSettlements(query)
  },

  async getChannelMonthlySummary(query) {
    if (!query.channelId) return null

    const settlements = buildAccountSettlements(query)
    const mediaSpend = settlements.reduce((sum, item) => sum + item.mediaSpend, 0)
    const serviceFee = settlements.reduce((sum, item) => sum + item.serviceFee, 0)

    return {
      channelId: query.channelId,
      year: query.year,
      month: query.month,
      currency: query.currency ?? DEFAULT_CURRENCY,
      accountCount: settlements.length,
      mediaSpend,
      serviceFee,
      settlementCost: mediaSpend + serviceFee
    } satisfies ChannelMonthlySettlementSummary
  }
}
