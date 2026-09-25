import { paginate } from '../../domain/common'
import type { AdAccount } from '../../domain/account'
import type {
  AccountDemand,
  AccountDemandItem,
  AccountDemandStatus,
  DemandQuery
} from '../../domain/demand'
import type {
  ChannelAccountOrder,
  ChannelAccountOrderQuery,
  ChannelAccountOrderStatus,
  ChannelOrderRejectReason
} from '../../domain/channel-order'
import type {
  DeliveryParseDraft,
  DeliveryValidationIssue,
  DeliveryValidationResult,
  MockTelegramInquiry
} from '../../domain/channel-order-telegram'
import {
  accountManagerAssignments,
  accountProductAssignments,
  accountAssignments,
  accountSpendDaily,
  accounts,
  channelAccountOrders,
  channels,
  demandAllocations,
  demandItems,
  demands,
  members,
  teams
} from '../../mocks'
import { MOCK_TODAY } from '../../utils/spend-aggregation'
import { intakeAdAccount, resolvePlatformAssetByExternalId } from '../accounts/intake'
import { isInAccountPool } from '../accounts/pool-eligibility'
import { assertCanAllocateAccounts } from '../access/mock'
import { alertService } from '../alerts/mock'
import type {
  AllocateDemandInput,
  AllocateDemandResult,
  ConfirmChannelAccountDeliveryInput,
  ConfirmChannelAccountDeliveryResult,
  ConfirmDeliveryFromDraftResult,
  CreateAccountDemandInput,
  CreateChannelAccountOrderInput,
  DemandService,
  SchedulingDemandItemRow,
  SimulatePartialReminderResult,
  SubmitMockDeliveryReplyResult,
  UpdateDraftDemandInput
} from './types'

/** In-memory Mock Telegram session state (Phase 18). */
const mockInquiries = new Map<string, MockTelegramInquiry>()
const deliveryDrafts = new Map<string, DeliveryParseDraft>()

let inquirySeq = 9000

function nextInquiryMessageId(): string {
  inquirySeq += 1
  return `tg-msg-${inquirySeq}`
}

function seedMockInquiriesFromOrders() {
  for (const order of channelAccountOrders) {
    if (!order.inquiryMessageId) continue
    let buttonState: MockTelegramInquiry['buttonState'] = 'OPEN'
    if (order.status === 'REJECTED') buttonState = 'REJECTED'
    else if (order.status === 'TIMEOUT') buttonState = 'TIMEOUT'
    else if (
      order.status === 'ACCEPTED'
      || order.status === 'PROCESSING'
      || order.status === 'PARTIAL_DELIVERED'
      || order.status === 'DELIVERED'
      || order.status === 'PARTIAL_CLOSED'
      || order.status === 'PARSING_EXCEPTION'
      || order.status === 'QUANTITY_EXCEPTION'
    ) {
      buttonState = 'ACCEPTED'
    }
    mockInquiries.set(order.id, {
      orderId: order.id,
      messageId: order.inquiryMessageId,
      sentAt: order.requestedAt,
      buttonState
    })
  }
}

seedMockInquiriesFromOrders()

function parseDeliveryReply(orderId: string, rawText: string): DeliveryParseDraft {
  const text = rawText.trim()
  const externalMatch = text.match(/下户\s*ID\s*[：:]\s*(\S+)/i)
  const claimedMatch = text.match(/已下户\s*[：:]\s*(\d+)/i)
    ?? text.match(/账户数\s*[：:]\s*(\d+)/i)

  const accountIds: DeliveryParseDraft['accountIds'] = []
  const accountLine = /^(.+?)\s*\(([^)]+)\)\s*$/
  const bareAct = /\b(act_\d+)\b/i
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || /^(开户|下户|平台|账户数|已下户|BM|需求)/i.test(trimmed)) continue
    if (/^BM\s*[：:]/i.test(trimmed)) break
    const named = trimmed.match(accountLine)
    if (named) {
      accountIds.push({
        name: named[1].trim() || null,
        externalAccountId: named[2].trim()
      })
      continue
    }
    const act = trimmed.match(bareAct)
    if (act) {
      accountIds.push({ externalAccountId: act[1], name: null })
    }
  }

  const bmIds: string[] = []
  const bmSection = text.split(/BM\s*[：:]/i)[1]
  if (bmSection) {
    for (const line of bmSection.split(/\r?\n/)) {
      const id = line.trim()
      if (id && !/^平台|账户/.test(id)) bmIds.push(id)
    }
  }

  let confidence = 0.5
  if (accountIds.length) confidence += 0.25
  if (externalMatch) confidence += 0.1
  if (claimedMatch) confidence += 0.1
  if (bmIds.length) confidence += 0.05
  confidence = Math.min(0.99, confidence)

  return {
    orderId,
    externalOrderNo: externalMatch?.[1] ?? null,
    claimedQuantity: claimedMatch ? Number(claimedMatch[1]) : null,
    accountIds,
    bmIds,
    confidence,
    rawText: text,
    parsedAt: nowIso()
  }
}

