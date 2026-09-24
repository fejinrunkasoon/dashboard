import type { NamedRef } from '../../domain/account'
import type { Alert } from '../../domain/alert'
import type {
  ChannelPaymentAddress,
  ChannelPrepayment,
  ChannelReconciliation,
  ChannelRefund,
  ServiceFeePolicy,
  ServiceFeeTier
} from '../../domain/finance'
import {
  isFinanceOperator,
  RECONCILIATION_VARIANCE_THRESHOLD
} from '../../domain/finance'
import {
  accounts,
  alerts,
  channelPaymentAddresses,
  channelPrepayments,
  channelReconciliations,
  channelRefunds,
  channels,
  mediaPlatforms,
  serviceFeePolicies,
  serviceFeeTiers,
  teams
} from '../../mocks'
import { accountSpendDaily } from '../../mocks/spend-daily'
import { assertServiceFeeTiers } from '../../utils/service-fee-calculator'
import {
  MOCK_TODAY,
  aggregateSpendMetrics,
  parseDate
} from '../../utils/spend-aggregation'
import { channelSettlementService } from '../settlement/mock'
import { alertService } from '../alerts/mock'
import { buildChannelOwnershipFundSummaries } from './fund-pool'
import {
  getBalanceThreshold as readBalanceThreshold,
  updateBalanceThreshold as writeBalanceThreshold
} from './balance-threshold'
import type { Channel } from '../../domain/channel'
import type { EntityStatus } from '../../domain/common'
import type {
  ChannelDetailBundle,
  ChannelListItem,
  ChannelListQuery,
  ChannelMetrics,
  ChannelService,
  ConfirmReconciliationInput,
  CreateChannelInput,
  CreatePrepaymentInput,
  CreateReconciliationInput,
  CreateRefundInput,
  CreateServiceFeePolicyInput,
  DisableServiceFeePolicyInput,
  ReviewPaymentAddressInput,
  ReviewRefundInput,
  SubmitPaymentAddressInput,
  UpdateChannelInput,
  UpdatePaymentAddressInput,
  UpdateServiceFeePolicyInput
} from './types'

function normalizeChannelCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_')
}

function assertEntityStatus(status: EntityStatus) {
  if (status !== 'ACTIVE' && status !== 'DISABLED' && status !== 'ARCHIVED') {
    throw new Error(`Invalid status: ${status}`)
  }
}

function nowIso() {
  return new Date().toISOString()
}

function named(id: string, code: string | undefined, name: string): NamedRef {
  return { id, code, name }
}

function mediaRefs(mediaIds: string[]): NamedRef[] {
  return mediaIds.map((mediaId) => {
    const media = mediaPlatforms.find(item => item.id === mediaId)
    return named(mediaId, media?.code, media?.name ?? mediaId)
  })
}

function accountsForChannel(channelId: string) {
  return accounts.filter(item => item.sourceChannelId === channelId)
}

function lifetimeDays(receivedAt: string | null | undefined, today = MOCK_TODAY): number | null {
  if (!receivedAt) return null
  const start = parseDate(receivedAt.slice(0, 10)).getTime()
  const end = parseDate(today).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.floor((end - start) / 86_400_000) + 1
}

function metricsForChannel(channelId: string): ChannelMetrics {
  const scoped = accountsForChannel(channelId)
  let currentValid = 0
  let inUse = 0
  let abnormal = 0
  let todaySpend = 0
  let spend7d = 0
  let spend30d = 0
  const lifetimes: number[] = []

  for (const account of scoped) {
    const assetOk = account.assetStatus !== 'DISABLED' && account.assetStatus !== 'ARCHIVED'
    if (account.mediaStatus === 'ACTIVE' && assetOk) currentValid += 1
    if (account.assetStatus === 'IN_USE') inUse += 1
    if (
      account.mediaStatus === 'RESTRICTED'
      || account.mediaStatus === 'BANNED'
      || account.mediaStatus === 'DISABLED'
      || account.assetStatus === 'DISABLED'
    ) {
      abnormal += 1
    }

    const days = lifetimeDays(account.receivedAt)
    if (days != null) lifetimes.push(days)

    const spendRows = accountSpendDaily.filter(row => row.accountId === account.id)
    const spend = aggregateSpendMetrics(account.id, account.spendLimit, spendRows)
    todaySpend += spend.todaySpend
    spend7d += spend.spend7d
    spend30d += spend.spend30d
  }

  const averageLifetimeDays = lifetimes.length
    ? Math.round(lifetimes.reduce((sum, value) => sum + value, 0) / lifetimes.length)
    : null

  return {
    deliveredAccounts: scoped.length,
    currentValid,
    inUse,
    abnormal,
    averageLifetimeDays,
    todaySpend,
    spend7d,
    spend30d
  }
}

