export type Media = 'Meta' | 'Google' | 'TikTok'

export type ProductType = 'internal' | 'external'

export type AssetStatus = 'pending' | 'allocated' | 'active' | 'idle' | 'abnormal' | 'banned' | 'disabled'

export type MediaStatus = 'normal' | 'restricted' | 'banned'

export type AlertPriority = 'urgent' | 'warning' | 'info'

export type AlertStatus = 'pending' | 'claimed' | 'processing' | 'resolved' | 'ignored'

export type AlertCategory = 'account' | 'team' | 'channel' | 'reconciliation' | 'system'

export type AllocationSource = 'demand' | 'direct'

export type DemandStatus = 'pending' | 'approved' | 'allocating' | 'completed' | 'rejected'

export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

export type ReconciliationStatus = 'pending' | 'confirmed' | 'disputed'

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface Channel {
  id: number
  name: string
  supportedMedia: Media[]
  contactInfo: string
  totalAccounts: number
  activeAccounts: number
  availableAccounts: number
  bannedAccounts: number
  banRate: number
  consumed: number
  totalPayment: number
  balance: number
  estimatedDays: number
  status: 'active' | 'disabled'
}

export interface AdAccount {
  id: string
  accountId: string
  accountName: string
  media: Media
  channelId: number
  channelName: string
  teamId: number | null
  teamName: string | null
  memberId: number | null
  memberName: string | null
  productId: number | null
  productName: string | null
  productType: ProductType | null
  assetStatus: AssetStatus
  mediaStatus: MediaStatus
  isAllocated: boolean
  consumed: number
  lastConsumedAt: string | null
  entryDate: string
  usageDays: number
}

export interface Team {
  id: number
  name: string
  leaderId: number
  leaderName: string
  memberCount: number
  totalAccounts: number
  activeAccounts: number
  idleAccounts: number
  usageRate: number
  consumed: number
  internalConsumed: number
  externalConsumed: number
  banRate: number
  pendingDemand: number
  unmetDemand: number
  estimatedGap: number
}

export interface TeamMember {
  id: number
  name: string
  teamId: number
  teamName: string
  totalAccounts: number
  activeAccounts: number
  idleAccounts: number
  usageRate: number
  consumedToday: number
  consumed7d: number
  consumed30d: number
  avgPerAccount: number
  internalConsumed: number
  externalConsumed: number
  bannedCount: number
  banRate: number
}

export interface Product {
  id: number
  name: string
  type: ProductType
  boundAccounts: number
  consumed: number
}

export interface Demand {
  id: string
  teamId: number
  teamName: string
  productNeed: string
  mediaNeed: Media
  requestCount: number
  approvedCount: number
  allocatedCount: number
  remaining: number
  submitDate: string
  priority: string
  expectedDate: string
  reason: string
  status: DemandStatus
}

export interface Alert {
  id: number
  type: string
  category: AlertCategory
  priority: AlertPriority
  status: AlertStatus
  title: string
  description: string
  relatedId: number
  relatedType: string
  relatedName: string
  handlerId: number | null
  handlerName: string | null
  handleResult: string | null
  triggeredAt: string
  handledAt: string | null
}

export interface Payment {
  id: number
  channelId: number
  channelName: string
  amount: number
  currency: string
  method: string
  paymentTime: string
  status: PaymentStatus
  receipt: string | null
}

export interface Reconciliation {
  id: number
  channelId: number
  channelName: string
  billingPeriod: string
  channelBill: number
  systemConsumption: number
  difference: number
  differenceRate: number
  status: ReconciliationStatus
  reason: string | null
}

export interface ConsumptionRecord {
  id: number
  accountId: string
  date: string
  amount: number
  media: Media
}

export interface AllocationHistory {
  id: number
  accountId: string
  fromTeamId: number | null
  fromTeamName: string | null
  toTeamId: number
  toTeamName: string
  fromMemberId: number | null
  fromMemberName: string | null
  toMemberId: number
  toMemberName: string
  productId: number | null
  productName: string | null
  source: AllocationSource
  operatorId: number
  operatorName: string
  reason: string
  timestamp: string
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface DashboardOverview {
  totalAccounts: number
  activeAccounts: number
  usageRate: number
  consumedToday: number
  consumed7d: number
  consumed30d: number
  bannedToday: number
  pendingAlerts: number
  internalConsumed: number
  externalConsumed: number
}

export interface AccountStructure {
  pending: number
  allocated: number
  active: number
  idle: number
  abnormal: number
  banned: number
  disabled: number
}