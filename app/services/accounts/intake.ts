import type { AdAccount } from '../../domain/account'
import {
  accountApiAccess,
  accountChannelAssignments,
  accountPlatformAssetAssignments,
  accounts,
  platformAssets
} from '../../mocks/entities'
import { MOCK_TODAY } from '../../utils/spend-aggregation'

export type AccountIntakeSource = 'ORDER' | 'BATCH_IMPORT' | 'MEDIA_SYNC'

export interface AccountIntakeInput {
  mediaId: string
  externalAccountId: string
  /** Optional for MEDIA_SYNC when channel unknown. */
  sourceChannelId?: string | null
  name?: string | null
  timezone?: string | null
  platformAssetId?: string | null
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

/**
 * Shared account intake: create AVAILABLE AdAccount in pool.
 * Does NOT allocate to Team / Demand.
 * Dedupes by (mediaId, externalAccountId) — throws if already exists.
 */
export function intakeAdAccount(input: AccountIntakeInput): AccountIntakeResult {
  const externalAccountId = input.externalAccountId?.trim()
  if (!externalAccountId) throw new Error('externalAccountId is required')
  if (!input.mediaId) throw new Error('mediaId is required')
  if (input.intakeSource === 'ORDER' && !input.sourceChannelId) {
    throw new Error('sourceChannelId is required for order intake')
  }

  const key = externalAccountId.toLowerCase()
  const duplicate = accounts.find(
    item => item.mediaId === input.mediaId
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

  const ts = input.firstSeenAt ?? nowIso()
  const accountId = nextAccountId(idPrefix(input.intakeSource))
  const reason = input.reason?.trim()
    || (input.intakeSource === 'BATCH_IMPORT'
      ? 'Batch import'
      : input.intakeSource === 'MEDIA_SYNC'
        ? 'Media sync confirm'
        : 'Channel order delivery')

  const lastSyncAt = input.lastSyncAt !== undefined
    ? input.lastSyncAt
    : (input.intakeSource === 'MEDIA_SYNC' ? ts : null)

  const account: AdAccount = {
    id: accountId,
    externalAccountId,
    name: input.name?.trim() || null,
    mediaId: input.mediaId,
    sourceChannelId: input.sourceChannelId?.trim() || '',
    timezone: input.timezone?.trim() || null,
    spendLimit: null,
    serviceFeePolicyId: null,
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
      createdBy: null
    })
  }

  return { account: { ...account }, created: true }
}

/** Find existing account by media + external id (case-insensitive). */
export function findAccountByExternal(
  mediaId: string,
  externalAccountId: string
): AdAccount | undefined {
  const key = externalAccountId.trim().toLowerCase()
  return accounts.find(
    item => item.mediaId === mediaId
      && item.externalAccountId.toLowerCase() === key
  )
}
