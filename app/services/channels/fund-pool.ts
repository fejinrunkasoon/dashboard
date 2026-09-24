import type { ProductOwnership } from '../../domain/common'
import type { ChannelOwnershipFundSummary } from '../../domain/finance'
import {
  accountProductAssignments,
  accounts,
  channelPrepayments,
  channelRefunds,
  products,
  serviceFeePolicies,
  serviceFeeTiers
} from '../../mocks/entities'
import { accountSpendDaily } from '../../mocks/spend-daily'
import { calculateServiceFee } from '../../utils/service-fee-calculator'
import {
  DEFAULT_CURRENCY,
  MOCK_TODAY,
  shiftDate,
  sumSpend
} from '../../utils/spend-aggregation'

const TAGS: ProductOwnership[] = ['INTERNAL', 'EXTERNAL']

function currentProductOwnership(accountId: string): ProductOwnership | null {
  const asg = accountProductAssignments.find(
    item => item.accountId === accountId && item.endedAt == null
  )
  if (!asg) return null
  return products.find(item => item.id === asg.productId)?.ownershipType ?? null
}

/**
 * Lifetime settlement cost for an account on its source channel using current policy.
 * mediaSpend = all daily rows; fee = NON_PROGRESSIVE on lifetime mediaSpend (pool approximation).
 */
function accountLifetimeSettlement(accountId: string): {
  mediaSpend: number
  serviceFee: number
} {
  const account = accounts.find(item => item.id === accountId)
  if (!account) return { mediaSpend: 0, serviceFee: 0 }
  const rows = accountSpendDaily.filter(row => row.accountId === accountId)
  const mediaSpend = sumSpend(rows)
  if (mediaSpend <= 0) return { mediaSpend: 0, serviceFee: 0 }

  const policyId = account.serviceFeePolicyId
  if (!policyId) return { mediaSpend, serviceFee: 0 }
  const policy = serviceFeePolicies.find(item => item.id === policyId)
  if (!policy) return { mediaSpend, serviceFee: 0 }
  const tiers = serviceFeeTiers.filter(item => item.policyId === policyId)
  const fee = calculateServiceFee(mediaSpend, policy, tiers)
  return { mediaSpend: fee.mediaSpend, serviceFee: fee.serviceFee }
}

function avgDailySettlement(
  channelId: string,
  ownership: ProductOwnership,
  lookbackDays: number
): number {
  const from = shiftDate(MOCK_TODAY, -(Math.max(1, lookbackDays) - 1))
  let cost = 0
  for (const account of accounts) {
    if (account.sourceChannelId !== channelId) continue
    if (currentProductOwnership(account.id) !== ownership) continue
    const rows = accountSpendDaily.filter(row => row.accountId === account.id)
    const mediaSpend = sumSpend(rows, { from, to: MOCK_TODAY })
    if (mediaSpend <= 0) continue
    const policyId = account.serviceFeePolicyId
    const policy = policyId
      ? serviceFeePolicies.find(item => item.id === policyId)
      : null
    const tiers = policyId
      ? serviceFeeTiers.filter(item => item.policyId === policyId)
      : []
    const fee = policy
      ? calculateServiceFee(mediaSpend, policy, tiers)
      : { mediaSpend, serviceFee: 0 }
    cost += fee.mediaSpend + fee.serviceFee
  }
  return cost / Math.max(1, lookbackDays)
}

/** Build INTERNAL + EXTERNAL fund summaries for a channel. */
export function buildChannelOwnershipFundSummaries(
  channelId: string,
  runwayLookbackDays = 7
): ChannelOwnershipFundSummary[] {
  const prepaidByTag: Record<ProductOwnership, number> = {
    INTERNAL: 0,
    EXTERNAL: 0
  }
  for (const pay of channelPrepayments) {
    if (pay.channelId !== channelId || pay.status !== 'CONFIRMED') continue
    prepaidByTag[pay.productOwnership] += pay.amount
  }

  const totalPrepaid = prepaidByTag.INTERNAL + prepaidByTag.EXTERNAL
  const totalRefunded = channelRefunds
    .filter(item => item.channelId === channelId && item.status === 'CONFIRMED')
    .reduce((sum, item) => sum + item.amount, 0)

  const settledByTag: Record<ProductOwnership, { mediaSpend: number, serviceFee: number }> = {
    INTERNAL: { mediaSpend: 0, serviceFee: 0 },
    EXTERNAL: { mediaSpend: 0, serviceFee: 0 }
  }
  for (const account of accounts) {
    if (account.sourceChannelId !== channelId) continue
    const tag = currentProductOwnership(account.id)
    if (!tag) continue
    const settled = accountLifetimeSettlement(account.id)
    settledByTag[tag].mediaSpend += settled.mediaSpend
    settledByTag[tag].serviceFee += settled.serviceFee
  }

  return TAGS.map((ownership) => {
    const prepaid = prepaidByTag[ownership]
    const refundShare = totalPrepaid > 0
      ? totalRefunded * (prepaid / totalPrepaid)
      : (ownership === 'INTERNAL' ? totalRefunded : 0)
    const mediaSpend = settledByTag[ownership].mediaSpend
    const serviceFee = settledByTag[ownership].serviceFee
    const settlementCost = mediaSpend + serviceFee
    const remaining = prepaid - refundShare - settlementCost
    const avgDaily = avgDailySettlement(channelId, ownership, runwayLookbackDays)
    const runwayDays = avgDaily > 0 ? remaining / avgDaily : null

    return {
      channelId,
      ownership,
      currency: DEFAULT_CURRENCY,
      prepaid,
      refunded: refundShare,
      mediaSpend,
      serviceFee,
      settlementCost,
      remaining,
      avgDailySettlement: avgDaily,
      runwayDays
    }
  })
}

export function getPoolRemainingMap(
  channelId: string
): Record<ProductOwnership, number> {
  const summaries = buildChannelOwnershipFundSummaries(channelId)
  return {
    INTERNAL: summaries.find(s => s.ownership === 'INTERNAL')?.remaining ?? 0,
    EXTERNAL: summaries.find(s => s.ownership === 'EXTERNAL')?.remaining ?? 0
  }
}
