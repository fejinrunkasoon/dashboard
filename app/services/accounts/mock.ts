import type {
  AccountPoolStats,
  AccountQuery,
  AccountRelationHistory,
  AccountStats,
  AccountTimelineEvent,
  AdAccountListItem,
  LastSpendPreset,
  NamedRef
} from '../../domain/account'
import { paginate } from '../../domain/common'
import {
  accountApiAccess,
  accountAssignments,
  accountChannelAssignments,
  accountManagerAssignments,
  accountPlatformAssetAssignments,
  accountProductAssignments,
  accountServiceFeePolicyAssignments,
  accounts,
  channels,
  customers,
  mediaPlatforms,
  members,
  platformAssetTypes,
  platformAssets,
  products,
  serviceFeePolicies,
  teams
} from '../../mocks/entities'
import { accountSpendDaily } from '../../mocks/spend-daily'
import {
  MOCK_TODAY,
  aggregateSpendMetrics,
  aggregateSpendWindow,
  parseDate,
  shiftDate
} from '../../utils/spend-aggregation'
import type {
  AccountService,
  AssignDirectInput,
  AssignDirectResult,
  ChangeFeePolicyInput,
  ChangeFeePolicyResult,
  ChangeManagerInput,
  ChangeManagerResult,
  ChangeProductInput,
  ChangeProductResult,
  DisableAccountInput,
  DisableAccountResult,
  RecycleAccountInput,
  RecycleAccountResult,
  TransferAccountInput,
  TransferAccountResult
} from './types'
import { isInAccountPool } from './pool-eligibility'

function assertNotDisabled(accountId: string, accountAssetStatus: string) {
  if (accountAssetStatus === 'DISABLED') {
    throw new Error(`Account ${accountId} is DISABLED and cannot be modified`)
  }
}

function writeTimestamp() {
  return `${MOCK_TODAY}T12:00:00.000Z`
}

function currentOf<T extends { accountId: string, endedAt?: string | null }>(
  rows: T[],
  accountId: string
): T | undefined {
  return rows.find(item => item.accountId === accountId && item.endedAt == null)
}

function named(id: string, code: string | undefined, name: string): NamedRef {
  return { id, code, name }
}

function buildListItem(accountId: string): AdAccountListItem | null {
  const account = accounts.find(item => item.id === accountId)
  if (!account) return null

  const media = mediaPlatforms.find(item => item.id === account.mediaId)
  const channel = channels.find(item => item.id === account.sourceChannelId)
  if (!media || !channel) return null

  const assignment = currentOf(accountAssignments, account.id)
  const managerAssignment = currentOf(accountManagerAssignments, account.id)
  const productAssignment = currentOf(accountProductAssignments, account.id)
  const assetAssignment = currentOf(accountPlatformAssetAssignments, account.id)

  const team = assignment ? teams.find(item => item.id === assignment.teamId) : null
  const member = assignment?.memberId
    ? members.find(item => item.id === assignment.memberId)
    : null
  const manager = managerAssignment
    ? members.find(item => item.id === managerAssignment.managerMemberId)
    : null
  const product = productAssignment
    ? products.find(item => item.id === productAssignment.productId)
    : null
  const customer = product?.customerId
    ? customers.find(item => item.id === product.customerId)
    : null
  const platformAsset = assetAssignment
    ? platformAssets.find(item => item.id === assetAssignment.platformAssetId)
    : null
  const assetType = platformAsset
    ? platformAssetTypes.find(item => item.id === platformAsset.typeId)
    : null
  const policy = account.serviceFeePolicyId
    ? serviceFeePolicies.find(item => item.id === account.serviceFeePolicyId)
    : null

  const spendRows = accountSpendDaily.filter(row => row.accountId === account.id)
  const metrics = aggregateSpendMetrics(account.id, account.spendLimit, spendRows)

  return {
    id: account.id,
    externalAccountId: account.externalAccountId,
    accountName: account.name ?? null,
    media: named(media.id, media.code, media.name),
    channel: named(channel.id, channel.code, channel.name),
    platformAsset: platformAsset && assetType
      ? {
          id: platformAsset.id,
          externalId: platformAsset.externalId,
          name: platformAsset.name ?? null,
          typeName: assetType.name
        }
      : null,
    timezone: account.timezone ?? null,
    serviceFeePolicy: policy ? named(policy.id, policy.code, policy.name) : null,
    product: product
      ? {
          id: product.id,
          name: product.name,
          ownershipType: product.ownershipType
        }
      : null,
    customer: customer ? named(customer.id, customer.code, customer.name) : null,
    team: team ? named(team.id, team.code, team.name) : null,
    member: member ? named(member.id, member.code, member.name) : null,
    manager: manager ? named(manager.id, manager.code, manager.name) : null,
    assetStatus: account.assetStatus,
    mediaStatus: account.mediaStatus,
    apiAccessStatus: accountApiAccess[account.id] ?? 'UNKNOWN',
    spendLimit: account.spendLimit ?? null,
    amountSpent: metrics.amountSpent,
    remainingLimit: metrics.remainingLimit ?? null,
    todaySpend: metrics.todaySpend,
    spend7d: metrics.spend7d,
    spend30d: metrics.spend30d,
    lastSpendAt: metrics.lastSpendAt ?? null,
    receivedAt: account.receivedAt ?? null,
    note: account.note ?? null
  }
}

