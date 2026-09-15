import type { EntityStatus } from './common'

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

export type ChannelPrepaymentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface ChannelPrepayment {
  id: string
  paymentNo: string
  channelId: string
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
