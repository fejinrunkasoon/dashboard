export type ChannelAccountOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_CONFIRM'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TIMEOUT'
  | 'PROCESSING'
  | 'PARTIAL_DELIVERED'
  | 'DELIVERED'
  | 'PARTIAL_CLOSED'
  | 'PARSING_EXCEPTION'
  | 'QUANTITY_EXCEPTION'
  | 'CANCELLED'

export type ChannelOrderRejectReason =
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_QTY'
  | 'SPEC_MISMATCH'
  | 'PAUSE_SUPPLY'
  | 'OTHER'

export interface ChannelAccountOrder {
  id: string
  orderNo: string
  externalOrderNo: string
  channelId: string
  mediaId: string
  relatedDemandItemId: string
  requestedQuantity: number
  deliveredQuantity: number
  timezone?: string | null
  requirements: Record<string, unknown>
  status: ChannelAccountOrderStatus
  /** HH:mm reminder while partially delivered. No real cron — simulate via UI. */
  partialReminderTime?: string | null
  /** Mock Telegram inquiry message id (Reply must bind to this). */
  inquiryMessageId?: string | null
  acceptedAt?: string | null
  acceptedBy?: string | null
  rejectReason?: ChannelOrderRejectReason | null
  requestedAt: string
  completedAt?: string | null
}

export interface ChannelAccountOrderQuery {
  channelIds?: string[]
  mediaIds?: string[]
  statuses?: ChannelAccountOrderStatus[]
  keyword?: string
  timezone?: string
  /** NONE / PARTIAL / FULL vs requestedQuantity */
  deliveryProgress?: 'NONE' | 'PARTIAL' | 'FULL'
  page?: number
  pageSize?: number
}
