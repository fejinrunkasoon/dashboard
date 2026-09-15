export type ChannelAccountOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PROCESSING'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface ChannelAccountOrder {
  id: string
  orderNo: string
  channelId: string
  mediaId: string
  relatedDemandItemId?: string | null
  requestedQuantity: number
  deliveredQuantity: number
  timezone?: string | null
  requirements: Record<string, unknown>
  status: ChannelAccountOrderStatus
  requestedAt: string
  completedAt?: string | null
}

export interface ChannelAccountOrderQuery {
  channelIds?: string[]
  mediaIds?: string[]
  statuses?: ChannelAccountOrderStatus[]
  page?: number
  pageSize?: number
}
