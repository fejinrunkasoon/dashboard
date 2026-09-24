<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AccountMonthlySettlement,
  AdAccountListItem,
  ChannelAccountOrder,
  ChannelBalanceThreshold,
  ChannelOwnershipFundSummary,
  ChannelPaymentAddress,
  ChannelPaymentAddressType,
  ChannelPrepayment,
  ChannelRefund,
  ChannelReconciliation,
  ChannelMonthlySettlementSummary,
  PlatformAsset,
  ProductOwnership,
  ServiceFeePolicy,
  ServiceFeeTier
} from '~/domain'
import type { ChannelDetailBundle, QualityGroupBy, QualityPivotResult, QualitySpendPeriod } from '~/services'
import {
  accountService,
  analyticsService,
  channelService,
  channelSettlementService,
  demandService,
  mediaService,
  organizationService
} from '~/services'
import { formatCurrency } from '~/utils'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

const FINANCE_ACTOR = 'mem-lisi'

const route = useRoute()
const toast = useToast()

const channelId = computed(() => String(route.params.id ?? ''))

const pending = ref(true)
const notFound = ref(false)
const detail = ref<ChannelDetailBundle | null>(null)
const orders = ref<ChannelAccountOrder[]>([])
const accounts = ref<AdAccountListItem[]>([])
const assets = ref<PlatformAsset[]>([])
const paymentAddresses = ref<ChannelPaymentAddress[]>([])
const prepayments = ref<ChannelPrepayment[]>([])
const refunds = ref<ChannelRefund[]>([])
const settlementSummary = ref<ChannelMonthlySettlementSummary | null>(null)
const settlementRows = ref<AccountMonthlySettlement[]>([])
const feePolicies = ref<ServiceFeePolicy[]>([])
const tiersByPolicyId = ref<Record<string, ServiceFeeTier[]>>({})
const reconciliations = ref<ChannelReconciliation[]>([])
const fundSummaries = ref<ChannelOwnershipFundSummary[]>([])
const balanceThreshold = ref<ChannelBalanceThreshold | null>(null)
const teamOptions = ref<{ label: string, value: string, leaderMemberId?: string | null }[]>([])
const mediaNameById = ref<Record<string, string>>({})
const assetTypeNameById = ref<Record<string, string>>({})

const settlementYear = Number(MOCK_TODAY.slice(0, 4))
const settlementMonth = Number(MOCK_TODAY.slice(5, 7))

const policyCodeById = computed(() =>
  Object.fromEntries(feePolicies.value.map(item => [item.id, item.code]))
)

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Account Orders', value: 'orders' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Media Assets', value: 'assets' },
  { label: '质量', value: 'quality' },
  { label: 'Finance', value: 'finance' },
  { label: 'Reconciliation', value: 'reconciliation' },
  { label: 'Profile', value: 'profile' }
]

const activeTab = ref('overview')

const showPayModal = ref(false)
const payAddressId = ref<string | undefined>()
const payOwnership = ref<ProductOwnership | undefined>()
const payAmount = ref<number | null>(null)
const payNote = ref('')

const showAddressModal = ref(false)
const editingAddress = ref<ChannelPaymentAddress | null>(null)
const addressType = ref<ChannelPaymentAddressType>('CRYPTO')
const addressLabelField = ref('')
const addressPayload = ref('')
const addressApproverTeamId = ref<string | undefined>()

const showPolicyModal = ref(false)
const editingPolicy = ref<ServiceFeePolicy | null>(null)
const policyCode = ref('')
const policyName = ref('')
const policyNote = ref('')
const policyTiersText = ref('0,,0.02')

const showRefundModal = ref(false)
const refundAmount = ref<number | null>(null)
const refundReason = ref('')
const refundNote = ref('')

const showReconModal = ref(false)
const reconBillSpend = ref<number | null>(null)
const reconNote = ref('')

const showCreateOrderModal = ref(false)
const showDeliveryModal = ref(false)
const deliveryOrder = ref<ChannelAccountOrder | null>(null)
const orderActionId = ref<string | null>(null)
/** Order expanded for Mock Telegram inquiry / delivery panels. */
const simOrderId = ref<string | null>(null)

const simOrder = computed(() =>
  orders.value.find(item => item.id === simOrderId.value) ?? null
)

const qualityGroupBy = ref<QualityGroupBy>('media')
const qualitySpendPeriod = ref<QualitySpendPeriod>('30D')
const qualityCustomFrom = ref(shiftDate(MOCK_TODAY, -29))
const qualityCustomTo = ref(MOCK_TODAY)
const qualityPending = ref(false)
const qualityResult = ref<QualityPivotResult | null>(null)

const qualityGroupOptions: { label: string, value: QualityGroupBy }[] = [
  { label: 'Media', value: 'media' },
  { label: 'Timezone', value: 'timezone' },
  { label: 'Asset Status', value: 'assetStatus' }
]

async function loadQuality() {
  if (!channelId.value) return
  if (qualitySpendPeriod.value === 'CUSTOM' && (!qualityCustomFrom.value || !qualityCustomTo.value)) return
  qualityPending.value = true
  try {
    qualityResult.value = await analyticsService.getQualityPivot({
      groupBy: qualityGroupBy.value,
      spendPeriod: qualitySpendPeriod.value,
      spendRange: qualitySpendPeriod.value === 'CUSTOM'
        ? { from: qualityCustomFrom.value, to: qualityCustomTo.value }
        : undefined,
      channelIds: [channelId.value],
      sortBy: 'accountCount',
      sortOrder: 'desc'
    })
  } finally {
    qualityPending.value = false
  }
}