function matchesLastSpendPreset(lastSpendAt: string | null, preset: LastSpendPreset): boolean {
  const lastDate = lastSpendAt?.slice(0, 10) ?? null
  if (preset === 'TODAY') return lastDate === MOCK_TODAY
  if (preset === 'LAST_7D') {
    if (!lastDate) return false
    return lastDate >= shiftDate(MOCK_TODAY, -6) && lastDate <= MOCK_TODAY
  }
  // No positive spend on MOCK_TODAY (calendar-day approximation of 24h).
  if (preset === 'NO_SPEND_24H') return !lastDate || lastDate < MOCK_TODAY
  // No positive spend on today or yesterday.
  if (preset === 'NO_SPEND_48H') return !lastDate || lastDate < shiftDate(MOCK_TODAY, -1)
  return true
}

function applyQuery(items: AdAccountListItem[], query: AccountQuery): AdAccountListItem[] {
  let rows = [...items]

  if (query.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    rows = rows.filter(item =>
      item.id.toLowerCase().includes(q)
      || item.externalAccountId.toLowerCase().includes(q)
      || (item.accountName ?? '').toLowerCase().includes(q)
      || (item.platformAsset?.externalId ?? '').toLowerCase().includes(q)
      || (item.platformAsset?.name ?? '').toLowerCase().includes(q)
    )
  }

  if (query.mediaIds?.length) {
    rows = rows.filter(item => query.mediaIds!.includes(item.media.id))
  }
  if (query.channelIds?.length) {
    rows = rows.filter(item => query.channelIds!.includes(item.channel.id))
  }
  if (query.platformAssetIds?.length) {
    rows = rows.filter(item =>
      item.platformAsset != null && query.platformAssetIds!.includes(item.platformAsset.id)
    )
  }
  if (query.timezone) {
    rows = rows.filter(item => item.timezone === query.timezone)
  }
  if (query.teamIds?.length) {
    rows = rows.filter(item => item.team != null && query.teamIds!.includes(item.team.id))
  }
  if (query.memberIds?.length) {
    rows = rows.filter(item => item.member != null && query.memberIds!.includes(item.member.id))
  }
  if (query.managerIds?.length) {
    rows = rows.filter(item => item.manager != null && query.managerIds!.includes(item.manager.id))
  }
  if (query.productOwnership) {
    rows = rows.filter(item => item.product?.ownershipType === query.productOwnership)
  }
  if (query.productIds?.length) {
    rows = rows.filter(item => item.product != null && query.productIds!.includes(item.product.id))
  }
  if (query.customerIds?.length) {
    rows = rows.filter(item =>
      item.customer != null && query.customerIds!.includes(item.customer.id)
    )
  }
  if (query.serviceFeePolicyIds?.length) {
    rows = rows.filter(item =>
      item.serviceFeePolicy != null
      && query.serviceFeePolicyIds!.includes(item.serviceFeePolicy.id)
    )
  }
  if (query.assetStatuses?.length) {
    rows = rows.filter(item => query.assetStatuses!.includes(item.assetStatus))
  }
  if (query.mediaStatuses?.length) {
    rows = rows.filter(item => query.mediaStatuses!.includes(item.mediaStatus))
  }
  if (query.apiAccessStatuses?.length) {
    rows = rows.filter(item => query.apiAccessStatuses!.includes(item.apiAccessStatus))
  }

  if (query.spendLimitMin != null) {
    rows = rows.filter(item => item.spendLimit != null && item.spendLimit >= query.spendLimitMin!)
  }
  if (query.spendLimitMax != null) {
    rows = rows.filter(item => item.spendLimit != null && item.spendLimit <= query.spendLimitMax!)
  }
  if (query.amountSpentMin != null) {
    rows = rows.filter(item => item.amountSpent >= query.amountSpentMin!)
  }
  if (query.amountSpentMax != null) {
    rows = rows.filter(item => item.amountSpent <= query.amountSpentMax!)
  }
  if (query.remainingLimitMin != null) {
    rows = rows.filter(item =>
      item.remainingLimit != null && item.remainingLimit >= query.remainingLimitMin!
    )
  }
  if (query.remainingLimitMax != null) {
    rows = rows.filter(item =>
      item.remainingLimit != null && item.remainingLimit <= query.remainingLimitMax!
    )
  }

  if (query.spendRange) {
    rows = rows.map((item) => {
      const spendRows = accountSpendDaily.filter(row => row.accountId === item.id)
      const window = aggregateSpendWindow(item.id, spendRows, query.spendRange!)
      return { ...item, selectedPeriodSpend: window.spend }
    })

    if (query.periodSpendMin != null) {
      rows = rows.filter(item => (item.selectedPeriodSpend ?? 0) >= query.periodSpendMin!)
    }
    if (query.periodSpendMax != null) {
      rows = rows.filter(item => (item.selectedPeriodSpend ?? 0) <= query.periodSpendMax!)
    }
  }

  if (query.lastSpendPreset) {
    rows = rows.filter(item => matchesLastSpendPreset(item.lastSpendAt, query.lastSpendPreset!))
  }

  if (query.hasNote === true) {
    rows = rows.filter(item => Boolean(item.note?.trim()))
  } else if (query.hasNote === false) {
    rows = rows.filter(item => !item.note?.trim())
  }

  if (query.receivedFrom) {
    rows = rows.filter(item => item.receivedAt != null && item.receivedAt >= query.receivedFrom!)
  }
  if (query.receivedTo) {
    rows = rows.filter(item => item.receivedAt != null && item.receivedAt <= query.receivedTo!)
  }

  const sortBy = query.sortBy ?? 'externalAccountId'
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1
  rows.sort((a, b) => {
    const left = readSortValue(a, sortBy)
    const right = readSortValue(b, sortBy)
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * sortOrder
    }
    return String(left).localeCompare(String(right)) * sortOrder
  })

  return rows
}