function validateDeliveryDraft(
  order: ChannelAccountOrder,
  draft: DeliveryParseDraft
): DeliveryValidationResult {
  const errors: DeliveryValidationIssue[] = []
  const warnings: DeliveryValidationIssue[] = []

  if (!draft.accountIds.length) {
    errors.push({ code: 'EMPTY_PARSE', message: '未解析到任何 Account ID' })
  }

  const seen = new Set<string>()
  for (const row of draft.accountIds) {
    const id = row.externalAccountId?.trim()
    if (!id) {
      errors.push({ code: 'MISSING_ACCOUNT_ID', message: '存在空的 Account ID' })
      continue
    }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(id)) {
      errors.push({
        code: 'INVALID_ACCOUNT_FORMAT',
        message: `Account ID 格式异常: ${id}`
      })
    }
    const key = id.toLowerCase()
    if (seen.has(key)) {
      errors.push({
        code: 'DUPLICATE_IN_BATCH',
        message: `批次内重复: ${id}`
      })
    }
    seen.add(key)

    const duplicate = accounts.find(
      item => item.mediaId === order.mediaId
        && item.externalAccountId.toLowerCase() === key
    )
    if (duplicate) {
      errors.push({
        code: 'DUPLICATE_IN_POOL',
        message: `账户已存在于库中: ${id}`
      })
    }
  }

  if (
    draft.externalOrderNo
    && draft.externalOrderNo.trim() !== order.externalOrderNo.trim()
  ) {
    warnings.push({
      code: 'EXTERNAL_ORDER_MISMATCH',
      message: `下户ID ${draft.externalOrderNo} 与订单 externalOrderNo ${order.externalOrderNo} 不一致`
    })
  }

  if (
    draft.claimedQuantity != null
    && draft.accountIds.length > 0
    && draft.claimedQuantity !== draft.accountIds.length
  ) {
    errors.push({
      code: 'QUANTITY_MISMATCH',
      message: `声称交付 ${draft.claimedQuantity}，解析到 ${draft.accountIds.length} 个账户`
    })
  }

  const remaining = Math.max(0, order.requestedQuantity - order.deliveredQuantity)
  if (draft.accountIds.length > remaining) {
    warnings.push({
      code: 'OVERFLOW',
      message: `本次 ${draft.accountIds.length} 户超过剩余需求 ${remaining}，超交将入池不挂本 Demand`
    })
  }

  let exceptionStatus: DeliveryValidationResult['exceptionStatus'] = null
  if (errors.some(e => e.code === 'QUANTITY_MISMATCH')) {
    exceptionStatus = 'QUANTITY_EXCEPTION'
  } else if (errors.length) {
    exceptionStatus = 'PARSING_EXCEPTION'
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    exceptionStatus
  }
}

const ALLOCATABLE_STATUSES: AccountDemandStatus[] = [
  'APPROVED',
  'PARTIALLY_ALLOCATED'
]