function buildListItem(channelId: string): ChannelListItem | null {
  const channel = channels.find(item => item.id === channelId)
  if (!channel) return null
  const metrics = metricsForChannel(channelId)
  return {
    id: channel.id,
    code: channel.code,
    name: channel.name,
    status: channel.status,
    supportedMedia: mediaRefs(channel.supportedMediaIds),
    deliveredAccounts: metrics.deliveredAccounts,
    currentValid: metrics.currentValid,
    inUse: metrics.inUse,
    abnormal: metrics.abnormal,
    averageLifetimeDays: metrics.averageLifetimeDays,
    spend30d: metrics.spend30d
  }
}

function writeTimestamp() {
  return `${MOCK_TODAY}T12:00:00.000Z`
}

function nextPaymentNo(): string {
  const stamp = MOCK_TODAY.replace(/-/g, '').slice(0, 6)
  const seq = String(channelPrepayments.length + 1).padStart(3, '0')
  return `PP-${stamp}-${seq}`
}

function nextRefundNo(): string {
  const stamp = MOCK_TODAY.replace(/-/g, '').slice(0, 6)
  const seq = String(channelRefunds.length + 1).padStart(3, '0')
  return `RF-${stamp}-${seq}`
}

function requireAddress(id: string): ChannelPaymentAddress {
  const row = channelPaymentAddresses.find(item => item.id === id)
  if (!row) throw new Error(`Unknown payment address: ${id}`)
  return row
}

function requireTeamLeader(teamId: string, actorMemberId: string) {
  const team = teams.find(item => item.id === teamId)
  if (!team) throw new Error(`Unknown team: ${teamId}`)
  if (!team.leaderMemberId) throw new Error(`Team ${teamId} has no leader`)
  if (team.leaderMemberId !== actorMemberId) {
    throw new Error('Only the approver team leader can review this payment address')
  }
  return team
}

function requireFinanceOperator(actorMemberId: string) {
  if (!isFinanceOperator(actorMemberId)) {
    throw new Error('Only a finance operator may perform this action')
  }
}

function replaceTiers(policyId: string, tiers: CreateServiceFeePolicyInput['tiers']) {
  assertServiceFeeTiers(tiers)
  for (let i = serviceFeeTiers.length - 1; i >= 0; i--) {
    if (serviceFeeTiers[i]!.policyId === policyId) serviceFeeTiers.splice(i, 1)
  }
  for (const tier of tiers) {
    serviceFeeTiers.push({
      id: `tier-${policyId}-${tier.sortOrder}-${serviceFeeTiers.length + 1}`,
      policyId,
      minSpend: tier.minSpend,
      maxSpend: tier.maxSpend ?? null,
      rate: tier.rate,
      sortOrder: tier.sortOrder
    })
  }
}