function readSortValue(item: AdAccountListItem, sortBy: string): string | number | null {
  switch (sortBy) {
    case 'externalAccountId':
      return item.externalAccountId
    case 'accountName':
      return item.accountName
    case 'amountSpent':
      return item.amountSpent
    case 'todaySpend':
      return item.todaySpend
    case 'spend7d':
      return item.spend7d
    case 'spend30d':
      return item.spend30d
    case 'remainingLimit':
      return item.remainingLimit
    case 'spendLimit':
      return item.spendLimit
    case 'receivedAt':
      return item.receivedAt
    case 'lastSpendAt':
      return item.lastSpendAt
    case 'assetStatus':
      return item.assetStatus
    default:
      return item.externalAccountId
  }
}

function toStats(items: AdAccountListItem[]): AccountStats {
  return {
    total: items.length,
    available: items.filter(item => item.assetStatus === 'AVAILABLE').length,
    assigned: items.filter(item => item.assetStatus === 'ASSIGNED').length,
    inUse: items.filter(item => item.assetStatus === 'IN_USE').length,
    idle: items.filter(item => item.assetStatus === 'IDLE').length,
    disabled: items.filter(item => item.assetStatus === 'DISABLED').length,
    archived: items.filter(item => item.assetStatus === 'ARCHIVED').length,
    mediaBanned: items.filter(item => item.mediaStatus === 'BANNED').length,
    withNote: items.filter(item => Boolean(item.note?.trim())).length
  }
}

function allListItems(): AdAccountListItem[] {
  return accounts
    .map(item => buildListItem(item.id))
    .filter((item): item is AdAccountListItem => item != null)
}

