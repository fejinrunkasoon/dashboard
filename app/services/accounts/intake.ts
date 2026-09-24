import type { AdAccount } from '../../domain/account'
import type { ServiceFeePolicy } from '../../domain/finance'
import {
  accountApiAccess,
  accountChannelAssignments,
  accountManagerAssignments,
  accountPlatformAssetAssignments,
  accountProductAssignments,
  accountServiceFeePolicyAssignments,
  accounts,
  DEFAULT_ORGANIZATION_ID,
  members,
  platformAssets,
  products,
  serviceFeePolicies
} from '../../mocks/entities'
import { MOCK_TODAY } from '../../utils/spend-aggregation'

export type AccountIntakeSource = 'ORDER' | 'BATCH_IMPORT' | 'MEDIA_SYNC'

export interface AccountIntakeInput {
  mediaId: string
  externalAccountId: string
  /** Tenant scope — uniqueness is (organizationId, mediaId, externalAccountId). */
  organizationId?: string | null
  /** Optional for MEDIA_SYNC when channel unknown. */
  sourceChannelId?: string | null
  name?: string | null
  timezone?: string | null
  platformAssetId?: string | null
  /** Bind Demand / chosen product at intake (editable later). */
  productId?: string | null
  /** Operator who created the account → 户管. */
  managerMemberId?: string | null
  /** Explicit policy; otherwise channel default ACTIVE policy is used. */
  serviceFeePolicyId?: string | null
  /** Account-level spend cap; null = uncapped (still limited by shared pool). */
  spendLimit?: number | null
  createdByMemberId?: string | null
  note?: string | null
  intakeSource: AccountIntakeSource
  /** Override receivedAt date (YYYY-MM-DD); defaults to MOCK_TODAY. */
  receivedAt?: string | null
  /** Assignment reason / note prefix context. */
  reason?: string | null
  lastSyncAt?: string | null
  firstSeenAt?: string
}