function ensureReconciliationVarianceAlert(row: ChannelReconciliation) {
  const rate = row.varianceRate
  const over
    = rate != null
      ? Math.abs(rate) > RECONCILIATION_VARIANCE_THRESHOLD
      : row.channelBillMediaSpend > 0 && row.systemMediaSpend === 0
  if (!over) return

  const existing = alerts.find(item =>
    item.type === 'RECONCILIATION_VARIANCE'
    && item.entityId === row.channelId
    && item.description.includes(`${row.year}-${String(row.month).padStart(2, '0')}`)
    && (item.status === 'OPEN' || item.status === 'IN_PROGRESS')
  )
  const pct = rate == null ? 'n/a' : `${(Math.abs(rate) * 100).toFixed(2)}%`
  const description
    = `${row.year}-${String(row.month).padStart(2, '0')}`
      + ` 渠道账单 ${row.channelBillMediaSpend} vs 系统 ${row.systemMediaSpend}`
      + `（差异率 ${pct}）`

  if (existing) {
    existing.description = description
    existing.severity = 'WARNING'
    return
  }

  const alert: Alert = {
    id: `al-recon-${row.id}`,
    type: 'RECONCILIATION_VARIANCE',
    severity: 'WARNING',
    entityType: 'Channel',
    entityId: row.channelId,
    title: '对账差异超阈值',
    description,
    status: 'OPEN',
    assigneeUserId: null,
    detectedAt: writeTimestamp(),
    resolvedAt: null,
    relatedDemandId: null,
    relatedDemandItemId: null,
    relatedChannelOrderId: null,
    relatedTeamId: null,
    resolutionNote: null
  }
  alerts.push(alert)
}