function memberName(id?: string | null): string {
  if (!id) return '—'
  return members.find(item => item.id === id)?.name ?? id
}

function teamName(id: string): string {
  return teams.find(item => item.id === id)?.name ?? id
}

function productName(id: string): string {
  return products.find(item => item.id === id)?.name ?? id
}

function platformAssetLabel(id: string): string {
  const asset = platformAssets.find(item => item.id === id)
  if (!asset) return id
  const type = platformAssetTypes.find(item => item.id === asset.typeId)
  return `${type?.name ?? 'Asset'} ${asset.externalId}`
}

function channelName(id: string): string {
  return channels.find(item => item.id === id)?.name ?? id
}

function policyName(id: string): string {
  return serviceFeePolicies.find(item => item.id === id)?.name ?? id
}

function buildRelationHistory(accountId: string): AccountRelationHistory {
  const byAccount = <T extends { accountId: string }>(rows: T[]) =>
    rows
      .filter(item => item.accountId === accountId)
      .sort((a, b) => {
        const aStart = 'startedAt' in a ? String((a as { startedAt: string }).startedAt) : ''
        const bStart = 'startedAt' in b ? String((b as { startedAt: string }).startedAt) : ''
        return aStart.localeCompare(bStart)
      })

  return {
    assignments: byAccount(accountAssignments),
    managers: byAccount(accountManagerAssignments),
    products: byAccount(accountProductAssignments),
    platformAssets: byAccount(accountPlatformAssetAssignments),
    channels: byAccount(accountChannelAssignments),
    feePolicies: byAccount(accountServiceFeePolicyAssignments)
  }
}

function usageDays(receivedAt: string | null | undefined, today = MOCK_TODAY): number | null {
  if (!receivedAt) return null
  const start = parseDate(receivedAt.slice(0, 10)).getTime()
  const end = parseDate(today).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.floor((end - start) / 86_400_000) + 1
}

