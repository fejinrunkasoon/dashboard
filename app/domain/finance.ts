import type { EntityStatus, ProductOwnership } from './common'

export interface ServiceFeePolicy {
  id: string
  channelId: string
  code: string
  name: string
  status: EntityStatus
  effectiveFrom?: string | null
  effectiveTo?: string | null
  note?: string | null
}

export interface ServiceFeeTier {
  id: string
  policyId: string
  minSpend: number
  maxSpend?: number | null
  rate: number
  sortOrder: number
}

export interface ServiceFeeCalculationResult {
  mediaSpend: number
  matchedTierId?: string | null
  appliedRate: number
  serviceFee: number
}

export interface AccountMonthlySettlement {
  accountId: string
  channelId: string
  year: number
  month: number
  currency: string
  mediaSpend: number
  serviceFeePolicyId: string
  matchedTierId?: string | null
  appliedRate: number
  serviceFee: number
}

export interface ChannelMonthlySettlementSummary {
  channelId: string
  year: number
  month: number
  currency: string
  accountCount: number
  mediaSpend: number
  serviceFee: number
  settlementCost: number
}

export type ChannelPaymentAddressType = 'CRYPTO' | 'FIAT'

export type ChannelPaymentAddressStatus =
  | 'ACTIVE'
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'DISABLED'

/**
 * Mock finance operators for policy edits, refund confirm/reject, and reconciliation.
 * Not a permission matrix.
 */
export const FINANCE_OPERATOR_MEMBER_IDS = ['mem-lisi'] as const

/** Absolute variance rate above this opens a reconciliation alert. Matches rules page default. */
export const RECONCILIATION_VARIANCE_THRESHOLD = 0.05

export function isFinanceOperator(memberId: string | null | undefined): boolean {
  return !!memberId && (FINANCE_OPERATOR_MEMBER_IDS as readonly string[]).includes(memberId)
}

/** Channel remittance destination; multiple per channel. Approval = STEP 23. */
export interface ChannelPaymentAddress {
  id: string
  channelId: string
  type: ChannelPaymentAddressType
  label?: string | null
  /** Single payload string; network/bank fields stay combined until a later split. */
  addressPayload: string
  status: ChannelPaymentAddressStatus
  approverTeamId: string
  submittedByMemberId: string
  reviewedByMemberId?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  createdAt: string
  updatedAt: string
}

export type ChannelPrepaymentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface ChannelPrepayment {
  id: string
  paymentNo: string
  channelId: string
  paymentAddressId: string
  productOwnership: ProductOwnership
  amount: number
  currency: string
  status: ChannelPrepaymentStatus
  paidAt?: string | null
  confirmedAt?: string | null
  note?: string | null
  createdAt: string
}

export type ChannelRefundStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED'

export interface ChannelRefund {
  id: string
  refundNo: string
  channelId: string
  amount: number
  currency: string
  reason?: string | null
  status: ChannelRefundStatus
  requestedAt: string
  confirmedAt?: string | null
  note?: string | null
  createdAt: string
}

export interface SettlementQuery {
  channelId?: string
  year: number
  month: number
  currency?: string
}

/** Shared fund pool for a channel × ownership tag (自家 / 外接). */
export interface ChannelOwnershipFundSummary {
  channelId: string
  ownership: ProductOwnership
  currency: string
  prepaid: number
  refunded: number
  mediaSpend: number
  serviceFee: number
  settlementCost: number
  remaining: number
  /** Avg daily settlement cost over last `runwayLookbackDays` (for runway alerts). */
  avgDailySettlement: number
  runwayDays: number | null
}

/** Per-channel (or org-default when channelId null) balance health thresholds. */
export interface ChannelBalanceThreshold {
  id: string
  /** null = organization-wide default */
  channelId: string | null
  absoluteBalanceBelow: number | null
  daysOfRunwayBelow: number | null
  /** Lookback window for avg daily settlement (default 7). */
  runwayLookbackDays: number
  enabledTags: ProductOwnership[]
  severity: 'WARNING' | 'URGENT'
  updatedAt: string
}

export type ChannelReconciliationStatus = 'OPEN' | 'CONFIRMED'

/** Channel bill vs system Media Spend. Not a fund ledger. */
export interface ChannelReconciliation {
  id: string
  channelId: string
  year: number
  month: number
  currency: string
  channelBillMediaSpend: number
  systemMediaSpend: number
  variance: number
  /** Null when system spend is 0 and the bill is not. */
  varianceRate: number | null
  status: ChannelReconciliationStatus
  note?: string | null
  confirmedByMemberId?: string | null
  confirmedAt?: string | null
  createdAt: string
  updatedAt: string
}