watch(
  [activeTab, qualityGroupBy, qualitySpendPeriod, qualityCustomFrom, qualityCustomTo, channelId],
  ([tab]) => {
    if (tab === 'quality') void loadQuality()
  }
)

const activeAddresses = computed(() =>
  paymentAddresses.value.filter(item => item.status === 'ACTIVE')
)

const ownershipOptions = [
  { label: '自家', value: 'INTERNAL' as ProductOwnership },
  { label: '外接', value: 'EXTERNAL' as ProductOwnership }
]

const addressOptions = computed(() =>
  activeAddresses.value.map(item => ({
    label: `${item.type} · ${item.label ?? '地址'} · ${maskAddress(item.addressPayload)}`,
    value: item.id
  }))
)

function maskAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

async function load() {
  pending.value = true
  notFound.value = false
  try {
    const bundle = await channelService.getChannelDetail(channelId.value)
    if (!bundle) {
      detail.value = null
      notFound.value = true
      return
    }
    detail.value = bundle
    useSeoMeta({ title: `${bundle.channel.name} · 渠道详情` })

    const [orderPage, accountPage, platformAssets, addresses, pays, refs, summary, accountSettlements, medias, types, policies, reconRows, orgTeams, funds, threshold] = await Promise.all([
      demandService.getChannelAccountOrders({ channelIds: [channelId.value], page: 1, pageSize: 50 }),
      accountService.getAccounts({ channelIds: [channelId.value], page: 1, pageSize: 20 }),
      mediaService.getPlatformAssets({ channelIds: [channelId.value] }),
      channelService.getPaymentAddresses(channelId.value),
      channelService.getPrepayments(channelId.value),
      channelService.getRefunds(channelId.value),
      channelSettlementService.getChannelMonthlySummary({
        channelId: channelId.value,
        year: settlementYear,
        month: settlementMonth
      }),
      channelSettlementService.getAccountMonthlySettlements({
        channelId: channelId.value,
        year: settlementYear,
        month: settlementMonth
      }),
      mediaService.getMediaPlatforms(),
      mediaService.getPlatformAssetTypes(),
      channelService.getServiceFeePolicies(channelId.value),
      channelService.getReconciliations(channelId.value),
      organizationService.getTeams(),
      channelService.getOwnershipFundSummaries(channelId.value),
      channelService.getBalanceThreshold(channelId.value)
    ])

    orders.value = orderPage.data
    accounts.value = accountPage.data
    assets.value = platformAssets
    paymentAddresses.value = addresses
    prepayments.value = pays
    refunds.value = refs
    settlementSummary.value = summary
    settlementRows.value = accountSettlements
    feePolicies.value = policies
    reconciliations.value = reconRows
    fundSummaries.value = funds
    balanceThreshold.value = threshold
    teamOptions.value = orgTeams.map(item => ({
      label: item.name,
      value: item.id,
      leaderMemberId: item.leaderMemberId
    }))
    mediaNameById.value = Object.fromEntries(medias.map(item => [item.id, item.name]))
    assetTypeNameById.value = Object.fromEntries(types.map(item => [item.id, item.name]))

    const tierEntries = await Promise.all(
      policies.map(async (policy) => {
        const tiers = await channelService.getServiceFeeTiers(policy.id)
        return [policy.id, tiers] as const
      })
    )
    tiersByPolicyId.value = Object.fromEntries(tierEntries)
  } finally {
    pending.value = false
  }
}

watch(channelId, () => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : 'overview'
  activeTab.value = tabs.some(item => item.value === tab) ? tab : 'overview'
  void load()
}, { immediate: true })

watch(activeTab, (tab) => {
  if (!channelId.value) return
  const current = typeof route.query.tab === 'string' ? route.query.tab : undefined
  if (current === tab) return
  void navigateTo({
    path: `/channels/${channelId.value}`,
    query: tab === 'overview' ? {} : { tab }
  }, { replace: true })
})

function openPayModal() {
  payAddressId.value = activeAddresses.value[0]?.id
  payOwnership.value = 'INTERNAL'
  payAmount.value = null
  payNote.value = ''
  showPayModal.value = true
}

