import type {
  AccountDemand,
  AccountDemandAllocation,
  AccountDemandItem,
  AccountDemandStatus,
  DemandPriority,
  DemandQuery
} from '../../domain/demand'
import type {
  ChannelAccountOrder,
  ChannelAccountOrderQuery,
  ChannelOrderRejectReason
} from '../../domain/channel-order'
import type {
  DeliveryParseDraft,
  DeliveryValidationResult,
  MockTelegramInquiry
} from '../../domain/channel-order-telegram'
import type { AdAccount } from '../../domain/account'
import type { PagedResponse } from '../../domain/common'

export interface CreateAccountDemandInput {
  teamId: string
  requesterUserId: string
  expectedDate?: string | null
  priority: DemandPriority
  reason?: string | null
  mediaId: string
  productId?: string | null
  requestedQuantity: number
  requirements: Record<string, unknown>
  /** If true, create as DRAFT then immediately SUBMITTED */
  submit?: boolean
}

export interface UpdateDraftDemandInput {
  expectedDate?: string | null
  priority?: DemandPriority
  reason?: string | null
  mediaId?: string
  productId?: string | null
  requestedQuantity?: number
  requirements?: Record<string, unknown>
  /** If true, submit after update */
  submit?: boolean
}

export interface AllocateDemandInput {
  demandItemId: string
  accountIds: string[]
  allocatedBy: string
  memberId: string
  managerId: string
  reason?: string | null
  /** AppUser id — must pass canAllocateAccounts (not TEAM_MEMBER). */
  actorUserId: string
}

export interface CancelDemandResult {
  demand: AccountDemand
  autoRecycledAccountIds: string[]
  pendingManualAccountIds: string[]
}

export interface AllocateDemandResult {
  demand: AccountDemand
  allocationIds: string[]
  assignmentIds: string[]
}

export interface SchedulingDemandItemRow {
  itemId: string
  demandId: string
  demandNo: string
  teamId: string
  status: AccountDemandStatus
  priority: DemandPriority
  expectedDate?: string | null
  mediaId: string
  productId?: string | null
  timezone: string | null
  requestedQuantity: number
  approvedQuantity: number
  allocatedQuantity: number
  remainingQuantity: number
  poolMatchCount: number
  shortage: number
}

export interface CreateChannelAccountOrderInput {
  channelId: string
  mediaId: string
  requestedQuantity: number
  externalOrderNo: string
  relatedDemandItemId: string
  timezone?: string | null
  requirements?: Record<string, unknown>
  /** If true, create as DRAFT; otherwise PENDING */
  asDraft?: boolean
}

export interface DeliveredAccountInput {
  externalAccountId: string
  name?: string | null
  timezone?: string | null
  platformAssetId?: string | null
  /** Override Demand product for this row; null keeps order Demand product. */
  productId?: string | null
  /** Account-level spend cap. */
  spendLimit?: number | null
}

export interface ConfirmChannelAccountDeliveryInput {
  orderId: string
  accounts: DeliveredAccountInput[]
  /** Operator member id → recorded as 户管 at intake. */
  actorMemberId?: string | null
}

export interface ConfirmChannelAccountDeliveryResult {
  order: ChannelAccountOrder
  accountIds: string[]
  accounts: AdAccount[]
}

export interface SubmitMockDeliveryReplyResult {
  order: ChannelAccountOrder
  draft: DeliveryParseDraft | null
  validation: DeliveryValidationResult
}

export interface ConfirmDeliveryFromDraftResult {
  order: ChannelAccountOrder
  accountIds: string[]
  accounts: AdAccount[]
  draft: DeliveryParseDraft
}

export interface SimulatePartialReminderResult {
  order: ChannelAccountOrder
  message: string
}

export interface DemandService {
  getDemands(query?: DemandQuery): Promise<PagedResponse<AccountDemand>>
  getDemandById(id: string): Promise<AccountDemand | null>
  getDemandItems(demandId: string): Promise<AccountDemandItem[]>
  getDemandAllocations(demandItemId?: string): Promise<AccountDemandAllocation[]>
  getChannelAccountOrders(query?: ChannelAccountOrderQuery): Promise<PagedResponse<ChannelAccountOrder>>
  createDemand(input: CreateAccountDemandInput): Promise<AccountDemand>
  submitDemand(id: string): Promise<AccountDemand | null>
  approveDemand(id: string, actorMemberId: string): Promise<AccountDemand>
  rejectDemand(id: string, actorMemberId: string): Promise<AccountDemand>
  cancelDemand(id: string): Promise<CancelDemandResult>
  confirmManualIdleRecycle(demandId: string): Promise<string[]>
  updateDraftDemand(id: string, input: UpdateDraftDemandInput): Promise<AccountDemand | null>
  /** Open items for scheduling workbench with pool match counts. */
  getSchedulingDemandItems(): Promise<SchedulingDemandItemRow[]>
  /** Allocation Source: DEMAND */
  allocate(input: AllocateDemandInput): Promise<AllocateDemandResult>
  createChannelAccountOrder(input: CreateChannelAccountOrderInput): Promise<ChannelAccountOrder>
  submitChannelAccountOrder(id: string): Promise<ChannelAccountOrder>
  /** @deprecated Prefer sendMockInquiry + acceptMockInquiry (Phase 18). */
  startProcessingChannelAccountOrder(id: string): Promise<ChannelAccountOrder>
  confirmChannelAccountDelivery(
    input: ConfirmChannelAccountDeliveryInput
  ): Promise<ConfirmChannelAccountDeliveryResult>
  cancelChannelAccountOrder(id: string): Promise<ChannelAccountOrder>
  setPartialReminderTime(id: string, time: string | null): Promise<ChannelAccountOrder>

  // —— Phase 18 Mock Telegram ——
  sendMockInquiry(orderId: string): Promise<ChannelAccountOrder>
  acceptMockInquiry(orderId: string, actor?: string): Promise<ChannelAccountOrder>
  rejectMockInquiry(orderId: string, reason: ChannelOrderRejectReason): Promise<ChannelAccountOrder>
  timeoutMockInquiry(orderId: string): Promise<ChannelAccountOrder>
  getMockInquiry(orderId: string): Promise<MockTelegramInquiry | null>
  getDeliveryDraft(orderId: string): Promise<DeliveryParseDraft | null>
  submitMockDeliveryReply(
    orderId: string,
    rawText: string,
    replyToMessageId?: string | null
  ): Promise<SubmitMockDeliveryReplyResult>
  confirmDeliveryFromDraft(
    orderId: string,
    actorMemberId?: string | null
  ): Promise<ConfirmDeliveryFromDraftResult>
  closePartialOrder(orderId: string, reason?: string | null): Promise<ChannelAccountOrder>
  simulatePartialReminder(orderId: string): Promise<SimulatePartialReminderResult>
}
