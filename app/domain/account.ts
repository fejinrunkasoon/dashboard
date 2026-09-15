import type {
  AccountAssetStatus,
  AccountMediaStatus,
  ApiAccessStatus,
  PaginationQuery,
  ProductOwnership,
  SortQuery,
  SpendDateRange
} from './common'

export interface AdAccount {
  id: string
  externalAccountId: string
  name?: string | null
  mediaId: string
  sourceChannelId: string
  timezone?: string | null
  spendLimit?: number | null
  serviceFeePolicyId?: string | null
  assetStatus: AccountAssetStatus
  mediaStatus: AccountMediaStatus
  note?: string | null
  receivedAt?: string | null
  firstSeenAt?: string | null
  lastSyncAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountAssignment {
  id: string
  accountId: string
  teamId: string
  memberId?: string | null
  startedAt: string
  endedAt?: string | null
  reason?: string | null
  createdBy?: string | null
}

export interface AccountManagerAssignment {
  id: string
  accountId: string
  managerMemberId: string
  startedAt: string
  endedAt?: string | null
  reason?: string | null
  createdBy?: string | null
}

export interface AccountProductAssignment {
  id: string
  accountId: string
  productId: string
  startedAt: string
  endedAt?: string | null
  reason?: string | null
  createdBy?: string | null
}

export interface AccountPlatformAssetAssignment {
  id: string
  accountId: string
  platformAssetId: string
  startedAt: string
  endedAt?: string | null
  reason?: string | null
  createdBy?: string | null
}

export interface AccountChannelAssignment {
  id: string
  accountId: string
  channelId: string
  startedAt: string
  endedAt?: string | null
  reason?: string | null
}

export interface AccountServiceFeePolicyAssignment {
  id: string
  accountId: string
  policyId: string
  startedAt: string
  endedAt?: string | null
}

export interface AccountSpendDaily {
  accountId: string
  date: string
  currency: string
  spend: number
}

export interface AccountSpendMetrics {
  accountId: string
  currency: string
  spendLimit?: number | null
  amountSpent: number
  remainingLimit?: number | null
  todaySpend: number
  spend7d: number
  spend30d: number
  lastSpendAt?: string | null
}

export interface AccountSpendWindow {
  accountId: string
  from: string
  to: string
  spend: number
  currency: string
}

export type LastSpendPreset =
  | 'TODAY'
  | 'LAST_7D'
  | 'NO_SPEND_24H'
  | 'NO_SPEND_48H'

export interface AccountQuery extends PaginationQuery, SortQuery {
  keyword?: string
  mediaIds?: string[]
  channelIds?: string[]
  platformAssetIds?: string[]
  timezone?: string
  teamIds?: string[]
  memberIds?: string[]
  managerIds?: string[]
  productOwnership?: ProductOwnership
  productIds?: string[]
  customerIds?: string[]
  serviceFeePolicyIds?: string[]
  assetStatuses?: AccountAssetStatus[]
  mediaStatuses?: AccountMediaStatus[]
  apiAccessStatuses?: ApiAccessStatus[]
  spendLimitMin?: number
  spendLimitMax?: number
  amountSpentMin?: number
  amountSpentMax?: number
  remainingLimitMin?: number
  remainingLimitMax?: number
  spendRange?: SpendDateRange
  periodSpendMin?: number
  periodSpendMax?: number
  lastSpendPreset?: LastSpendPreset
  hasNote?: boolean
  receivedFrom?: string
  receivedTo?: string
}

export interface NamedRef {
  id: string
  code?: string
  name: string
}

export interface PlatformAssetRef {
  id: string
  externalId: string
  name?: string | null
  typeName: string
}

export interface ProductRef {
  id: string
  name: string
  ownershipType: ProductOwnership
}

export interface AdAccountListItem {
  id: string
  externalAccountId: string
  accountName: string | null
  media: NamedRef
  channel: NamedRef
  platformAsset: PlatformAssetRef | null
  timezone: string | null
  serviceFeePolicy: NamedRef | null
  product: ProductRef | null
  customer: NamedRef | null
  team: NamedRef | null
  member: NamedRef | null
  manager: NamedRef | null
  assetStatus: AccountAssetStatus
  mediaStatus: AccountMediaStatus
  apiAccessStatus: ApiAccessStatus
  spendLimit: number | null
  amountSpent: number
  remainingLimit: number | null
  todaySpend: number
  spend7d: number
  spend30d: number
  selectedPeriodSpend?: number
  lastSpendAt: string | null
  receivedAt: string | null
  note: string | null
}

export interface AccountStats {
  total: number
  available: number
  assigned: number
  inUse: number
  idle: number
  disabled: number
  archived: number
  mediaBanned: number
  withNote: number
}