export const channelService: ChannelService = {
  async getChannels() {
    return [...channels]
  },

  async getChannelById(id) {
    return channels.find(item => item.id === id) ?? null
  },

  async getChannelList(query: ChannelListQuery = {}) {
    const keyword = query.keyword?.trim().toLowerCase()
    return channels
      .map(item => buildListItem(item.id))
      .filter((item): item is ChannelListItem => item != null)
      .filter((item) => {
        if (query.status && item.status !== query.status) return false
        if (query.mediaId && !item.supportedMedia.some(media => media.id === query.mediaId)) {
          return false
        }
        if (query.abnormal === 'yes' && item.abnormal <= 0) return false
        if (query.abnormal === 'no' && item.abnormal > 0) return false
        if (query.inUse === 'yes' && item.inUse <= 0) return false
        if (query.inUse === 'no' && item.inUse > 0) return false
        if (query.spend30d === 'yes' && item.spend30d <= 0) return false
        if (query.spend30d === 'no' && item.spend30d > 0) return false
        if (!keyword) return true
        return item.name.toLowerCase().includes(keyword)
          || item.code.toLowerCase().includes(keyword)
          || item.supportedMedia.some(media =>
            media.name.toLowerCase().includes(keyword)
            || (media.code?.toLowerCase().includes(keyword) ?? false)
          )
      })
  },

  async createChannel(input: CreateChannelInput): Promise<Channel> {
    const code = normalizeChannelCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (channels.some(item => item.code === code)) {
      throw new Error(`Channel code already exists: ${code}`)
    }

    const supportedMediaIds = [...new Set(input.supportedMediaIds ?? [])]
    for (const mediaId of supportedMediaIds) {
      if (!mediaPlatforms.some(item => item.id === mediaId)) {
        throw new Error(`Unknown media: ${mediaId}`)
      }
    }

    const stamp = nowIso()
    let id = `ch-${code.toLowerCase().replace(/_/g, '-')}`
    if (channels.some(item => item.id === id)) {
      id = `ch-${code.toLowerCase()}-${channels.length + 1}`
    }

    const channel: Channel = {
      id,
      code,
      name,
      status: 'ACTIVE',
      supportedMediaIds,
      contactName: input.contactName?.trim() || null,
      telegramReference: input.telegramReference?.trim() || null,
      note: input.note?.trim() || null,
      createdAt: stamp,
      updatedAt: stamp
    }
    channels.push(channel)
    return channel
  },

  async updateChannel(id: string, input: UpdateChannelInput): Promise<Channel> {
    const channel = channels.find(item => item.id === id)
    if (!channel) throw new Error(`Unknown channel: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      channel.name = name
    }
    if (input.supportedMediaIds !== undefined) {
      const supportedMediaIds = [...new Set(input.supportedMediaIds)]
      for (const mediaId of supportedMediaIds) {
        if (!mediaPlatforms.some(item => item.id === mediaId)) {
          throw new Error(`Unknown media: ${mediaId}`)
        }
      }
      channel.supportedMediaIds = supportedMediaIds
    }
    if (input.contactName !== undefined) {
      channel.contactName = input.contactName?.trim() || null
    }
    if (input.telegramReference !== undefined) {
      channel.telegramReference = input.telegramReference?.trim() || null
    }
    if (input.note !== undefined) {
      channel.note = input.note?.trim() || null
    }
    channel.updatedAt = nowIso()
    return channel
  },

  async setChannelStatus(id: string, status: EntityStatus): Promise<Channel> {
    assertEntityStatus(status)
    const channel = channels.find(item => item.id === id)
    if (!channel) throw new Error(`Unknown channel: ${id}`)
    channel.status = status
    channel.updatedAt = nowIso()
    return channel
  },

  async getChannelDetail(id: string): Promise<ChannelDetailBundle | null> {
    const channel = channels.find(item => item.id === id)
    if (!channel) return null
    return {
      channel,
      metrics: metricsForChannel(id),
      supportedMedia: mediaRefs(channel.supportedMediaIds)
    }
  },

  async getPaymentAddresses(channelId: string): Promise<ChannelPaymentAddress[]> {
    return channelPaymentAddresses.filter(item => item.channelId === channelId)
  },

  async getPrepayments(channelId) {
    if (!channelId) return [...channelPrepayments]
    return channelPrepayments.filter(item => item.channelId === channelId)
  },

  async getRefunds(channelId) {
    if (!channelId) return [...channelRefunds]
    return channelRefunds.filter(item => item.channelId === channelId)
  },

  async createPrepayment(input: CreatePrepaymentInput): Promise<ChannelPrepayment> {
    if (!input.channelId) throw new Error('channelId is required')
    if (!input.paymentAddressId) throw new Error('paymentAddressId is required')
    if (!input.productOwnership) throw new Error('productOwnership is required')
    if (input.productOwnership !== 'INTERNAL' && input.productOwnership !== 'EXTERNAL') {
      throw new Error('productOwnership must be INTERNAL or EXTERNAL')
    }
    if (!(input.amount > 0)) throw new Error('amount must be greater than 0')

    const channel = channels.find(item => item.id === input.channelId)
    if (!channel) throw new Error(`Unknown channel: ${input.channelId}`)

    const address = channelPaymentAddresses.find(item => item.id === input.paymentAddressId)
    if (!address) throw new Error(`Unknown payment address: ${input.paymentAddressId}`)
    if (address.channelId !== input.channelId) {
      throw new Error('paymentAddressId must belong to the channel')
    }
    if (address.status !== 'ACTIVE') {
      throw new Error('payment address must be ACTIVE to register a prepayment')
    }

    const ts = writeTimestamp()
    const row: ChannelPrepayment = {
      id: `pay-${channelPrepayments.length + 1}`,
      paymentNo: nextPaymentNo(),
      channelId: input.channelId,
      paymentAddressId: input.paymentAddressId,
      productOwnership: input.productOwnership,
      amount: input.amount,
      currency: 'USD',
      status: 'CONFIRMED',
      paidAt: ts,
      confirmedAt: ts,
      note: input.note?.trim() || null,
      createdAt: ts
    }
    channelPrepayments.push(row)
    return row
  },

  async submitPaymentAddress(input: SubmitPaymentAddressInput): Promise<ChannelPaymentAddress> {
    if (!input.channelId) throw new Error('channelId is required')
    if (!input.addressPayload?.trim()) throw new Error('addressPayload is required')
    if (!input.approverTeamId) throw new Error('approverTeamId is required')
    if (!input.submittedByMemberId) throw new Error('submittedByMemberId is required')
    if (input.type !== 'CRYPTO' && input.type !== 'FIAT') {
      throw new Error('type must be CRYPTO or FIAT')
    }
    if (!channels.some(item => item.id === input.channelId)) {
      throw new Error(`Unknown channel: ${input.channelId}`)
    }
    if (!teams.some(item => item.id === input.approverTeamId)) {
      throw new Error(`Unknown team: ${input.approverTeamId}`)
    }

    const ts = writeTimestamp()
    const row: ChannelPaymentAddress = {
      id: `cpa-${input.channelId}-${channelPaymentAddresses.length + 1}`,
      channelId: input.channelId,
      type: input.type,
      label: input.label?.trim() || null,
      addressPayload: input.addressPayload.trim(),
      status: 'PENDING_APPROVAL',
      approverTeamId: input.approverTeamId,
      submittedByMemberId: input.submittedByMemberId,
      reviewedByMemberId: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: ts,
      updatedAt: ts
    }
    channelPaymentAddresses.push(row)
    return { ...row }
  },

  async updatePaymentAddress(id: string, input: UpdatePaymentAddressInput): Promise<ChannelPaymentAddress> {
    const row = requireAddress(id)
    if (row.status === 'DISABLED') throw new Error('Cannot edit a DISABLED payment address')
    if (!input.submittedByMemberId) throw new Error('submittedByMemberId is required')
    if (input.type != null && input.type !== 'CRYPTO' && input.type !== 'FIAT') {
      throw new Error('type must be CRYPTO or FIAT')
    }
    if (input.approverTeamId && !teams.some(item => item.id === input.approverTeamId)) {
      throw new Error(`Unknown team: ${input.approverTeamId}`)
    }
    if (input.addressPayload != null && !input.addressPayload.trim()) {
      throw new Error('addressPayload is required')
    }

    const ts = writeTimestamp()
    if (input.type != null) row.type = input.type
    if (input.label !== undefined) row.label = input.label?.trim() || null
    if (input.addressPayload != null) row.addressPayload = input.addressPayload.trim()
    if (input.approverTeamId) row.approverTeamId = input.approverTeamId
    row.submittedByMemberId = input.submittedByMemberId
    row.status = 'PENDING_APPROVAL'
    row.reviewedByMemberId = null
    row.reviewedAt = null
    row.reviewNote = null
    row.updatedAt = ts
    return { ...row }
  },

  async approvePaymentAddress(id: string, input: ReviewPaymentAddressInput): Promise<ChannelPaymentAddress> {
    const row = requireAddress(id)
    if (row.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve address in status ${row.status}`)
    }
    requireTeamLeader(row.approverTeamId, input.actorMemberId)
    const ts = writeTimestamp()
    row.status = 'ACTIVE'
    row.reviewedByMemberId = input.actorMemberId
    row.reviewedAt = ts
    row.reviewNote = input.note?.trim() || null
    row.updatedAt = ts
    return { ...row }
  },

  async rejectPaymentAddress(id: string, input: ReviewPaymentAddressInput): Promise<ChannelPaymentAddress> {
    const row = requireAddress(id)
    if (row.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot reject address in status ${row.status}`)
    }
    requireTeamLeader(row.approverTeamId, input.actorMemberId)
    const ts = writeTimestamp()
    row.status = 'REJECTED'
    row.reviewedByMemberId = input.actorMemberId
    row.reviewedAt = ts
    row.reviewNote = input.note?.trim() || null
    row.updatedAt = ts
    return { ...row }
  },

  async disablePaymentAddress(id: string, actorMemberId: string): Promise<ChannelPaymentAddress> {
    requireFinanceOperator(actorMemberId)
    const row = requireAddress(id)
    if (row.status === 'DISABLED') return { ...row }
    const ts = writeTimestamp()
    row.status = 'DISABLED'
    row.updatedAt = ts
    return { ...row }
  },

  async createRefund(input: CreateRefundInput): Promise<ChannelRefund> {
    requireFinanceOperator(input.createdBy)
    if (!input.channelId) throw new Error('channelId is required')
    if (!(input.amount > 0)) throw new Error('amount must be greater than 0')
    if (!channels.some(item => item.id === input.channelId)) {
      throw new Error(`Unknown channel: ${input.channelId}`)
    }
    const ts = writeTimestamp()
    const row: ChannelRefund = {
      id: `ref-${channelRefunds.length + 1}`,
      refundNo: nextRefundNo(),
      channelId: input.channelId,
      amount: input.amount,
      currency: 'USD',
      reason: input.reason?.trim() || null,
      status: 'PENDING',
      requestedAt: ts,
      confirmedAt: null,
      note: input.note?.trim() || null,
      createdAt: ts
    }
    channelRefunds.push(row)
    return { ...row }
  },

  async confirmRefund(id: string, input: ReviewRefundInput): Promise<ChannelRefund> {
    requireFinanceOperator(input.actorMemberId)
    const row = channelRefunds.find(item => item.id === id)
    if (!row) throw new Error(`Unknown refund: ${id}`)
    if (row.status !== 'PENDING') throw new Error(`Cannot confirm refund in status ${row.status}`)
    const ts = writeTimestamp()
    row.status = 'CONFIRMED'
    row.confirmedAt = ts
    if (input.note?.trim()) row.note = input.note.trim()
    return { ...row }
  },

  async rejectRefund(id: string, input: ReviewRefundInput): Promise<ChannelRefund> {
    requireFinanceOperator(input.actorMemberId)
    const row = channelRefunds.find(item => item.id === id)
    if (!row) throw new Error(`Unknown refund: ${id}`)
    if (row.status !== 'PENDING') throw new Error(`Cannot reject refund in status ${row.status}`)
    row.status = 'REJECTED'
    if (input.note?.trim()) row.note = input.note.trim()
    return { ...row }
  },

  async getServiceFeePolicies(channelId: string): Promise<ServiceFeePolicy[]> {
    return serviceFeePolicies.filter(item => item.channelId === channelId)
  },

  async getServiceFeeTiers(policyId: string): Promise<ServiceFeeTier[]> {
    return serviceFeeTiers
      .filter(item => item.policyId === policyId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.minSpend - b.minSpend)
  },

  async createServiceFeePolicy(input: CreateServiceFeePolicyInput): Promise<ServiceFeePolicy> {
    requireFinanceOperator(input.actorMemberId)
    if (!input.channelId) throw new Error('channelId is required')
    if (!input.code?.trim()) throw new Error('code is required')
    if (!input.name?.trim()) throw new Error('name is required')
    if (!channels.some(item => item.id === input.channelId)) {
      throw new Error(`Unknown channel: ${input.channelId}`)
    }
    const code = input.code.trim().toUpperCase()
    if (serviceFeePolicies.some(item => item.channelId === input.channelId && item.code === code)) {
      throw new Error(`Policy code already exists on channel: ${code}`)
    }
    assertServiceFeeTiers(input.tiers)

    const id = `sfp-${input.channelId}-${serviceFeePolicies.length + 1}`
    const policy: ServiceFeePolicy = {
      id,
      channelId: input.channelId,
      code,
      name: input.name.trim(),
      status: 'ACTIVE',
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      note: input.note?.trim() || null
    }
    serviceFeePolicies.push(policy)
    replaceTiers(id, input.tiers)
    return { ...policy }
  },

  async updateServiceFeePolicy(id: string, input: UpdateServiceFeePolicyInput): Promise<ServiceFeePolicy> {
    requireFinanceOperator(input.actorMemberId)
    const policy = serviceFeePolicies.find(item => item.id === id)
    if (!policy) throw new Error(`Unknown policy: ${id}`)
    if (policy.status === 'DISABLED') throw new Error('Cannot edit a DISABLED policy')
    if (input.name != null) {
      if (!input.name.trim()) throw new Error('name is required')
      policy.name = input.name.trim()
    }
    if (input.effectiveFrom !== undefined) policy.effectiveFrom = input.effectiveFrom
    if (input.effectiveTo !== undefined) policy.effectiveTo = input.effectiveTo
    if (input.note !== undefined) policy.note = input.note?.trim() || null
    if (input.tiers) replaceTiers(id, input.tiers)
    return { ...policy }
  },

  async disableServiceFeePolicy(id: string, input: DisableServiceFeePolicyInput): Promise<ServiceFeePolicy> {
    requireFinanceOperator(input.actorMemberId)
    const policy = serviceFeePolicies.find(item => item.id === id)
    if (!policy) throw new Error(`Unknown policy: ${id}`)
    policy.status = 'DISABLED'
    return { ...policy }
  },

  async getReconciliations(channelId: string): Promise<ChannelReconciliation[]> {
    return channelReconciliations
      .filter(item => item.channelId === channelId)
      .sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))
  },

  async createReconciliation(input: CreateReconciliationInput): Promise<ChannelReconciliation> {
    requireFinanceOperator(input.actorMemberId)
    if (!input.channelId) throw new Error('channelId is required')
    if (!(input.year > 0) || !(input.month >= 1 && input.month <= 12)) {
      throw new Error('year/month is required')
    }
    if (!(input.channelBillMediaSpend >= 0)) throw new Error('channelBillMediaSpend must be >= 0')
    if (!channels.some(item => item.id === input.channelId)) {
      throw new Error(`Unknown channel: ${input.channelId}`)
    }

    const open = channelReconciliations.find(item =>
      item.channelId === input.channelId
      && item.year === input.year
      && item.month === input.month
      && item.status === 'OPEN'
    )
    if (open) throw new Error('An OPEN reconciliation already exists for this period')

    const summary = await channelSettlementService.getChannelMonthlySummary({
      channelId: input.channelId,
      year: input.year,
      month: input.month
    })
    const systemMediaSpend = summary?.mediaSpend ?? 0
    const variance = input.channelBillMediaSpend - systemMediaSpend
    const varianceRate = systemMediaSpend > 0
      ? variance / systemMediaSpend
      : (input.channelBillMediaSpend === 0 ? 0 : null)

    const ts = writeTimestamp()
    const row: ChannelReconciliation = {
      id: `recon-${input.channelId}-${input.year}${String(input.month).padStart(2, '0')}-${channelReconciliations.length + 1}`,
      channelId: input.channelId,
      year: input.year,
      month: input.month,
      currency: 'USD',
      channelBillMediaSpend: input.channelBillMediaSpend,
      systemMediaSpend,
      variance,
      varianceRate,
      status: 'OPEN',
      note: input.note?.trim() || null,
      confirmedByMemberId: null,
      confirmedAt: null,
      createdAt: ts,
      updatedAt: ts
    }
    channelReconciliations.push(row)
    ensureReconciliationVarianceAlert(row)
    return { ...row }
  },

  async confirmReconciliation(id: string, input: ConfirmReconciliationInput): Promise<ChannelReconciliation> {
    requireFinanceOperator(input.actorMemberId)
    const row = channelReconciliations.find(item => item.id === id)
    if (!row) throw new Error(`Unknown reconciliation: ${id}`)
    if (row.status !== 'OPEN') throw new Error(`Cannot confirm reconciliation in status ${row.status}`)
    const ts = writeTimestamp()
    row.status = 'CONFIRMED'
    row.confirmedByMemberId = input.actorMemberId
    row.confirmedAt = ts
    if (input.note?.trim()) row.note = input.note.trim()
    row.updatedAt = ts
    return { ...row }
  },

  async getOwnershipFundSummaries(channelId: string) {
    if (!channelId) throw new Error('channelId is required')
    const threshold = readBalanceThreshold(channelId)
    const summaries = buildChannelOwnershipFundSummaries(
      channelId,
      threshold.runwayLookbackDays
    )
    await alertService.ensureChannelBalanceAlerts(channelId, summaries, threshold)
    return summaries
  },

  async getBalanceThreshold(channelId: string) {
    if (!channelId) throw new Error('channelId is required')
    return readBalanceThreshold(channelId)
  },

  async updateBalanceThreshold(channelId, patch) {
    if (!channelId) throw new Error('channelId is required')
    const next = writeBalanceThreshold(channelId, patch)
    const summaries = buildChannelOwnershipFundSummaries(
      channelId,
      next.runwayLookbackDays
    )
    await alertService.ensureChannelBalanceAlerts(channelId, summaries, next)
    return next
  }
}