export interface AccountIntakeResult {
  account: AdAccount
  created: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function nextAccountId(prefix: string): string {
  return `${prefix}-${String(accounts.length + 1).padStart(3, '0')}`
}

function idPrefix(source: AccountIntakeSource): string {
  if (source === 'ORDER') return 'acc-ord'
  if (source === 'BATCH_IMPORT') return 'acc-imp'
  return 'acc-sync'
}

function orgOf(account: AdAccount): string {
  return account.organizationId ?? DEFAULT_ORGANIZATION_ID
}

/** ACTIVE fee policy for a channel: earliest effectiveFrom, then code. */
export function resolveDefaultFeePolicy(channelId: string): ServiceFeePolicy | null {
  const rows = serviceFeePolicies
    .filter(item => item.channelId === channelId && item.status === 'ACTIVE')
    .slice()
    .sort((a, b) => {
      const af = a.effectiveFrom ?? ''
      const bf = b.effectiveFrom ?? ''
      if (af !== bf) return af.localeCompare(bf)
      return a.code.localeCompare(b.code)
    })
  return rows[0] ?? null
}

/**
 * Resolve platform asset by external id within media (+ optional channel).
 */
export function resolvePlatformAssetByExternalId(
  mediaId: string,
  externalId: string,
  channelId?: string | null
): string | null {
  const key = externalId.trim().toLowerCase()
  if (!key) return null
  const match = platformAssets.find((item) => {
    if (item.mediaId !== mediaId) return false
    if (item.externalId.toLowerCase() !== key) return false
    if (item.status !== 'ACTIVE') return false
    if (
      channelId
      && item.sourceChannelId
      && item.sourceChannelId !== channelId
    ) {
      return false
    }
    return true
  })
  return match?.id ?? null
}

/**
 * Shared account intake: create AVAILABLE AdAccount in pool.
 * Does NOT allocate to Team / Demand (Connection import path adds Team/User access separately).
 * Dedupes by (organizationId, mediaId, externalAccountId) — throws if already exists.
 */
export function intakeAdAccount(input: AccountIntakeInput): AccountIntakeResult {
  const externalAccountId = input.externalAccountId?.trim()
  if (!externalAccountId) throw new Error('externalAccountId is required')
  if (!input.mediaId) throw new Error('mediaId is required')
  if (input.intakeSource === 'ORDER' && !input.sourceChannelId) {
    throw new Error('sourceChannelId is required for order intake')
  }

  const organizationId = input.organizationId?.trim() || DEFAULT_ORGANIZATION_ID
  const key = externalAccountId.toLowerCase()
  const duplicate = accounts.find(
    item => orgOf(item) === organizationId
      && item.mediaId === input.mediaId
      && item.externalAccountId.toLowerCase() === key
  )
  if (duplicate) {
    throw new Error(`Account ${externalAccountId} already exists for this media`)
  }

  if (input.platformAssetId) {
    const asset = platformAssets.find(item => item.id === input.platformAssetId)
    if (!asset) throw new Error(`Unknown platform asset: ${input.platformAssetId}`)
    if (asset.mediaId !== input.mediaId) {
      throw new Error('Platform asset media does not match account media')
    }
    if (
      input.sourceChannelId
      && asset.sourceChannelId
      && asset.sourceChannelId !== input.sourceChannelId
    ) {
      throw new Error('Platform asset does not belong to this channel')
    }
  }

  const productId = input.productId?.trim() || null
  if (productId) {
    const product = products.find(item => item.id === productId)
    if (!product) throw new Error(`Unknown product: ${productId}`)
  }

  const managerMemberId = input.managerMemberId?.trim() || null
  if (managerMemberId && !members.some(item => item.id === managerMemberId)) {
    throw new Error(`Unknown manager: ${managerMemberId}`)
  }

  let serviceFeePolicyId = input.serviceFeePolicyId?.trim() || null
  if (!serviceFeePolicyId && input.sourceChannelId) {
    serviceFeePolicyId = resolveDefaultFeePolicy(input.sourceChannelId)?.id ?? null
  }
  if (serviceFeePolicyId) {
    const policy = serviceFeePolicies.find(item => item.id === serviceFeePolicyId)
    if (!policy) throw new Error(`Unknown policy: ${serviceFeePolicyId}`)
    if (policy.status !== 'ACTIVE') {
      throw new Error('Only ACTIVE policies can be bound to accounts')
    }
    if (input.sourceChannelId && policy.channelId !== input.sourceChannelId) {
      throw new Error('Policy must belong to the account source channel')
    }
  }

  const spendLimit
    = input.spendLimit != null && Number.isFinite(input.spendLimit) && input.spendLimit > 0
      ? input.spendLimit
      : null

  const ts = input.firstSeenAt ?? nowIso()
  const accountId = nextAccountId(idPrefix(input.intakeSource))
  const reason = input.reason?.trim()
    || (input.intakeSource === 'BATCH_IMPORT'
      ? 'Batch import'
      : input.intakeSource === 'MEDIA_SYNC'
        ? 'Media sync confirm'
        : 'Channel order delivery')
  const createdBy = input.createdByMemberId?.trim() || managerMemberId || null

  const lastSyncAt = input.lastSyncAt !== undefined
    ? input.lastSyncAt
    : (input.intakeSource === 'MEDIA_SYNC' ? ts : null)

  const account: AdAccount = {
    id: accountId,
    organizationId,
    externalAccountId,
    name: input.name?.trim() || null,
    mediaId: input.mediaId,
    sourceChannelId: input.sourceChannelId?.trim() || '',
    timezone: input.timezone?.trim() || null,
    spendLimit,
    serviceFeePolicyId,
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: input.note?.trim() || reason,
    receivedAt: input.receivedAt?.trim() || MOCK_TODAY,
    firstSeenAt: ts,
    lastSyncAt,
    createdAt: ts,
    updatedAt: ts
  }

  accounts.push(account)
  accountApiAccess[accountId] = 'ACCESSIBLE'

  if (input.sourceChannelId) {
    accountChannelAssignments.push({
      id: `cha-${accountId}`,
      accountId,
      channelId: input.sourceChannelId,
      startedAt: ts,
      endedAt: null,
      reason
    })
  }

  if (input.platformAssetId) {
    accountPlatformAssetAssignments.push({
      id: `apa-${accountId}`,
      accountId,
      platformAssetId: input.platformAssetId,
      startedAt: ts,
      endedAt: null,
      reason,
      createdBy
    })
  }

  if (serviceFeePolicyId) {
    accountServiceFeePolicyAssignments.push({
      id: `sfpa-${accountId}`,
      accountId,
      policyId: serviceFeePolicyId,
      startedAt: ts,
      endedAt: null
    })
  }

  if (productId) {
    accountProductAssignments.push({
      id: `prd-asg-${accountId}`,
      accountId,
      productId,
      startedAt: ts,
      endedAt: null,
      reason: `${reason} · product`,
      createdBy
    })
  }

  if (managerMemberId) {
    accountManagerAssignments.push({
      id: `ama-${accountId}`,
      accountId,
      managerMemberId,
      startedAt: ts,
      endedAt: null,
      reason: `${reason} · manager`,
      createdBy
    })
  }

  return { account: { ...account }, created: true }
}

/** Find existing account by media + external id (case-insensitive), optional org. */
export function findAccountByExternal(
  mediaId: string,
  externalAccountId: string,
  organizationId: string = DEFAULT_ORGANIZATION_ID
): AdAccount | undefined {
  const key = externalAccountId.trim().toLowerCase()
  return accounts.find(
    item => orgOf(item) === organizationId
      && item.mediaId === mediaId
      && item.externalAccountId.toLowerCase() === key
  )
}
