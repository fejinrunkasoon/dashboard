import type { ServiceFeeCalculationResult, ServiceFeePolicy, ServiceFeeTier } from '../domain/finance'

/**
 * NON_PROGRESSIVE_TIER: the whole monthly media spend uses one matched tier rate.
 * Do not split spend across lower tiers.
 *
 * Technical debt: JavaScript number. Formal books must use PostgreSQL NUMERIC.
 */
export function calculateServiceFee(
  monthlyMediaSpend: number,
  _policy: ServiceFeePolicy,
  tiers: ServiceFeeTier[]
): ServiceFeeCalculationResult {
  const spend = Math.max(0, monthlyMediaSpend)
  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder || a.minSpend - b.minSpend)
  const matched = ordered.find(tier =>
    spend >= tier.minSpend && (tier.maxSpend == null || spend < tier.maxSpend)
  ) ?? ordered[ordered.length - 1]

  if (!matched) {
    return {
      mediaSpend: spend,
      matchedTierId: null,
      appliedRate: 0,
      serviceFee: 0
    }
  }

  return {
    mediaSpend: spend,
    matchedTierId: matched.id,
    appliedRate: matched.rate,
    serviceFee: spend * matched.rate
  }
}

export function remainingLimit(spendLimit: number | null | undefined, amountSpent: number): number | null {
  if (spendLimit == null) return null
  return Math.max(spendLimit - amountSpent, 0)
}