async function confirmPay() {
  if (!payAddressId.value || !payOwnership.value || !payAmount.value || payAmount.value <= 0) return
  try {
    const row = await channelService.createPrepayment({
      channelId: channelId.value,
      paymentAddressId: payAddressId.value,
      productOwnership: payOwnership.value,
      amount: payAmount.value,
      note: payNote.value.trim() || undefined,
      createdBy: FINANCE_ACTOR
    })
    showPayModal.value = false
    toast.add({
      title: '打款已登记',
      description: `${row.paymentNo} · ${formatCurrency(row.amount)}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    prepayments.value = await channelService.getPrepayments(channelId.value)
    fundSummaries.value = await channelService.getOwnershipFundSummaries(channelId.value)
  } catch (error) {
    toast.add({
      title: '登记失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function reloadFinanceSlices() {
  const [addresses, pays, refs, policies, reconRows, summary, accountSettlements, funds, threshold] = await Promise.all([
    channelService.getPaymentAddresses(channelId.value),
    channelService.getPrepayments(channelId.value),
    channelService.getRefunds(channelId.value),
    channelService.getServiceFeePolicies(channelId.value),
    channelService.getReconciliations(channelId.value),
    channelSettlementService.getChannelMonthlySummary({
      channelId: channelId.value,
      year: settlementYear,
      month: settlementMonth
    }),
    channelSettlementService.getAccountMonthlySettlements({
      channelId: channelId.value,
      year: settlementYear,
      month: settlementMonth
    }),
    channelService.getOwnershipFundSummaries(channelId.value),
    channelService.getBalanceThreshold(channelId.value)
  ])
  paymentAddresses.value = addresses
  prepayments.value = pays
  refunds.value = refs
  feePolicies.value = policies
  reconciliations.value = reconRows
  settlementSummary.value = summary
  settlementRows.value = accountSettlements
  fundSummaries.value = funds
  balanceThreshold.value = threshold
  const tierEntries = await Promise.all(
    policies.map(async (policy) => {
      const tiers = await channelService.getServiceFeeTiers(policy.id)
      return [policy.id, tiers] as const
    })
  )
  tiersByPolicyId.value = Object.fromEntries(tierEntries)
}

function toastError(title: string, error: unknown) {
  toast.add({
    title,
    description: error instanceof Error ? error.message : '未知错误',
    color: 'error',
    icon: 'i-lucide-alert-circle'
  })
}

function openAddressModal(row?: ChannelPaymentAddress) {
  editingAddress.value = row ?? null
  addressType.value = row?.type ?? 'CRYPTO'
  addressLabelField.value = row?.label ?? ''
  addressPayload.value = row?.addressPayload ?? ''
  addressApproverTeamId.value = row?.approverTeamId ?? teamOptions.value[0]?.value
  showAddressModal.value = true
}

async function saveAddress() {
  if (!addressPayload.value.trim() || !addressApproverTeamId.value) return
  try {
    if (editingAddress.value) {
      await channelService.updatePaymentAddress(editingAddress.value.id, {
        type: addressType.value,
        label: addressLabelField.value.trim() || null,
        addressPayload: addressPayload.value.trim(),
        approverTeamId: addressApproverTeamId.value,
        submittedByMemberId: FINANCE_ACTOR
      })
    } else {
      await channelService.submitPaymentAddress({
        channelId: channelId.value,
        type: addressType.value,
        label: addressLabelField.value.trim() || null,
        addressPayload: addressPayload.value.trim(),
        approverTeamId: addressApproverTeamId.value,
        submittedByMemberId: FINANCE_ACTOR
      })
    }
    showAddressModal.value = false
    toast.add({
      title: editingAddress.value ? '地址已提交变更' : '地址已提交',
      description: '状态为 PENDING_APPROVAL，待团队负责人审核',
      icon: 'i-lucide-check',
      color: 'success'
    })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('地址保存失败', error)
  }
}

async function approveAddress(row: ChannelPaymentAddress) {
  const leaderId = teamOptions.value.find(item => item.value === row.approverTeamId)?.leaderMemberId
  if (!leaderId) {
    toastError('审核失败', new Error('审核团队未配置负责人'))
    return
  }
  try {
    await channelService.approvePaymentAddress(row.id, { actorMemberId: leaderId })
    toast.add({ title: '地址已通过', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('审核失败', error)
  }
}

async function rejectAddress(row: ChannelPaymentAddress) {
  const leaderId = teamOptions.value.find(item => item.value === row.approverTeamId)?.leaderMemberId
  if (!leaderId) {
    toastError('审核失败', new Error('审核团队未配置负责人'))
    return
  }
  try {
    await channelService.rejectPaymentAddress(row.id, {
      actorMemberId: leaderId,
      note: 'Mock reject'
    })
    toast.add({ title: '地址已驳回', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('审核失败', error)
  }
}

async function disableAddress(row: ChannelPaymentAddress) {
  try {
    await channelService.disablePaymentAddress(row.id, FINANCE_ACTOR)
    toast.add({ title: '地址已停用', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('停用失败', error)
  }
}

function parseTiersText(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [minRaw, maxRaw, rateRaw] = line.split(',').map(part => part.trim())
      const minSpend = Number(minRaw)
      const maxSpend = maxRaw === '' || maxRaw == null ? null : Number(maxRaw)
      const ratePct = Number(rateRaw)
      return {
        minSpend,
        maxSpend,
        rate: ratePct > 1 ? ratePct / 100 : ratePct,
        sortOrder: index + 1
      }
    })
}

function openPolicyModal(row?: ServiceFeePolicy) {
  editingPolicy.value = row ?? null
  policyCode.value = row?.code ?? ''
  policyName.value = row?.name ?? ''
  policyNote.value = row?.note ?? ''
  const tiers = row ? (tiersByPolicyId.value[row.id] ?? []) : []
  policyTiersText.value = tiers.length
    ? tiers.map(tier =>
      `${tier.minSpend},${tier.maxSpend ?? ''},${(tier.rate * 100).toFixed(2)}`
    ).join('\n')
    : '0,,2'
  showPolicyModal.value = true
}

async function savePolicy() {
  if (!policyName.value.trim()) return
  const tiers = parseTiersText(policyTiersText.value)
  try {
    if (editingPolicy.value) {
      await channelService.updateServiceFeePolicy(editingPolicy.value.id, {
        name: policyName.value.trim(),
        note: policyNote.value.trim() || null,
        tiers,
        actorMemberId: FINANCE_ACTOR
      })
    } else {
      if (!policyCode.value.trim()) return
      await channelService.createServiceFeePolicy({
        channelId: channelId.value,
        code: policyCode.value.trim(),
        name: policyName.value.trim(),
        note: policyNote.value.trim() || null,
        tiers,
        actorMemberId: FINANCE_ACTOR
      })
    }
    showPolicyModal.value = false
    toast.add({ title: '政策已保存', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('政策保存失败', error)
  }
}

async function disablePolicy(row: ServiceFeePolicy) {
  try {
    await channelService.disableServiceFeePolicy(row.id, { actorMemberId: FINANCE_ACTOR })
    toast.add({ title: '政策已停用', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('停用失败', error)
  }
}

function openRefundModal() {
  refundAmount.value = null
  refundReason.value = ''
  refundNote.value = ''
  showRefundModal.value = true
}

async function saveRefund() {
  if (!refundAmount.value || refundAmount.value <= 0) return
  try {
    const row = await channelService.createRefund({
      channelId: channelId.value,
      amount: refundAmount.value,
      reason: refundReason.value.trim() || null,
      note: refundNote.value.trim() || null,
      createdBy: FINANCE_ACTOR
    })
    showRefundModal.value = false
    toast.add({
      title: '退款已登记',
      description: row.refundNo,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('退款登记失败', error)
  }
}

async function confirmRefund(row: ChannelRefund) {
  try {
    await channelService.confirmRefund(row.id, { actorMemberId: FINANCE_ACTOR })
    toast.add({ title: '退款已确认', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('确认失败', error)
  }
}

async function rejectRefund(row: ChannelRefund) {
  try {
    await channelService.rejectRefund(row.id, { actorMemberId: FINANCE_ACTOR, note: 'Mock reject' })
    toast.add({ title: '退款已驳回', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('驳回失败', error)
  }
}

async function saveBalanceThreshold(patch: Partial<ChannelBalanceThreshold>) {
  try {
    balanceThreshold.value = await channelService.updateBalanceThreshold(channelId.value, {
      absoluteBalanceBelow: patch.absoluteBalanceBelow ?? null,
      daysOfRunwayBelow: patch.daysOfRunwayBelow ?? null,
      runwayLookbackDays: patch.runwayLookbackDays ?? 7,
      enabledTags: patch.enabledTags ?? ['INTERNAL'],
      severity: patch.severity ?? 'WARNING'
    })
    fundSummaries.value = await channelService.getOwnershipFundSummaries(channelId.value)
    toast.add({ title: '余额阈值已保存', icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toastError('保存阈值失败', error)
  }
}

function openReconModal() {
  reconBillSpend.value = settlementSummary.value?.mediaSpend ?? null
  reconNote.value = ''
  showReconModal.value = true
}

async function saveReconciliation() {
  if (reconBillSpend.value == null || reconBillSpend.value < 0) return
  try {
    const row = await channelService.createReconciliation({
      channelId: channelId.value,
      year: settlementYear,
      month: settlementMonth,
      channelBillMediaSpend: reconBillSpend.value,
      note: reconNote.value.trim() || null,
      actorMemberId: FINANCE_ACTOR
    })
    showReconModal.value = false
    toast.add({
      title: '对账单已创建',
      description: `差异 ${formatCurrency(row.variance)}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('对账创建失败', error)
  }
}

async function confirmReconciliation(row: ChannelReconciliation) {
  try {
    await channelService.confirmReconciliation(row.id, {
      actorMemberId: FINANCE_ACTOR,
      note: row.note
    })
    toast.add({ title: '对账已确认', icon: 'i-lucide-check', color: 'success' })
    await reloadFinanceSlices()
  } catch (error) {
    toastError('确认失败', error)
  }
}

async function refreshOrdersAndAccounts() {
  const [orderPage, accountPage] = await Promise.all([
    demandService.getChannelAccountOrders({ channelIds: [channelId.value], page: 1, pageSize: 50 }),
    accountService.getAccounts({ channelIds: [channelId.value], page: 1, pageSize: 20 })
  ])
  orders.value = orderPage.data
  accounts.value = accountPage.data
  const bundle = await channelService.getChannelDetail(channelId.value)
  if (bundle) detail.value = bundle
}

function onOrderCreated(order: ChannelAccountOrder) {
  toast.add({
    title: '渠道订单已创建',
    description: `${order.orderNo} · ${order.status}`,
    icon: 'i-lucide-check',
    color: 'success'
  })
  void refreshOrdersAndAccounts()
}

function openDelivery(order: ChannelAccountOrder) {
  deliveryOrder.value = order
  showDeliveryModal.value = true
}

function onDelivered(payload: { orderId: string; accountIds: string[]; count: number }) {
  toast.add({
    title: '交付已入库',
    description: `${payload.count} 户进入账户池（AVAILABLE），可回调度 Allocate`,
    icon: 'i-lucide-check',
    color: 'success'
  })
  void refreshOrdersAndAccounts()
}

async function runOrderAction(
  orderId: string,
  action: 'submit' | 'sendInquiry' | 'cancel' | 'closePartial' | 'simReminder'
) {
  if (orderActionId.value) return
  orderActionId.value = orderId
  try {
    let order: ChannelAccountOrder
    if (action === 'submit') {
      order = await demandService.submitChannelAccountOrder(orderId)
    } else if (action === 'sendInquiry') {
      order = await demandService.sendMockInquiry(orderId)
      simOrderId.value = orderId
    } else if (action === 'closePartial') {
      order = await demandService.closePartialOrder(orderId, '库存不足')
    } else if (action === 'simReminder') {
      const result = await demandService.simulatePartialReminder(orderId)
      toast.add({
        title: '续交提醒（模拟）',
        description: result.message,
        icon: 'i-lucide-bell',
        color: 'primary'
      })
      orderActionId.value = null
      return
    } else {
      order = await demandService.cancelChannelAccountOrder(orderId)
    }
    toast.add({
      title: '订单已更新',
      description: `${order.orderNo} → ${order.status}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await refreshOrdersAndAccounts()
  } catch (error) {
    toast.add({
      title: '操作失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    orderActionId.value = null
  }
}

function onSimUpdated(order: ChannelAccountOrder) {
  void refreshOrdersAndAccounts()
  simOrderId.value = order.id
}

function toggleSimPanel(order: ChannelAccountOrder) {
  simOrderId.value = simOrderId.value === order.id ? null : order.id
}

async function copyOrderSummary(order: ChannelAccountOrder) {
  const channelName = detail.value?.channel.name ?? order.channelId
  const mediaName = mediaNameById.value[order.mediaId] ?? order.mediaId
  const lines = [
    `FFJ Channel Account Order`,
    `Order No: ${order.orderNo}`,
    `External Order No: ${order.externalOrderNo || '—'}`,
    `Channel: ${channelName}`,
    `Media: ${mediaName}`,
    `Quantity: ${order.requestedQuantity}`,
    `Delivered: ${order.deliveredQuantity}`,
    `Timezone: ${order.timezone ?? '—'}`,
    `Related Demand Item: ${order.relatedDemandItemId ?? '—'}`,
    `Status: ${order.status}`,
    `Requirements: ${JSON.stringify(order.requirements)}`,
    `Requested At: ${order.requestedAt}`
  ]
  const text = lines.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: '已复制订单摘要',
      description: '可粘贴到 Telegram 与渠道沟通（Stage A）',
      icon: 'i-lucide-copy',
      color: 'success'
    })
  } catch {
    toast.add({
      title: '复制失败',
      description: text,
      color: 'warning',
      icon: 'i-lucide-alert-circle'
    })
  }
}

const reminderDrafts = ref<Record<string, string>>({})

function reminderValue(order: ChannelAccountOrder) {
  return reminderDrafts.value[order.id] ?? order.partialReminderTime ?? ''
}

function setReminderDraft(id: string, value: string) {
  reminderDrafts.value = { ...reminderDrafts.value, [id]: value }
}

async function saveReminder(order: ChannelAccountOrder) {
  try {
    const saved = await demandService.setPartialReminderTime(order.id, reminderValue(order) || null)
    reminderDrafts.value = {
      ...reminderDrafts.value,
      [order.id]: saved.partialReminderTime ?? ''
    }
    toast.add({
      title: '续交提醒已保存',
      description: saved.partialReminderTime
        ? `${saved.orderNo} · 每日 ${saved.partialReminderTime}`
        : `${saved.orderNo} · 已清空`,
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: '保存提醒失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

function canCancelOrder(status: ChannelAccountOrder['status']) {
  return status === 'DRAFT'
    || status === 'PENDING'
    || status === 'PENDING_CONFIRM'
    || status === 'ACCEPTED'
    || status === 'PROCESSING'
    || status === 'PARTIAL_DELIVERED'
    || status === 'PARSING_EXCEPTION'
    || status === 'QUANTITY_EXCEPTION'
}

function canSendInquiry(status: ChannelAccountOrder['status']) {
  return status === 'PENDING' || status === 'REJECTED' || status === 'TIMEOUT'
}

function canManualDelivery(status: ChannelAccountOrder['status']) {
  return status === 'PROCESSING'
    || status === 'PARTIAL_DELIVERED'
    || status === 'PARSING_EXCEPTION'
    || status === 'QUANTITY_EXCEPTION'
}

const orderColumns: TableColumn<ChannelAccountOrder>[] = [
  { accessorKey: 'orderNo', header: 'Order No' },
  { id: 'external', header: '外部单号' },
  { id: 'media', header: 'Media' },
  { accessorKey: 'requestedQuantity', header: 'Requested' },
  { accessorKey: 'deliveredQuantity', header: 'Delivered' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'reminder', header: '续交提醒' },
  { accessorKey: 'requestedAt', header: 'Requested At' },
  { id: 'actions', header: 'Actions' }
]

const accountColumns: TableColumn<AdAccountListItem>[] = [
  { accessorKey: 'externalAccountId', header: 'Account' },
  { id: 'media', header: 'Media' },
  { accessorKey: 'assetStatus', header: 'Asset' },
  { accessorKey: 'mediaStatus', header: 'Media Status' },
  { id: 'spend7d', header: '7D' }
]

const assetColumns: TableColumn<PlatformAsset>[] = [
  { id: 'type', header: 'Type' },
  { accessorKey: 'externalId', header: 'External ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' }
]

const reconColumns: TableColumn<ChannelReconciliation>[] = [
  { id: 'period', header: '账期' },
  { id: 'bill', header: '渠道账单' },
  { id: 'system', header: '系统消耗' },
  { id: 'variance', header: '差额' },
  { id: 'rate', header: '差异率' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="渠道详情" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/channels"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            label="返回列表"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <ChannelsChannelCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <div v-if="pending" class="flex items-center justify-center gap-2 py-20 text-muted text-sm">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载渠道详情…
      </div>

      <div
        v-else-if="notFound"
        class="flex flex-col items-center justify-center gap-3 py-20 text-muted"
      >
        <UIcon name="i-lucide-search-x" class="size-10" />
        <p class="text-sm">
          未找到渠道 {{ channelId }}
        </p>
        <UButton to="/channels" label="返回渠道中心" variant="soft" />
      </div>

      <template v-else-if="detail">
        <ChannelsChannelDetailHeader :detail="detail" />

        <UTabs v-model="activeTab" :items="tabs" class="w-full" :content="false" />

        <div class="rounded-lg border border-default p-4 space-y-4">
          <template v-if="activeTab === 'overview'">
            <p class="text-sm text-muted">
              运营指标基于交户归属（sourceChannel）。金额均为媒体消耗，不含渠道服务费。
            </p>
            <div class="grid sm:grid-cols-2 gap-3 text-sm">
              <p>
                <span class="text-muted">交户账户：</span>
                {{ detail.metrics.deliveredAccounts }}
              </p>
              <p>
                <span class="text-muted">当前有效：</span>
                {{ detail.metrics.currentValid }}
              </p>
              <p>
                <span class="text-muted">使用中：</span>
                {{ detail.metrics.inUse }}
              </p>
              <p>
                <span class="text-muted">异常：</span>
                {{ detail.metrics.abnormal }}
              </p>
            </div>
          </template>

          <template v-else-if="activeTab === 'orders'">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <p class="text-xs text-muted">
                Mock TG：询单 → 接单/拒单 → Reply → Parser 草稿 → 人工确认入库。入库 ≠ Allocate。
              </p>
              <UButton
                label="新建订单"
                icon="i-lucide-plus"
                size="sm"
                color="primary"
                @click="showCreateOrderModal = true"
              />
            </div>
            <UTable v-if="orders.length" :data="orders" :columns="orderColumns">
              <template #external-cell="{ row }">
                <span class="font-mono text-xs">{{ row.original.externalOrderNo || '—' }}</span>
              </template>
              <template #media-cell="{ row }">
                {{ mediaNameById[row.original.mediaId] ?? row.original.mediaId }}
              </template>
              <template #status-cell="{ row }">
                <UBadge :label="row.original.status" variant="subtle" size="xs" />
              </template>
              <template #reminder-cell="{ row }">
                <div
                  v-if="row.original.status === 'PARTIAL_DELIVERED'"
                  class="flex items-center gap-1 flex-wrap"
                >
                  <UInput
                    :model-value="reminderValue(row.original)"
                    type="time"
                    size="xs"
                    class="w-28"
                    @update:model-value="setReminderDraft(row.original.id, String($event ?? ''))"
                  />
                  <UButton
                    label="保存"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    @click="saveReminder(row.original)"
                  />
                  <UButton
                    label="模拟提醒"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :loading="orderActionId === row.original.id"
                    @click="runOrderAction(row.original.id, 'simReminder')"
                  />
                </div>
                <span v-else class="text-xs text-muted">—</span>
              </template>
              <template #actions-cell="{ row }">
                <div class="flex items-center gap-1 flex-wrap">
                  <UButton
                    label="复制摘要"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-copy"
                    @click="copyOrderSummary(row.original)"
                  />
                  <UButton
                    v-if="row.original.status === 'DRAFT'"
                    label="提交"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    :loading="orderActionId === row.original.id"
                    @click="runOrderAction(row.original.id, 'submit')"
                  />
                  <UButton
                    v-if="canSendInquiry(row.original.status)"
                    label="发送模拟询单"
                    size="xs"
                    color="primary"
                    variant="soft"
                    :loading="orderActionId === row.original.id"
                    @click="runOrderAction(row.original.id, 'sendInquiry')"
                  />
                  <UButton
                    v-if="row.original.inquiryMessageId || row.original.status === 'PENDING_CONFIRM'"
                    :label="simOrderId === row.original.id ? '收起模拟' : '模拟面板'"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    @click="toggleSimPanel(row.original)"
                  />
                  <UButton
                    v-if="canManualDelivery(row.original.status)"
                    label="手填交付"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="openDelivery(row.original)"
                  />
                  <UButton
                    v-if="row.original.status === 'PARTIAL_DELIVERED'"
                    label="无法继续交付"
                    size="xs"
                    color="warning"
                    variant="ghost"
                    :loading="orderActionId === row.original.id"
                    @click="runOrderAction(row.original.id, 'closePartial')"
                  />
                  <UButton
                    v-if="canCancelOrder(row.original.status)"
                    label="取消"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :loading="orderActionId === row.original.id"
                    @click="runOrderAction(row.original.id, 'cancel')"
                  />
                </div>
              </template>
            </UTable>
            <p v-else class="text-sm text-muted py-8 text-center">
              暂无渠道订单
            </p>

            <div v-if="simOrder" class="mt-4 grid gap-3 lg:grid-cols-2">
              <ChannelsMockInquiryCard
                v-if="simOrder.status === 'PENDING_CONFIRM'
                  || simOrder.status === 'REJECTED'
                  || simOrder.status === 'TIMEOUT'
                  || simOrder.acceptedAt
                  || simOrder.inquiryMessageId"
                :order="simOrder"
                :media-name="mediaNameById[simOrder.mediaId]"
                @updated="onSimUpdated"
              />
              <ChannelsMockDeliveryPanel
                v-if="canManualDelivery(simOrder.status) && simOrder.inquiryMessageId"
                :order="simOrder"
                @updated="onSimUpdated"
                @delivered="onDelivered"
              />
            </div>
          </template>

          <template v-else-if="activeTab === 'accounts'">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-muted">
                展示前 20 条；完整筛选请到账户中心。
              </p>
              <UButton
                label="在账户中心查看"
                icon="i-lucide-external-link"
                size="xs"
                variant="soft"
                :to="{ path: '/accounts', query: { channelIds: channelId } }"
              />
            </div>
            <UTable v-if="accounts.length" :data="accounts" :columns="accountColumns">
              <template #externalAccountId-cell="{ row }">
                <UButton
                  :label="row.original.externalAccountId"
                  variant="ghost"
                  color="neutral"
                  class="font-mono -px-2"
                  :to="`/accounts/${row.original.id}`"
                />
              </template>
              <template #media-cell="{ row }">
                {{ row.original.media.name }}
              </template>
              <template #spend7d-cell="{ row }">
                {{ formatCurrency(row.original.spend7d) }}
              </template>
            </UTable>
            <p v-else class="text-sm text-muted py-8 text-center">
              该渠道暂无账户
            </p>
          </template>

          <template v-else-if="activeTab === 'assets'">
            <UTable v-if="assets.length" :data="assets" :columns="assetColumns">
              <template #type-cell="{ row }">
                {{ assetTypeNameById[row.original.typeId] ?? row.original.typeId }}
              </template>
              <template #externalId-cell="{ row }">
                <span class="font-mono text-xs">{{ row.original.externalId }}</span>
              </template>
            </UTable>
            <p v-else class="text-sm text-muted py-8 text-center">
              暂无媒体管理资产
            </p>
          </template>

          <template v-else-if="activeTab === 'quality'">
            <div class="space-y-3">
              <p class="text-xs text-muted">
                本渠质量切片（与账户分析同一聚合 API）。Spend = Media Spend only。
              </p>
              <div class="flex flex-wrap items-center gap-3">
                <FiltersQuickFilter
                  v-model="qualityGroupBy"
                  label="行维度"
                  :options="qualityGroupOptions"
                />
                <FiltersPeriodFilter
                  v-model="qualitySpendPeriod"
                  v-model:custom-from="qualityCustomFrom"
                  v-model:custom-to="qualityCustomTo"
                  label="周期"
                />
                <UBadge
                  v-if="qualityResult"
                  :label="`账户 ${qualityResult.meta.totalAccounts}`"
                  variant="subtle"
                  color="primary"
                />
              </div>
              <AnalyticsQualityPivotTable
                :rows="qualityResult?.rows ?? []"
                :group-by="qualityGroupBy"
                :pending="qualityPending"
                :locked-query="{ channelIds: channelId }"
                :dimension-header="qualityGroupOptions.find(i => i.value === qualityGroupBy)?.label ?? 'Dimension'"
              />
            </div>
          </template>

          <template v-else-if="activeTab === 'finance'">
            <ChannelsChannelFinancePanel
              :settlement-year="settlementYear"
              :settlement-month="settlementMonth"
              :settlement-summary="settlementSummary"
              :settlement-rows="settlementRows"
              :payment-addresses="paymentAddresses"
              :prepayments="prepayments"
              :refunds="refunds"
              :policies="feePolicies"
              :tiers-by-policy-id="tiersByPolicyId"
              :policy-code-by-id="policyCodeById"
              :can-pay="activeAddresses.length > 0"
              :fund-summaries="fundSummaries"
              :balance-threshold="balanceThreshold"
              @pay="openPayModal"
              @add-address="openAddressModal()"
              @edit-address="openAddressModal"
              @approve-address="approveAddress"
              @reject-address="rejectAddress"
              @disable-address="disableAddress"
              @add-policy="openPolicyModal()"
              @edit-policy="openPolicyModal"
              @disable-policy="disablePolicy"
              @add-refund="openRefundModal"
              @confirm-refund="confirmRefund"
              @reject-refund="rejectRefund"
              @save-threshold="saveBalanceThreshold"
            />
          </template>

          <template v-else-if="activeTab === 'reconciliation'">
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-highlighted">渠道对账</p>
                  <p class="text-xs text-muted">
                    渠道账单 Media Spend vs 系统月结 Media Spend。差异率超过 5% 会写预警。无账本余额。
                  </p>
                </div>
                <UButton
                  label="新建对账"
                  icon="i-lucide-scale"
                  size="sm"
                  color="primary"
                  @click="openReconModal"
                />
              </div>
              <UTable v-if="reconciliations.length" :data="reconciliations" :columns="reconColumns">
                <template #period-cell="{ row }">
                  {{ row.original.year }}-{{ String(row.original.month).padStart(2, '0') }}
                </template>
                <template #bill-cell="{ row }">
                  {{ formatCurrency(row.original.channelBillMediaSpend) }}
                </template>
                <template #system-cell="{ row }">
                  {{ formatCurrency(row.original.systemMediaSpend) }}
                </template>
                <template #variance-cell="{ row }">
                  {{ formatCurrency(row.original.variance) }}
                </template>
                <template #rate-cell="{ row }">
                  {{
                    row.original.varianceRate == null
                      ? '—'
                      : `${(row.original.varianceRate * 100).toFixed(2)}%`
                  }}
                </template>
                <template #status-cell="{ row }">
                  <UBadge :label="row.original.status" variant="subtle" size="xs" />
                </template>
                <template #actions-cell="{ row }">
                  <UButton
                    v-if="row.original.status === 'OPEN'"
                    label="确认"
                    size="xs"
                    color="success"
                    variant="ghost"
                    @click="confirmReconciliation(row.original)"
                  />
                </template>
              </UTable>
              <p v-else class="text-sm text-muted py-8 text-center">
                暂无对账单。录入渠道账单金额后可与系统消耗比对。
              </p>
            </div>
          </template>

          <template v-else-if="activeTab === 'profile'">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p class="text-xs text-muted">
                主数据只读。编制请到系统管理。
              </p>
              <UButton
                label="编辑渠道"
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
                :to="`/settings/channels?highlight=${detail.channel.id}`"
              />
            </div>
            <div class="grid sm:grid-cols-2 gap-3 text-sm">
              <p>
                <span class="text-muted">Code：</span>
                <span class="font-mono">{{ detail.channel.code }}</span>
              </p>
              <p>
                <span class="text-muted">Status：</span>
                {{ detail.channel.status }}
              </p>
              <p>
                <span class="text-muted">联系人：</span>
                {{ detail.channel.contactName ?? '—' }}
              </p>
              <p>
                <span class="text-muted">Telegram：</span>
                {{ detail.channel.telegramReference ?? '—' }}
              </p>
              <p class="sm:col-span-2">
                <span class="text-muted">备注：</span>
                {{ detail.channel.note ?? '—' }}
              </p>
              <p>
                <span class="text-muted">创建：</span>
                {{ detail.channel.createdAt }}
              </p>
              <p>
                <span class="text-muted">更新：</span>
                {{ detail.channel.updatedAt }}
              </p>
            </div>
          </template>
        </div>
      </template>
    </div>

    <UModal v-model:open="showPayModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="space-y-1">
              <span class="font-semibold text-highlighted">登记打款</span>
              <p class="text-xs text-muted">
                填写渠道已启用地址、业务归属与金额；录入日期由系统生成。
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-lg bg-elevated p-3 text-xs text-muted flex gap-2">
              <UIcon name="i-lucide-clock" class="size-4 shrink-0 mt-0.5" />
              <span>录入后出现在打款明细。不做余额回写与 Excel 导出。</span>
            </div>

            <UFormField label="渠道" required>
              <UInput :model-value="detail?.channel.name" disabled />
            </UFormField>

            <UFormField label="打款地址" required>
              <USelectMenu
                v-model="payAddressId"
                :items="addressOptions"
                value-key="value"
                label-key="label"
                placeholder="选择 ACTIVE 地址"
              />
            </UFormField>

            <div class="grid sm:grid-cols-2 gap-4">
              <UFormField label="业务归属" required>
                <USelectMenu
                  v-model="payOwnership"
                  :items="ownershipOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="自家 / 外接"
                />
              </UFormField>
              <UFormField label="打款金额 (USD)" required>
                <UInput
                  v-model.number="payAmount"
                  type="number"
                  min="1"
                  step="100"
                  placeholder="例如：50000"
                />
              </UFormField>
            </div>

            <UFormField label="备注">
              <UTextarea v-model="payNote" :rows="2" autoresize placeholder="可选" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showPayModal = false" />
              <UButton
                label="确认录入"
                color="primary"
                :disabled="!payAddressId || !payOwnership || !payAmount || payAmount <= 0"
                @click="confirmPay"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showAddressModal">
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">{{ editingAddress ? '变更打款地址' : '新增打款地址' }}</span>
          </template>
          <div class="space-y-4">
            <UFormField label="类型" required>
              <USelectMenu
                v-model="addressType"
                :items="[
                  { label: 'CRYPTO', value: 'CRYPTO' },
                  { label: 'FIAT', value: 'FIAT' }
                ]"
                value-key="value"
                label-key="label"
              />
            </UFormField>
            <UFormField label="标签">
              <UInput v-model="addressLabelField" placeholder="例如 USDT-TRC20" />
            </UFormField>
            <UFormField label="地址 / 收款信息" required>
              <UTextarea v-model="addressPayload" :rows="2" autoresize />
            </UFormField>
            <UFormField label="审核团队" required>
              <USelectMenu
                v-model="addressApproverTeamId"
                :items="teamOptions"
                value-key="value"
                label-key="label"
                placeholder="选择团队负责人所属团队"
              />
            </UFormField>
            <p class="text-xs text-muted">
              提交后进入 PENDING_APPROVAL。通过/驳回由该审核团队的负责人操作（Mock 自动取 leaderMemberId）。
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showAddressModal = false" />
              <UButton
                label="提交审核"
                color="primary"
                :disabled="!addressPayload.trim() || !addressApproverTeamId"
                @click="saveAddress"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showPolicyModal">
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">{{ editingPolicy ? '编辑服务费政策' : '新建服务费政策' }}</span>
          </template>
          <div class="space-y-4">
            <UFormField v-if="!editingPolicy" label="Code" required>
              <UInput v-model="policyCode" placeholder="ALPHA_NEW" />
            </UFormField>
            <UFormField label="Name" required>
              <UInput v-model="policyName" />
            </UFormField>
            <UFormField label="备注">
              <UInput v-model="policyNote" />
            </UFormField>
            <UFormField label="Tiers（每行：min,max,rate%；末档 max 可空）" required>
              <UTextarea v-model="policyTiersText" :rows="4" autoresize class="font-mono text-xs" />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showPolicyModal = false" />
              <UButton
                label="保存"
                color="primary"
                :disabled="!policyName.trim() || (!editingPolicy && !policyCode.trim())"
                @click="savePolicy"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showRefundModal">
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">登记退款</span>
          </template>
          <div class="space-y-4">
            <UFormField label="金额 (USD)" required>
              <UInput v-model.number="refundAmount" type="number" min="1" step="100" />
            </UFormField>
            <UFormField label="原因">
              <UInput v-model="refundReason" />
            </UFormField>
            <UFormField label="备注">
              <UTextarea v-model="refundNote" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showRefundModal = false" />
              <UButton
                label="提交"
                color="primary"
                :disabled="!refundAmount || refundAmount <= 0"
                @click="saveRefund"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showReconModal">
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">
              新建对账 · {{ settlementYear }}-{{ String(settlementMonth).padStart(2, '0') }}
            </span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted">
              系统 Media Spend：{{ formatCurrency(settlementSummary?.mediaSpend ?? 0) }}
            </p>
            <UFormField label="渠道账单 Media Spend (USD)" required>
              <UInput v-model.number="reconBillSpend" type="number" min="0" step="100" />
            </UFormField>
            <UFormField label="差异备注">
              <UTextarea v-model="reconNote" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showReconModal = false" />
              <UButton
                label="创建"
                color="primary"
                :disabled="reconBillSpend == null || reconBillSpend < 0"
                @click="saveReconciliation"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <ChannelsCreateChannelOrderModal
      v-model:open="showCreateOrderModal"
      :locked-channel-id="channelId"
      @created="onOrderCreated"
    />

    <ChannelsConfirmChannelDeliveryModal
      v-model:open="showDeliveryModal"
      :order="deliveryOrder"
      @delivered="onDelivered"
    />
    </template>
  </UDashboardPanel>
</template>
