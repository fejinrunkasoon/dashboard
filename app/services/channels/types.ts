import type { NamedRef } from '../../domain/account'
import type { Channel } from '../../domain/channel'
import type { EntityStatus, ProductOwnership } from '../../domain/common'
import type {
  ChannelPaymentAddress,
  ChannelPaymentAddressType,
  ChannelPrepayment,
  ChannelReconciliation,
  ChannelRefund,
  ChannelOwnershipFundSummary,
  ChannelBalanceThreshold,
  ServiceFeePolicy,
  ServiceFeeTier
} from '../../domain/finance'

export interface ChannelListQuery {
  keyword?: string
  status?: EntityStatus
  mediaId?: string
  /** yes = abnormal > 0, no = abnormal === 0 */
  abnormal?: 'yes' | 'no'
  /** yes = inUse > 0, no = inUse === 0 */
  inUse?: 'yes' | 'no'
  /** yes = spend30d > 0, no = spend30d === 0 */
  spend30d?: 'yes' | 'no'
}

/**
 * Channel Center metrics (Phase 9 / plan §29):
 * - Scope = accounts with sourceChannelId === channelId (delivery ownership)
 * - spend* = Media Spend only (never Service Fee / settlementCost)
 * - currentValid = media ACTIVE and asset not DISABLED/ARCHIVED
 * - abnormal = media RESTRICTED|BANNED|DISABLED or asset DISABLED
 */
export interface ChannelMetrics {
  deliveredAccounts: number
  currentValid: number
  inUse: number
  abnormal: number
  averageLifetimeDays: number | null
  todaySpend: number
  spend7d: number
  spend30d: number
}

export interface ChannelListItem {
  id: string
  code: string
  name: string
  status: EntityStatus
  supportedMedia: NamedRef[]
  deliveredAccounts: number
  currentValid: number
  inUse: number
  abnormal: number
  averageLifetimeDays: number | null
  /** Media Spend (30D), not settlement cost */
  spend30d: number
}

export interface ChannelDetailBundle {
  channel: Channel
  metrics: ChannelMetrics
  supportedMedia: NamedRef[]
}

export interface CreatePrepaymentInput {
  channelId: string
  paymentAddressId: string
  productOwnership: ProductOwnership
  amount: number
  note?: string | null
  createdBy?: string
}

export interface SubmitPaymentAddressInput {
  channelId: string
  type: ChannelPaymentAddressType
  label?: string | null
  addressPayload: string
  approverTeamId: string
  submittedByMemberId: string
}

export interface UpdatePaymentAddressInput {
  type?: ChannelPaymentAddressType
  label?: string | null
  addressPayload?: string
  approverTeamId?: string
  submittedByMemberId: string
}

export interface ReviewPaymentAddressInput {
  actorMemberId: string
  note?: string | null
}

export interface CreateRefundInput {
  channelId: string
  amount: number
  reason?: string | null
  note?: string | null
  createdBy: string
}

export interface ReviewRefundInput {
  actorMemberId: string
  note?: string | null
}

export interface ServiceFeeTierInput {
  minSpend: number
  maxSpend?: number | null
  rate: number
  sortOrder: number
}

export interface CreateServiceFeePolicyInput {
  channelId: string
  code: string
  name: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  note?: string | null
  tiers: ServiceFeeTierInput[]
  actorMemberId: string
}

export interface UpdateServiceFeePolicyInput {
  name?: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  note?: string | null
  tiers?: ServiceFeeTierInput[]
  actorMemberId: string
}

export interface DisableServiceFeePolicyInput {
  actorMemberId: string
}

export interface CreateReconciliationInput {
  channelId: string
  year: number
  month: number
  channelBillMediaSpend: number
  note?: string | null
  actorMemberId: string
}

export interface ConfirmReconciliationInput {
  actorMemberId: string
  note?: string | null
}

export interface CreateChannelInput {
  code: string
  name: string
  supportedMediaIds: string[]
  contactName?: string | null
  telegramReference?: string | null
  note?: string | null
}

export interface UpdateChannelInput {
  name?: string
  supportedMediaIds?: string[]
  contactName?: string | null
  telegramReference?: string | null
  note?: string | null
}

export interface ChannelService {
  getChannels(): Promise<Channel[]>
  getChannelById(id: string): Promise<Channel | null>
  getChannelList(query?: ChannelListQuery): Promise<ChannelListItem[]>
  getChannelDetail(id: string): Promise<ChannelDetailBundle | null>
  createChannel(input: CreateChannelInput): Promise<Channel>
  updateChannel(id: string, input: UpdateChannelInput): Promise<Channel>
  setChannelStatus(id: string, status: EntityStatus): Promise<Channel>
  getPaymentAddresses(channelId: string): Promise<ChannelPaymentAddress[]>
  getPrepayments(channelId?: string): Promise<ChannelPrepayment[]>
  getRefunds(channelId?: string): Promise<ChannelRefund[]>
  createPrepayment(input: CreatePrepaymentInput): Promise<ChannelPrepayment>
  submitPaymentAddress(input: SubmitPaymentAddressInput): Promise<ChannelPaymentAddress>
  updatePaymentAddress(id: string, input: UpdatePaymentAddressInput): Promise<ChannelPaymentAddress>
  approvePaymentAddress(id: string, input: ReviewPaymentAddressInput): Promise<ChannelPaymentAddress>
  rejectPaymentAddress(id: string, input: ReviewPaymentAddressInput): Promise<ChannelPaymentAddress>
  disablePaymentAddress(id: string, actorMemberId: string): Promise<ChannelPaymentAddress>
  createRefund(input: CreateRefundInput): Promise<ChannelRefund>
  confirmRefund(id: string, input: ReviewRefundInput): Promise<ChannelRefund>
  rejectRefund(id: string, input: ReviewRefundInput): Promise<ChannelRefund>
  getServiceFeePolicies(channelId: string): Promise<ServiceFeePolicy[]>
  getServiceFeeTiers(policyId: string): Promise<ServiceFeeTier[]>
  createServiceFeePolicy(input: CreateServiceFeePolicyInput): Promise<ServiceFeePolicy>
  updateServiceFeePolicy(id: string, input: UpdateServiceFeePolicyInput): Promise<ServiceFeePolicy>
  disableServiceFeePolicy(id: string, input: DisableServiceFeePolicyInput): Promise<ServiceFeePolicy>
  getReconciliations(channelId: string): Promise<ChannelReconciliation[]>
  createReconciliation(input: CreateReconciliationInput): Promise<ChannelReconciliation>
  confirmReconciliation(id: string, input: ConfirmReconciliationInput): Promise<ChannelReconciliation>
  /** Shared fund pool by 自家/外接 tag. */
  getOwnershipFundSummaries(channelId: string): Promise<ChannelOwnershipFundSummary[]>
  getBalanceThreshold(channelId: string): Promise<ChannelBalanceThreshold>
  updateBalanceThreshold(
    channelId: string,
    patch: Partial<Pick<
      ChannelBalanceThreshold,
      'absoluteBalanceBelow' | 'daysOfRunwayBelow' | 'runwayLookbackDays' | 'enabledTags' | 'severity'
    >>
  ): Promise<ChannelBalanceThreshold>
}
