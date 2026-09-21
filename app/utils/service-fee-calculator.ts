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

export interface ServiceFeeTierDraft {
  minSpend: number
  maxSpend?: number | null
  rate: number
  sortOrder: number
}

/** Contiguous half-open tiers. Last maxSpend may be null. No top-level policy rate. */
export function assertServiceFeeTiers(tiers: ServiceFeeTierDraft[]): void {
  if (tiers.length < 1) throw new Error('at least one tier is required')

  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder || a.minSpend - b.minSpend)
  for (let i = 0; i < ordered.length; i++) {
    const tier = ordered[i]!
    if (!(tier.rate > 0 && tier.rate <= 1)) throw new Error('rate must be in (0, 1]')
    if (!(tier.minSpend >= 0)) throw new Error('minSpend must be >= 0')
    if (tier.maxSpend != null && !(tier.maxSpend > tier.minSpend)) {
      throw new Error('maxSpend must be greater than minSpend')
    }
    if (i === 0 && tier.minSpend !== 0) throw new Error('first tier must start at 0')
    if (i < ordered.length - 1 && (tier.maxSpend == null)) {
      throw new Error('only the last tier may have an open maxSpend')
    }
    if (i > 0) {
      const prev = ordered[i - 1]!
      if (prev.maxSpend == null || tier.minSpend !== prev.maxSpend) {
        throw new Error('tiers must be contiguous without gaps or overlaps')
      }
    }
  }
}

export function remainingLimit(spendLimit: number | null | undefined, amountSpent: number): number | null {
  if (spendLimit == null) return null
  return Math.max(spendLimit - amountSpent, 0)
}