function buildTimeline(accountId: string): AccountTimelineEvent[] {
  const account = accounts.find(item => item.id === accountId)
  if (!account) return []

  const events: AccountTimelineEvent[] = []
  const history = buildRelationHistory(accountId)

  if (account.receivedAt) {
    events.push({
      id: `tl-import-${accountId}`,
      accountId,
      type: 'IMPORTED',
      at: `${account.receivedAt}T00:00:00.000Z`,
      title: '账户入库',
      description: `渠道 ${channelName(account.sourceChannelId)} 交户入库`,
      actor: null
    })
  }

  history.assignments.forEach((row, index) => {
    const team = teamName(row.teamId)
    const member = memberName(row.memberId)
    const isTransfer = /transfer/i.test(row.reason ?? '') || index > 0
    events.push({
      id: `tl-asg-${row.id}`,
      accountId,
      type: isTransfer ? 'TRANSFERRED' : 'ASSIGNED',
      at: row.startedAt,
      title: isTransfer ? '使用权划转' : '分配到团队',
      description: `${team}${member !== '—' ? ` / ${member}` : ''}${row.reason ? ` · ${row.reason}` : ''}`,
      actor: row.createdBy ? memberName(row.createdBy) : null
    })
    // RECYCLED when ended without same-timestamp continuation.
    // Disable also ends without continuation — skip RECYCLED if this end is the
    // terminal disable (DISABLED + no later assignment after endedAt).
    if (row.endedAt) {
      const continued = history.assignments.some(
        other => other.id !== row.id && other.startedAt === row.endedAt
      )
      if (!continued) {
        const laterAssignment = history.assignments.some(
          other => other.startedAt > row.endedAt!
        )
        const isTerminalDisable = account.assetStatus === 'DISABLED' && !laterAssignment
        if (!isTerminalDisable) {
          events.push({
            id: `tl-recycle-${row.id}`,
            accountId,
            type: 'RECYCLED',
            at: row.endedAt,
            title: '账户回收',
            description: row.reason ?? '回收至账户池',
            actor: row.createdBy ? memberName(row.createdBy) : null
          })
        }
      }
    }
  })

  history.managers.forEach((row) => {
    events.push({
      id: `tl-mgr-${row.id}`,
      accountId,
      type: 'MANAGER_CHANGED',
      at: row.startedAt,
      title: '户管变更',
      description: `${memberName(row.managerMemberId)}${row.reason ? ` · ${row.reason}` : ''}`,
      actor: row.createdBy ? memberName(row.createdBy) : null
    })
  })

  history.products.forEach((row) => {
    events.push({
      id: `tl-prd-${row.id}`,
      accountId,
      type: 'PRODUCT_CHANGED',
      at: row.startedAt,
      title: '产品变更',
      description: `${productName(row.productId)}${row.reason ? ` · ${row.reason}` : ''}`,
      actor: row.createdBy ? memberName(row.createdBy) : null
    })
  })

  history.platformAssets.forEach((row) => {
    events.push({
      id: `tl-pa-${row.id}`,
      accountId,
      type: 'PLATFORM_ASSET_CHANGED',
      at: row.startedAt,
      title: '管理资产变更',
      description: `${platformAssetLabel(row.platformAssetId)}${row.reason ? ` · ${row.reason}` : ''}`,
      actor: row.createdBy ? memberName(row.createdBy) : null
    })
  })

  history.channels.forEach((row, index) => {
    if (index === 0) return
    events.push({
      id: `tl-ch-${row.id}`,
      accountId,
      type: 'CHANNEL_CHANGED',
      at: row.startedAt,
      title: '渠道归属变更',
      description: `${channelName(row.channelId)}${row.reason ? ` · ${row.reason}` : ''}`,
      actor: null
    })
  })

  history.feePolicies.forEach((row, index) => {
    if (index === 0 && !row.endedAt) {
      events.push({
        id: `tl-fee-${row.id}`,
        accountId,
        type: 'FEE_POLICY_CHANGED',
        at: row.startedAt,
        title: '服务费政策绑定',
        description: policyName(row.policyId),
        actor: null
      })
      return
    }
    events.push({
      id: `tl-fee-${row.id}`,
      accountId,
      type: 'FEE_POLICY_CHANGED',
      at: row.startedAt,
      title: '服务费政策变更',
      description: policyName(row.policyId),
      actor: null
    })
  })

  if (account.assetStatus === 'DISABLED' || account.mediaStatus === 'BANNED') {
    events.push({
      id: `tl-status-${accountId}`,
      accountId,
      type: account.assetStatus === 'DISABLED' ? 'DISABLED' : 'STATUS_CHANGED',
      at: account.updatedAt,
      title: account.assetStatus === 'DISABLED' ? '账户停用' : '状态异常',
      description: `资产 ${account.assetStatus} · 媒体 ${account.mediaStatus}`,
      actor: null
    })
  }

  return events.sort((a, b) => b.at.localeCompare(a.at))
}