function nowIso(): string {
  return `${MOCK_TODAY}T12:00:00.000Z`
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function assertTeamLeader(teamId: string, actorMemberId: string) {
  const team = teams.find(item => item.id === teamId)
  if (!team) throw new Error(`Unknown team: ${teamId}`)
  if (!actorMemberId || team.leaderMemberId !== actorMemberId) {
    throw new Error('Only the team leader can approve or reject this demand')
  }
}

function spendSince(accountId: string, fromDate: string): number {
  return accountSpendDaily
    .filter(row => row.accountId === accountId && row.date >= fromDate)
    .reduce((sum, row) => sum + row.spend, 0)
}

function idleBuckets(demandId: string) {
  const itemIds = new Set(demandItems.filter(item => item.demandId === demandId).map(item => item.id))
  const auto: string[] = []
  const manual: string[] = []
  for (const alloc of demandAllocations.filter(item => itemIds.has(item.demandItemId))) {
    const stillAssigned = accountAssignments.some(
      item => item.accountId === alloc.accountId && item.endedAt == null
    )
    if (!stillAssigned) continue
    const from = alloc.allocatedAt.slice(0, 10)
    if (spendSince(alloc.accountId, from) > 0) continue
    const days = Math.floor((Date.parse(MOCK_TODAY) - Date.parse(from)) / 86_400_000)
    if (days > 1) auto.push(alloc.accountId)
    else manual.push(alloc.accountId)
  }
  return { auto, manual }
}

function recycleAssigned(accountId: string, reason: string): boolean {
  const current = accountAssignments.find(item => item.accountId === accountId && item.endedAt == null)
  if (!current) return false
  const ts = nowIso()
  current.endedAt = ts
  current.reason = reason
  const account = accounts.find(item => item.id === accountId)
  if (account) {
    account.assetStatus = 'AVAILABLE'
    account.updatedAt = ts
  }
  return true
}

function nextDemandNo(): string {
  const yyyymm = MOCK_TODAY.slice(0, 7).replace('-', '')
  const seq = String(demands.length + 1).padStart(3, '0')
  return `DM-${yyyymm}-${seq}`
}

function nextDemandId(): string {
  return `dmd-${String(demands.length + 1).padStart(3, '0')}`
}

function nextItemId(): string {
  return `dmdi-${String(demandItems.length + 1).padStart(3, '0')}`
}

function nextOrderId(): string {
  return `ord-${String(channelAccountOrders.length + 1).padStart(3, '0')}`
}

function nextOrderNo(): string {
  const yyyymm = MOCK_TODAY.slice(0, 7).replace('-', '')
  const seq = String(channelAccountOrders.length + 1).padStart(3, '0')
  return `CO-${yyyymm}-${seq}`
}

function allocatedCountForItem(demandItemId: string): number {
  return demandAllocations.filter(row => row.demandItemId === demandItemId).length
}

function itemTimezone(item: AccountDemandItem): string | null {
  const tz = item.requirements?.timezone
  return typeof tz === 'string' && tz.trim() ? tz.trim() : null
}

function poolMatchCount(item: AccountDemandItem): number {
  const tz = itemTimezone(item)
  return accounts.filter((account) => {
    if (!isInAccountPool(account.id)) return false
    if (account.mediaId !== item.mediaId) return false
    if (tz && account.timezone !== tz) return false
    return true
  }).length
}

function buildSchedulingRow(item: AccountDemandItem, demand: AccountDemand): SchedulingDemandItemRow {
  const allocatedQuantity = allocatedCountForItem(item.id)
  const remainingQuantity = Math.max(0, item.requestedQuantity - allocatedQuantity)
  const matches = poolMatchCount(item)
  return {
    itemId: item.id,
    demandId: demand.id,
    demandNo: demand.demandNo,
    teamId: demand.teamId,
    status: demand.status,
    priority: demand.priority,
    expectedDate: demand.expectedDate ?? null,
    mediaId: item.mediaId,
    productId: item.productId ?? null,
    timezone: itemTimezone(item),
    requestedQuantity: item.requestedQuantity,
    approvedQuantity: item.approvedQuantity,
    allocatedQuantity,
    remainingQuantity,
    poolMatchCount: matches,
    shortage: Math.max(0, remainingQuantity - matches)
  }
}

function requireOrder(id: string): ChannelAccountOrder {
  const order = channelAccountOrders.find(item => item.id === id)
  if (!order) throw new Error(`Unknown channel account order: ${id}`)
  return order
}

function assertStatus(
  order: ChannelAccountOrder,
  allowed: ChannelAccountOrderStatus[],
  action: string
) {
  if (!allowed.includes(order.status)) {
    throw new Error(`Cannot ${action} order in status ${order.status}`)
  }
}

function cloneOrder(order: ChannelAccountOrder): ChannelAccountOrder {
  return { ...order, requirements: { ...order.requirements } }
}

export const demandService: DemandService = {
  async getDemands(query: DemandQuery = {}) {
    let rows = [...demands]

    if (query.teamIds?.length) {
      rows = rows.filter(item => query.teamIds!.includes(item.teamId))
    }
    if (query.statuses?.length) {
      rows = rows.filter(item => query.statuses!.includes(item.status))
    }
    if (query.priorities?.length) {
      rows = rows.filter(item => query.priorities!.includes(item.priority))
    }
    if (query.mediaId) {
      const mediaId = query.mediaId
      rows = rows.filter(item =>
        demandItems.some(row => row.demandId === item.id && row.mediaId === mediaId)
      )
    }
    if (query.expectedBucket) {
      const horizon = shiftIsoDate(MOCK_TODAY, 7)
      rows = rows.filter((item) => {
        const date = item.expectedDate?.slice(0, 10) ?? ''
        if (query.expectedBucket === 'UNSET') return !date
        if (!date) return false
        if (query.expectedBucket === 'OVERDUE') return date < MOCK_TODAY
        return date >= MOCK_TODAY && date <= horizon
      })
    }
    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      rows = rows.filter((item) => {
        const teamName = teams.find(team => team.id === item.teamId)?.name ?? ''
        return item.demandNo.toLowerCase().includes(q)
          || (item.reason ?? '').toLowerCase().includes(q)
          || teamName.toLowerCase().includes(q)
      })
    }

    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return paginate(rows, query.page, query.pageSize)
  },

  async getDemandById(id) {
    return demands.find(item => item.id === id) ?? null
  },

  async getDemandItems(demandId) {
    return demandItems.filter(item => item.demandId === demandId)
  },

  async getDemandAllocations(demandItemId) {
    if (!demandItemId) return [...demandAllocations]
    return demandAllocations.filter(item => item.demandItemId === demandItemId)
  },

  async getChannelAccountOrders(query: ChannelAccountOrderQuery = {}) {
    let rows = [...channelAccountOrders]

    if (query.channelIds?.length) {
      rows = rows.filter(item => query.channelIds!.includes(item.channelId))
    }
    if (query.mediaIds?.length) {
      rows = rows.filter(item => query.mediaIds!.includes(item.mediaId))
    }
    if (query.statuses?.length) {
      rows = rows.filter(item => query.statuses!.includes(item.status))
    }
    if (query.timezone) {
      rows = rows.filter(item => (item.timezone ?? '') === query.timezone)
    }
    if (query.deliveryProgress === 'NONE') {
      rows = rows.filter(item => item.deliveredQuantity <= 0)
    } else if (query.deliveryProgress === 'PARTIAL') {
      rows = rows.filter(item =>
        item.deliveredQuantity > 0 && item.deliveredQuantity < item.requestedQuantity
      )
    } else if (query.deliveryProgress === 'FULL') {
      rows = rows.filter(item => item.deliveredQuantity >= item.requestedQuantity)
    }
    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      rows = rows.filter(item =>
        item.orderNo.toLowerCase().includes(q)
        || item.externalOrderNo.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    return paginate(rows, query.page, query.pageSize)
  },

  async createDemand(input: CreateAccountDemandInput) {
    if (!input.teamId) throw new Error('teamId is required')
    if (!input.mediaId) throw new Error('mediaId is required')
    if (!Number.isFinite(input.requestedQuantity) || input.requestedQuantity < 1) {
      throw new Error('requestedQuantity must be >= 1')
    }
    const timezone = input.requirements?.timezone
    if (typeof timezone !== 'string' || !timezone.trim()) {
      throw new Error('requirements.timezone is required')
    }

    const ts = nowIso()
    const demand: AccountDemand = {
      id: nextDemandId(),
      demandNo: nextDemandNo(),
      teamId: input.teamId,
      requesterUserId: input.requesterUserId,
      expectedDate: input.expectedDate ?? null,
      priority: input.priority,
      reason: input.reason?.trim() || null,
      status: input.submit ? 'SUBMITTED' : 'DRAFT',
      createdAt: ts,
      updatedAt: ts
    }

    const item: AccountDemandItem = {
      id: nextItemId(),
      demandId: demand.id,
      mediaId: input.mediaId,
      productId: input.productId ?? null,
      requestedQuantity: Math.floor(input.requestedQuantity),
      approvedQuantity: 0,
      requirements: { ...input.requirements }
    }

    demands.push(demand)
    demandItems.push(item)
    return { ...demand }
  },

  async submitDemand(id) {
    const demand = demands.find(item => item.id === id)
    if (!demand) return null
    if (demand.status !== 'DRAFT') {
      throw new Error('Only DRAFT demands can be submitted')
    }
    demand.status = 'SUBMITTED'
    demand.updatedAt = nowIso()
    return { ...demand }
  },

  async approveDemand(id, actorMemberId) {
    const demand = demands.find(item => item.id === id)
    if (!demand) throw new Error(`Unknown demand: ${id}`)
    assertTeamLeader(demand.teamId, actorMemberId)
    if (demand.status !== 'SUBMITTED') {
      throw new Error('Only SUBMITTED demands can be approved')
    }
    demand.status = 'APPROVED'
    demand.updatedAt = nowIso()
    return { ...demand }
  },

  async rejectDemand(id, actorMemberId) {
    const demand = demands.find(item => item.id === id)
    if (!demand) throw new Error(`Unknown demand: ${id}`)
    assertTeamLeader(demand.teamId, actorMemberId)
    if (demand.status !== 'SUBMITTED') {
      throw new Error('Only SUBMITTED demands can be rejected')
    }
    demand.status = 'REJECTED'
    demand.updatedAt = nowIso()
    return { ...demand }
  },

  async cancelDemand(id) {
    const demand = demands.find(item => item.id === id)
    if (!demand) throw new Error(`Unknown demand: ${id}`)
    if (demand.status === 'FULFILLED' || demand.status === 'REJECTED' || demand.status === 'CANCELLED') {
      throw new Error(`Demand status ${demand.status} cannot be cancelled`)
    }
    const buckets = idleBuckets(demand.id)
    const autoRecycledAccountIds: string[] = []
    for (const accountId of buckets.auto) {
      if (recycleAssigned(accountId, `Auto recycle idle >1d after cancel ${demand.demandNo}`)) {
        autoRecycledAccountIds.push(accountId)
      }
    }
    demand.status = 'CANCELLED'
    demand.updatedAt = nowIso()
    return {
      demand: { ...demand },
      autoRecycledAccountIds,
      pendingManualAccountIds: buckets.manual
    }
  },

  async confirmManualIdleRecycle(demandId) {
    const demand = demands.find(item => item.id === demandId)
    if (!demand) throw new Error(`Unknown demand: ${demandId}`)
    const recycled: string[] = []
    for (const accountId of idleBuckets(demandId).manual) {
      if (recycleAssigned(accountId, `Manual idle recycle after cancel ${demand.demandNo}`)) {
        recycled.push(accountId)
      }
    }
    return recycled
  },

  async updateDraftDemand(id, input: UpdateDraftDemandInput) {
    const demand = demands.find(item => item.id === id)
    if (!demand) return null
    if (demand.status !== 'DRAFT') {
      throw new Error('Only DRAFT demands can be updated')
    }

    if (input.expectedDate !== undefined) demand.expectedDate = input.expectedDate
    if (input.priority !== undefined) demand.priority = input.priority
    if (input.reason !== undefined) demand.reason = input.reason?.trim() || null

    const item = demandItems.find(row => row.demandId === id)
    if (item) {
      if (input.mediaId !== undefined) item.mediaId = input.mediaId
      if (input.productId !== undefined) item.productId = input.productId
      if (input.requestedQuantity !== undefined) {
        if (!Number.isFinite(input.requestedQuantity) || input.requestedQuantity < 1) {
          throw new Error('requestedQuantity must be >= 1')
        }
        item.requestedQuantity = Math.floor(input.requestedQuantity)
      }
      if (input.requirements !== undefined) {
        const timezone = input.requirements.timezone
        if (typeof timezone !== 'string' || !timezone.trim()) {
          throw new Error('requirements.timezone is required')
        }
        item.requirements = { ...input.requirements }
      }
    }

    demand.updatedAt = nowIso()

    if (input.submit) {
      demand.status = 'SUBMITTED'
      demand.updatedAt = nowIso()
    }

    return { ...demand }
  },

  async getSchedulingDemandItems() {
    const rows: SchedulingDemandItemRow[] = []
    for (const demand of demands) {
      if (!ALLOCATABLE_STATUSES.includes(demand.status)) continue
      for (const item of demandItems.filter(row => row.demandId === demand.id)) {
        const row = buildSchedulingRow(item, demand)
        if (row.shortage > 0) {
          await alertService.ensureShortageAlert({
            kind: row.poolMatchCount === 0 ? 'POOL_SHORTAGE' : 'TEAM_ACCOUNT_SHORTAGE',
            teamId: row.teamId,
            demandId: row.demandId,
            demandItemId: row.itemId,
            demandNo: row.demandNo,
            shortage: row.shortage,
            poolMatchCount: row.poolMatchCount,
            remainingQuantity: row.remainingQuantity,
            mediaId: row.mediaId
          })
        }
        rows.push(row)
      }
    }
    rows.sort((a, b) => b.demandNo.localeCompare(a.demandNo) || a.itemId.localeCompare(b.itemId))
    return rows
  },

  async allocate(input: AllocateDemandInput): Promise<AllocateDemandResult> {
    assertCanAllocateAccounts(input.actorUserId)
    if (!input.demandItemId) throw new Error('demandItemId is required')
    if (!input.accountIds?.length) throw new Error('accountIds is required')

    const item = demandItems.find(row => row.id === input.demandItemId)
    if (!item) throw new Error(`Unknown demand item: ${input.demandItemId}`)

    const demand = demands.find(row => row.id === item.demandId)
    if (!demand) throw new Error(`Unknown demand: ${item.demandId}`)

    if (!ALLOCATABLE_STATUSES.includes(demand.status)) {
      throw new Error(`Demand status ${demand.status} cannot be allocated`)
    }

    if (!input.memberId) throw new Error('memberId is required')
    if (!input.managerId) throw new Error('managerId is required')
    if (!members.some(item => item.id === input.memberId)) {
      throw new Error(`Unknown member: ${input.memberId}`)
    }
    if (!members.some(item => item.id === input.managerId)) {
      throw new Error(`Unknown manager: ${input.managerId}`)
    }
    if (!item.productId) throw new Error('Demand item has no product')

    const uniqueIds = [...new Set(input.accountIds)]
    const already = allocatedCountForItem(item.id)
    const remaining = Math.max(0, item.requestedQuantity - already)
    if (uniqueIds.length > remaining) {
      throw new Error(`Can only allocate ${remaining} more account(s) for this item`)
    }

    const tz = itemTimezone(item)
    const ts = nowIso()
    const allocationIds: string[] = []
    const assignmentIds: string[] = []

    for (const accountId of uniqueIds) {
      if (!isInAccountPool(accountId)) {
        throw new Error(`Account ${accountId} is not in the allocatable pool`)
      }
      const account = accounts.find(row => row.id === accountId)
      if (!account) throw new Error(`Unknown account: ${accountId}`)
      if (account.mediaId !== item.mediaId) {
        throw new Error(`Account ${accountId} media does not match demand item`)
      }
      if (tz && account.timezone !== tz) {
        throw new Error(`Account ${accountId} timezone does not match demand item`)
      }

      const assignmentId = `asg-dmd-${accountId}-${accountAssignments.length + 1}`
      accountAssignments.push({
        id: assignmentId,
        accountId,
        teamId: demand.teamId,
        memberId: input.memberId,
        startedAt: ts,
        endedAt: null,
        reason: input.reason?.trim() || `Allocate to ${demand.demandNo}`,
        createdBy: input.allocatedBy
      })

      const currentManager = accountManagerAssignments.find(
        row => row.accountId === accountId && row.endedAt == null
      )
      if (currentManager && currentManager.managerMemberId !== input.managerId) {
        currentManager.endedAt = ts
      }
      if (!currentManager || currentManager.managerMemberId !== input.managerId) {
        accountManagerAssignments.push({
          id: `ama-${accountId}-${accountManagerAssignments.length + 1}`,
          accountId,
          managerMemberId: input.managerId,
          startedAt: ts,
          endedAt: null,
          reason: `Allocate manager for ${demand.demandNo}`,
          createdBy: input.allocatedBy
        })
      }

      const currentProduct = accountProductAssignments.find(
        row => row.accountId === accountId && row.endedAt == null
      )
      if (currentProduct && currentProduct.productId !== item.productId) {
        currentProduct.endedAt = ts
      }
      if (!currentProduct || currentProduct.productId !== item.productId) {
        accountProductAssignments.push({
          id: `apa-${accountId}-${accountProductAssignments.length + 1}`,
          accountId,
          productId: item.productId,
          startedAt: ts,
          endedAt: null,
          reason: `Allocate product for ${demand.demandNo}`,
          createdBy: input.allocatedBy
        })
      }

      const allocationId = `dmdal-${demandAllocations.length + 1}`
      demandAllocations.push({
        id: allocationId,
        demandItemId: item.id,
        accountId,
        assignmentId,
        allocatedAt: ts,
        allocatedBy: input.allocatedBy
      })

      account.assetStatus = 'ASSIGNED'
      account.updatedAt = ts
      assignmentIds.push(assignmentId)
      allocationIds.push(allocationId)
    }

    const allocatedQuantity = allocatedCountForItem(item.id)
    item.approvedQuantity = Math.max(item.approvedQuantity, allocatedQuantity)
    demand.status = allocatedQuantity >= item.requestedQuantity
      ? 'FULFILLED'
      : 'PARTIALLY_ALLOCATED'
    demand.updatedAt = ts

    // Multi-item demands: if any sibling still open, keep PARTIALLY unless all fulfilled
    const siblingItems = demandItems.filter(row => row.demandId === demand.id)
    const allFulfilled = siblingItems.every(
      row => allocatedCountForItem(row.id) >= row.requestedQuantity
    )
    if (allFulfilled) demand.status = 'FULFILLED'
    else if (siblingItems.some(row => allocatedCountForItem(row.id) > 0)) {
      demand.status = 'PARTIALLY_ALLOCATED'
    }

    const remainingAfter = Math.max(0, item.requestedQuantity - allocatedCountForItem(item.id))
    const poolLeft = poolMatchCount(item)
    const shortageAfter = Math.max(0, remainingAfter - poolLeft)
    if (shortageAfter === 0) {
      await alertService.resolveShortageAlertsForDemandItem(item.id)
    }

    return {
      demand: { ...demand },
      allocationIds,
      assignmentIds
    }
  },

  async createChannelAccountOrder(input: CreateChannelAccountOrderInput) {
    if (!input.channelId) throw new Error('channelId is required')
    if (!input.mediaId) throw new Error('mediaId is required')
    if (!Number.isFinite(input.requestedQuantity) || input.requestedQuantity < 1) {
      throw new Error('requestedQuantity must be >= 1')
    }

    if (!input.relatedDemandItemId) {
      throw new Error('relatedDemandItemId is required')
    }
    if (!input.externalOrderNo?.trim()) {
      throw new Error('externalOrderNo is required')
    }

    const channel = channels.find(item => item.id === input.channelId)
    if (!channel) throw new Error(`Unknown channel: ${input.channelId}`)
    if (!channel.supportedMediaIds.includes(input.mediaId)) {
      throw new Error(`Channel ${channel.name} does not support this media`)
    }

    const item = demandItems.find(row => row.id === input.relatedDemandItemId)
    if (!item) throw new Error(`Unknown demand item: ${input.relatedDemandItemId}`)
    if (item.mediaId !== input.mediaId) {
      throw new Error('mediaId must match related demand item')
    }

    const requirements = { ...(input.requirements ?? {}) }
    const timezone
      = (typeof input.timezone === 'string' && input.timezone.trim()
        ? input.timezone.trim()
        : null)
      ?? (typeof requirements.timezone === 'string' && requirements.timezone.trim()
        ? String(requirements.timezone).trim()
        : null)

    if (timezone && !requirements.timezone) {
      requirements.timezone = timezone
    }

    const order: ChannelAccountOrder = {
      id: nextOrderId(),
      orderNo: nextOrderNo(),
      externalOrderNo: input.externalOrderNo.trim(),
      channelId: input.channelId,
      mediaId: input.mediaId,
      relatedDemandItemId: input.relatedDemandItemId,
      requestedQuantity: Math.floor(input.requestedQuantity),
      deliveredQuantity: 0,
      timezone,
      requirements,
      status: input.asDraft ? 'DRAFT' : 'PENDING',
      partialReminderTime: null,
      inquiryMessageId: null,
      acceptedAt: null,
      acceptedBy: null,
      rejectReason: null,
      requestedAt: nowIso(),
      completedAt: null
    }

    channelAccountOrders.push(order)
    return cloneOrder(order)
  },

  async submitChannelAccountOrder(id) {
    const order = requireOrder(id)
    assertStatus(order, ['DRAFT'], 'submit')
    order.status = 'PENDING'
    return cloneOrder(order)
  },

  async startProcessingChannelAccountOrder(id) {
    // Deprecated Path A: jump to PROCESSING without Mock inquiry.
    // Prefer sendMockInquiry + acceptMockInquiry.
    const order = requireOrder(id)
    assertStatus(order, ['PENDING', 'PENDING_CONFIRM', 'ACCEPTED'], 'start processing')
    if (order.status === 'PENDING' || order.status === 'PENDING_CONFIRM') {
      await demandService.sendMockInquiry(id)
      return demandService.acceptMockInquiry(id, 'legacy-start')
    }
    order.status = 'PROCESSING'
    return cloneOrder(order)
  },

  async confirmChannelAccountDelivery(
    input: ConfirmChannelAccountDeliveryInput
  ): Promise<ConfirmChannelAccountDeliveryResult> {
    if (!input.orderId) throw new Error('orderId is required')
    if (!input.accounts?.length) throw new Error('accounts is required')

    const order = requireOrder(input.orderId)
    assertStatus(
      order,
      ['PROCESSING', 'PARTIAL_DELIVERED', 'PARSING_EXCEPTION', 'QUANTITY_EXCEPTION'],
      'confirm delivery'
    )

    const remaining = order.requestedQuantity - order.deliveredQuantity
    const counted = Math.min(input.accounts.length, Math.max(0, remaining))

    const seenExternal = new Set<string>()
    const createdIds: string[] = []
    const createdAccounts: AdAccount[] = []
    const ts = nowIso()

    const demandItem = demandItems.find(row => row.id === order.relatedDemandItemId)
    const defaultProductId = demandItem?.productId ?? null
    const actorMemberId = input.actorMemberId?.trim() || null

    for (const row of input.accounts) {
      const externalAccountId = row.externalAccountId?.trim()
      if (!externalAccountId) throw new Error('externalAccountId is required')
      const key = externalAccountId.toLowerCase()
      if (seenExternal.has(key)) {
        throw new Error(`Duplicate externalAccountId in batch: ${externalAccountId}`)
      }
      seenExternal.add(key)

      const timezone
        = (typeof row.timezone === 'string' && row.timezone.trim()
          ? row.timezone.trim()
          : null)
        ?? order.timezone
        ?? null

      const productId = row.productId?.trim() || defaultProductId
      const spendLimit
        = row.spendLimit != null && Number.isFinite(row.spendLimit) && row.spendLimit > 0
          ? row.spendLimit
          : null

      const { account } = intakeAdAccount({
        externalAccountId,
        mediaId: order.mediaId,
        name: row.name?.trim() || null,
        timezone,
        sourceChannelId: order.channelId,
        platformAssetId: row.platformAssetId ?? null,
        productId,
        managerMemberId: actorMemberId,
        createdByMemberId: actorMemberId,
        spendLimit,
        note: `Inbound from ${order.orderNo}`,
        reason: `Channel order ${order.orderNo}`,
        intakeSource: 'ORDER',
        lastSyncAt: null,
        firstSeenAt: ts
      })

      createdIds.push(account.id)
      createdAccounts.push(account)
    }

    order.deliveredQuantity += counted
    if (order.deliveredQuantity >= order.requestedQuantity) {
      order.status = 'DELIVERED'
      order.completedAt = ts
    } else {
      order.status = 'PARTIAL_DELIVERED'
      order.completedAt = null
    }
    deliveryDrafts.delete(order.id)

    return {
      order: cloneOrder(order),
      accountIds: createdIds,
      accounts: createdAccounts
    }
  },

  async cancelChannelAccountOrder(id) {
    const order = requireOrder(id)
    assertStatus(
      order,
      [
        'DRAFT',
        'PENDING',
        'PENDING_CONFIRM',
        'ACCEPTED',
        'PROCESSING',
        'PARTIAL_DELIVERED',
        'PARSING_EXCEPTION',
        'QUANTITY_EXCEPTION'
      ],
      'cancel'
    )
    if (order.deliveredQuantity > 0) {
      order.status = 'PARTIAL_CLOSED'
      return cloneOrder(order)
    }
    order.status = 'CANCELLED'
    return cloneOrder(order)
  },

  async setPartialReminderTime(id, time) {
    const order = requireOrder(id)
    order.partialReminderTime = time?.trim() || null
    return cloneOrder(order)
  },

  async sendMockInquiry(orderId) {
    const order = requireOrder(orderId)
    assertStatus(order, ['PENDING', 'REJECTED', 'TIMEOUT'], 'send mock inquiry')
    const messageId = nextInquiryMessageId()
    const sentAt = nowIso()
    order.status = 'PENDING_CONFIRM'
    order.inquiryMessageId = messageId
    order.rejectReason = null
    order.acceptedAt = null
    order.acceptedBy = null
    mockInquiries.set(orderId, {
      orderId,
      messageId,
      sentAt,
      buttonState: 'OPEN'
    })
    deliveryDrafts.delete(orderId)
    return cloneOrder(order)
  },

  async acceptMockInquiry(orderId, actor = 'supplier-bot') {
    const order = requireOrder(orderId)
    assertStatus(order, ['PENDING_CONFIRM'], 'accept inquiry')
    const ts = nowIso()
    order.status = 'ACCEPTED'
    order.acceptedAt = ts
    order.acceptedBy = actor
    const inquiry = mockInquiries.get(orderId)
    if (inquiry) {
      inquiry.buttonState = 'ACCEPTED'
      mockInquiries.set(orderId, inquiry)
    }
    // Protocol: ACCEPTED → PROCESSING immediately
    order.status = 'PROCESSING'
    return cloneOrder(order)
  },

  async rejectMockInquiry(orderId, reason: ChannelOrderRejectReason) {
    const order = requireOrder(orderId)
    assertStatus(order, ['PENDING_CONFIRM'], 'reject inquiry')
    if (!reason) throw new Error('reject reason is required')
    order.status = 'REJECTED'
    order.rejectReason = reason
    const inquiry = mockInquiries.get(orderId)
    if (inquiry) {
      inquiry.buttonState = 'REJECTED'
      mockInquiries.set(orderId, inquiry)
    }
    return cloneOrder(order)
  },

  async timeoutMockInquiry(orderId) {
    const order = requireOrder(orderId)
    assertStatus(order, ['PENDING_CONFIRM'], 'timeout inquiry')
    order.status = 'TIMEOUT'
    const inquiry = mockInquiries.get(orderId)
    if (inquiry) {
      inquiry.buttonState = 'TIMEOUT'
      mockInquiries.set(orderId, inquiry)
    }
    return cloneOrder(order)
  },

  async getMockInquiry(orderId) {
    return mockInquiries.get(orderId) ?? null
  },

  async getDeliveryDraft(orderId) {
    return deliveryDrafts.get(orderId) ?? null
  },

  async submitMockDeliveryReply(
    orderId,
    rawText,
    replyToMessageId
  ): Promise<SubmitMockDeliveryReplyResult> {
    const order = requireOrder(orderId)
    assertStatus(
      order,
      ['PROCESSING', 'PARTIAL_DELIVERED', 'PARSING_EXCEPTION', 'QUANTITY_EXCEPTION'],
      'submit delivery reply'
    )
    if (!order.inquiryMessageId) {
      throw new Error('Order has no inquiry message; send mock inquiry first')
    }
    const replyTo = (replyToMessageId ?? order.inquiryMessageId).trim()
    if (replyTo !== order.inquiryMessageId) {
      throw new Error(
        `Reply must bind to inquiry message ${order.inquiryMessageId} (got ${replyTo})`
      )
    }
    if (!rawText?.trim()) throw new Error('rawText is required')

    const draft = parseDeliveryReply(orderId, rawText)
    const validation = validateDeliveryDraft(order, draft)

    if (!validation.ok && validation.exceptionStatus) {
      order.status = validation.exceptionStatus
      deliveryDrafts.set(orderId, draft)
      return { order: cloneOrder(order), draft, validation }
    }

    deliveryDrafts.set(orderId, draft)
    // Clear prior exception once a valid draft is ready for human confirm
    if (
      order.status === 'PARSING_EXCEPTION'
      || order.status === 'QUANTITY_EXCEPTION'
    ) {
      order.status = order.deliveredQuantity > 0 ? 'PARTIAL_DELIVERED' : 'PROCESSING'
    }
    return { order: cloneOrder(order), draft, validation }
  },

  async confirmDeliveryFromDraft(
    orderId: string,
    actorMemberId?: string | null
  ): Promise<ConfirmDeliveryFromDraftResult> {
    const order = requireOrder(orderId)
    const draft = deliveryDrafts.get(orderId)
    if (!draft) throw new Error('No delivery draft to confirm; submit Reply first')

    const validation = validateDeliveryDraft(order, draft)
    if (!validation.ok) {
      throw new Error(
        validation.errors.map(e => e.message).join('; ')
        || 'Draft failed validation'
      )
    }

    let resolvedAssetId: string | null = null
    for (const bmExternal of draft.bmIds) {
      resolvedAssetId = resolvePlatformAssetByExternalId(
        order.mediaId,
        bmExternal,
        order.channelId
      )
      if (resolvedAssetId) break
    }

    const result = await demandService.confirmChannelAccountDelivery({
      orderId,
      actorMemberId: actorMemberId ?? null,
      accounts: draft.accountIds.map(row => ({
        externalAccountId: row.externalAccountId,
        name: row.name ?? null,
        timezone: order.timezone ?? null,
        platformAssetId: resolvedAssetId
      }))
    })

    return {
      order: result.order,
      accountIds: result.accountIds,
      accounts: result.accounts,
      draft
    }
  },

  async closePartialOrder(orderId, _reason) {
    const order = requireOrder(orderId)
    assertStatus(order, ['PARTIAL_DELIVERED'], 'close partial order')
    if (order.deliveredQuantity <= 0) {
      throw new Error('No delivered accounts; cancel instead')
    }
    order.status = 'PARTIAL_CLOSED'
    deliveryDrafts.delete(orderId)
    return cloneOrder(order)
  },

  async simulatePartialReminder(orderId): Promise<SimulatePartialReminderResult> {
    const order = requireOrder(orderId)
    assertStatus(order, ['PARTIAL_DELIVERED'], 'simulate partial reminder')
    const time = order.partialReminderTime || '未配置'
    const remaining = Math.max(0, order.requestedQuantity - order.deliveredQuantity)
    const message
      = `续交提醒（模拟）：订单 ${order.orderNo} 进度 ${order.deliveredQuantity}/${order.requestedQuantity}，`
        + `剩余 ${remaining}，每日提醒 ${time}`
    return { order: cloneOrder(order), message }
  }
}