export const accountService: AccountService = {
  async getAccounts(query: AccountQuery = {}) {
    const filtered = applyQuery(allListItems(), query)
    return paginate(filtered, query.page, query.pageSize)
  },

  async getAccountStats(query: AccountQuery = {}) {
    const filtered = applyQuery(allListItems(), query)
    return toStats(filtered)
  },

  async getAccountById(id) {
    return buildListItem(id)
  },

  async getAccountEntity(id) {
    return accounts.find(item => item.id === id) ?? null
  },

  async getAccountRelationHistory(accountId) {
    if (!accounts.some(item => item.id === accountId)) return null
    return buildRelationHistory(accountId)
  },

  async getAccountAssignments(accountId) {
    return buildRelationHistory(accountId).assignments
  },

  async getAccountManagerHistory(accountId) {
    return buildRelationHistory(accountId).managers
  },

  async getAccountProductHistory(accountId) {
    return buildRelationHistory(accountId).products
  },

  async getAccountPlatformAssetHistory(accountId) {
    return buildRelationHistory(accountId).platformAssets
  },

  async getAccountChannelHistory(accountId) {
    return buildRelationHistory(accountId).channels
  },

  async getAccountFeePolicyHistory(accountId) {
    return buildRelationHistory(accountId).feePolicies
  },

  async getAccountTimeline(accountId) {
    return buildTimeline(accountId)
  },

  async getAccountDetail(accountId) {
    const account = buildListItem(accountId)
    const entity = accounts.find(item => item.id === accountId)
    if (!account || !entity) return null
    return {
      account,
      entity,
      history: buildRelationHistory(accountId),
      timeline: buildTimeline(accountId),
      usageDays: usageDays(account.receivedAt)
    }
  },

  async getAccountPool(query: AccountQuery = {}) {
    const poolItems = allListItems().filter(item => isInAccountPool(item.id))
    const { assetStatuses: _ignored, ...rest } = query
    const filtered = applyQuery(poolItems, rest)
    return paginate(filtered, query.page, query.pageSize)
  },

  async getAccountPoolStats(query: AccountQuery = {}) {
    const poolItems = allListItems().filter(item => isInAccountPool(item.id))
    const { assetStatuses: _ignored, ...rest } = query
    const filtered = applyQuery(poolItems, { ...rest, page: undefined, pageSize: undefined })
    const byMedia: Record<string, number> = {}
    for (const item of filtered) {
      byMedia[item.media.id] = (byMedia[item.media.id] ?? 0) + 1
    }
    return { total: filtered.length, byMedia } satisfies AccountPoolStats
  },

  async assignDirect(input: AssignDirectInput): Promise<AssignDirectResult> {
    if (!input.teamId) throw new Error('teamId is required')
    if (!input.accountIds?.length) throw new Error('accountIds is required')
    if (!teams.some(item => item.id === input.teamId)) {
      throw new Error(`Unknown team: ${input.teamId}`)
    }
    if (input.memberId) {
      const member = members.find(item => item.id === input.memberId)
      if (!member || member.teamId !== input.teamId) {
        throw new Error('memberId must belong to the target team')
      }
    }

    const uniqueIds = [...new Set(input.accountIds)]
    const assignmentIds: string[] = []
    const ts = writeTimestamp()

    for (const accountId of uniqueIds) {
      const account = accounts.find(item => item.id === accountId)
      if (!account) throw new Error(`Unknown account: ${accountId}`)
      assertNotDisabled(accountId, account.assetStatus)
      if (!isInAccountPool(accountId)) {
        throw new Error(`Account ${accountId} is not in the allocatable pool`)
      }

      const assignmentId = `asg-direct-${accountId}-${accountAssignments.length + 1}`
      accountAssignments.push({
        id: assignmentId,
        accountId,
        teamId: input.teamId,
        memberId: input.memberId ?? null,
        startedAt: ts,
        endedAt: null,
        reason: input.reason?.trim() || 'Direct assign from pool',
        createdBy: input.createdBy
      })
      account.assetStatus = 'ASSIGNED'
      account.updatedAt = ts
      assignmentIds.push(assignmentId)
    }

    return { assignmentIds, teamId: input.teamId }
  },

  async transferAccount(input: TransferAccountInput): Promise<TransferAccountResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.teamId) throw new Error('teamId is required')
    if (!input.reason?.trim()) throw new Error('reason is required')
    if (!teams.some(item => item.id === input.teamId)) {
      throw new Error(`Unknown team: ${input.teamId}`)
    }
    if (input.memberId) {
      const member = members.find(item => item.id === input.memberId)
      if (!member || member.teamId !== input.teamId) {
        throw new Error('memberId must belong to the target team')
      }
    }

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    assertNotDisabled(input.accountId, account.assetStatus)

    const current = currentOf(accountAssignments, input.accountId)
    if (!current) {
      throw new Error(`Account ${input.accountId} has no current assignment to transfer`)
    }

    const ts = writeTimestamp()
    const endedAssignmentId = current.id
    current.endedAt = ts

    const assignmentId = `asg-xfer-${input.accountId}-${accountAssignments.length + 1}`
    accountAssignments.push({
      id: assignmentId,
      accountId: input.accountId,
      teamId: input.teamId,
      memberId: input.memberId ?? null,
      startedAt: ts,
      endedAt: null,
      reason: input.reason.trim(),
      createdBy: input.createdBy
    })
    account.assetStatus = 'ASSIGNED'
    account.updatedAt = ts

    return { assignmentId, endedAssignmentId }
  },

  async recycleAccount(input: RecycleAccountInput): Promise<RecycleAccountResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.reason?.trim()) throw new Error('reason is required')

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    assertNotDisabled(input.accountId, account.assetStatus)

    const current = currentOf(accountAssignments, input.accountId)
    if (!current) {
      throw new Error(`Account ${input.accountId} has no current assignment to recycle`)
    }

    const ts = writeTimestamp()
    const endedAssignmentId = current.id
    current.endedAt = ts
    current.reason = input.reason.trim()
    current.createdBy = input.createdBy
    account.assetStatus = 'AVAILABLE'
    account.updatedAt = ts

    return { endedAssignmentId }
  },

  async disableAccount(input: DisableAccountInput): Promise<DisableAccountResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.reason?.trim()) throw new Error('reason is required')

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    if (account.assetStatus === 'DISABLED') {
      throw new Error(`Account ${input.accountId} is already DISABLED`)
    }

    const ts = writeTimestamp()
    const current = currentOf(accountAssignments, input.accountId)
    let endedAssignmentId: string | null = null
    if (current) {
      endedAssignmentId = current.id
      current.endedAt = ts
      current.reason = input.reason.trim()
      current.createdBy = input.createdBy
    }
    account.assetStatus = 'DISABLED'
    account.updatedAt = ts

    return { accountId: input.accountId, endedAssignmentId }
  },

  async changeProduct(input: ChangeProductInput): Promise<ChangeProductResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.productId) throw new Error('productId is required')
    if (!products.some(item => item.id === input.productId)) {
      throw new Error(`Unknown product: ${input.productId}`)
    }

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    assertNotDisabled(input.accountId, account.assetStatus)

    const ts = writeTimestamp()
    const current = currentOf(accountProductAssignments, input.accountId)
    if (current) current.endedAt = ts

    const productAssignmentId = `apa-${input.accountId}-${accountProductAssignments.length + 1}`
    accountProductAssignments.push({
      id: productAssignmentId,
      accountId: input.accountId,
      productId: input.productId,
      startedAt: ts,
      endedAt: null,
      reason: input.reason?.trim() || null,
      createdBy: input.createdBy
    })
    account.updatedAt = ts

    return { productAssignmentId }
  },

  async changeManager(input: ChangeManagerInput): Promise<ChangeManagerResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.managerMemberId) throw new Error('managerMemberId is required')
    if (!members.some(item => item.id === input.managerMemberId)) {
      throw new Error(`Unknown manager: ${input.managerMemberId}`)
    }

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    assertNotDisabled(input.accountId, account.assetStatus)

    const ts = writeTimestamp()
    const current = currentOf(accountManagerAssignments, input.accountId)
    if (current) current.endedAt = ts

    const managerAssignmentId = `ama-${input.accountId}-${accountManagerAssignments.length + 1}`
    accountManagerAssignments.push({
      id: managerAssignmentId,
      accountId: input.accountId,
      managerMemberId: input.managerMemberId,
      startedAt: ts,
      endedAt: null,
      reason: input.reason?.trim() || null,
      createdBy: input.createdBy
    })
    account.updatedAt = ts

    return { managerAssignmentId }
  },

  async changeFeePolicy(input: ChangeFeePolicyInput): Promise<ChangeFeePolicyResult> {
    if (!input.accountId) throw new Error('accountId is required')
    if (!input.policyId) throw new Error('policyId is required')
    if (!input.createdBy) throw new Error('createdBy is required')

    const account = accounts.find(item => item.id === input.accountId)
    if (!account) throw new Error(`Unknown account: ${input.accountId}`)
    assertNotDisabled(input.accountId, account.assetStatus)

    const policy = serviceFeePolicies.find(item => item.id === input.policyId)
    if (!policy) throw new Error(`Unknown policy: ${input.policyId}`)
    if (policy.status !== 'ACTIVE') {
      throw new Error('Only ACTIVE policies can be bound to accounts')
    }
    if (policy.channelId !== account.sourceChannelId) {
      throw new Error('Policy must belong to the account source channel')
    }
    if (account.serviceFeePolicyId === input.policyId) {
      throw new Error('Account is already bound to this policy')
    }

    const ts = writeTimestamp()
    const current = currentOf(accountServiceFeePolicyAssignments, input.accountId)
    if (current) current.endedAt = ts

    const feePolicyAssignmentId = `sfpa-${input.accountId}-${accountServiceFeePolicyAssignments.length + 1}`
    accountServiceFeePolicyAssignments.push({
      id: feePolicyAssignmentId,
      accountId: input.accountId,
      policyId: input.policyId,
      startedAt: ts,
      endedAt: null
    })
    account.serviceFeePolicyId = input.policyId
    account.updatedAt = ts

    return { feePolicyAssignmentId }
  }
}
