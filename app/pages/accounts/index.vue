<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type {
  AccountAssetStatus,
  AccountMediaStatus,
  AccountQuery,
  AccountStats,
  AdAccountListItem,
  ProductOwnership
} from '~/domain'
import {
  accountService,
  channelService,
  mediaService,
  productService,
  teamService
} from '~/services'
import { formatCurrency } from '~/utils'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

type SpendPeriod = 'TODAY' | '7D' | '30D' | 'CUSTOM'

useSeoMeta({ title: '全部账户' })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const {
  userId: currentViewerUserId,
  member: currentMember,
  canAllocateAccounts,
  canChangeAccountManager
} = useCurrentUser()

const { query, activeChips, setFilters, clearFilters, removeFilter } = useAccountFilters({
  page: 1,
  pageSize: 20
})

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
const channels = await channelService.getChannels()
const teams = await teamService.getTeams()
const members = await teamService.getMembers()
const products = await productService.getProducts()

const mediaFilterOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
]

const assetStatusQuickOptions = [
  { label: '全部状态', value: 'all' },
  { label: '可用', value: 'AVAILABLE' },
  { label: '已分配', value: 'ASSIGNED' },
  { label: '使用中', value: 'IN_USE' },
  { label: '闲置', value: 'IDLE' },
  { label: '停用', value: 'DISABLED' },
  { label: '归档', value: 'ARCHIVED' }
]

const ownershipQuickOptions = [
  { label: '全部归属', value: 'all' },
  { label: '自家', value: 'INTERNAL' },
  { label: '外接', value: 'EXTERNAL' }
]

const advancedMediaOptions = mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
const advancedChannelOptions = channels.map(item => ({ label: item.name, value: item.id }))

const keyword = computed({
  get: () => query.value.keyword ?? '',
  set: (value: string) => { void setFilters({ keyword: value || undefined }) }
})

const quickMedia = computed({
  get: () => query.value.mediaIds?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ mediaIds: value === 'all' ? undefined : [value] })
  }
})

const quickAssetStatus = computed({
  get: () => query.value.assetStatuses?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({
      assetStatuses: value === 'all' ? undefined : [value as AccountAssetStatus]
    })
  }
})

const quickOwnership = computed({
  get: () => query.value.productOwnership ?? 'all',
  set: (value: string) => {
    void setFilters({
      productOwnership: value === 'all' ? undefined : value as ProductOwnership
    })
  }
})

const spendPeriod = computed({
  get: (): SpendPeriod => {
    const value = typeof route.query.period === 'string' ? route.query.period : '7D'
    if (value === 'TODAY' || value === '7D' || value === '30D' || value === 'CUSTOM') return value
    return '7D'
  },
  set: (value: SpendPeriod) => {
    void applyPeriod(value)
  }
})

const customFrom = computed({
  get: () => query.value.spendRange?.from,
  set: (value: string | undefined) => {
    if (spendPeriod.value !== 'CUSTOM') return
    const to = query.value.spendRange?.to ?? MOCK_TODAY
    void setFilters({
      spendRange: value ? { from: value, to } : undefined
    })
  }
})

const customTo = computed({
  get: () => query.value.spendRange?.to,
  set: (value: string | undefined) => {
    if (spendPeriod.value !== 'CUSTOM') return
    const from = query.value.spendRange?.from ?? shiftDate(MOCK_TODAY, -6)
    void setFilters({
      spendRange: value ? { from, to: value } : undefined
    })
  }
})

async function applyPeriod(period: SpendPeriod) {
  const nextQuery: Record<string, string | string[] | undefined | null> = {
    ...route.query as Record<string, string | string[] | undefined | null>,
    period: period === '7D' ? undefined : period,
    page: undefined
  }
  if (period === 'CUSTOM') {
    const from = query.value.spendRange?.from ?? shiftDate(MOCK_TODAY, -6)
    const to = query.value.spendRange?.to ?? MOCK_TODAY
    nextQuery.spendFrom = from
    nextQuery.spendTo = to
    await router.replace({ query: nextQuery })
    return
  }
  delete nextQuery.spendFrom
  delete nextQuery.spendTo
  await router.replace({ query: nextQuery })
}

const advancedOpen = ref(false)
const draftMediaIds = ref<string[]>([])
const draftChannelIds = ref<string[]>([])
const draftAssetStatuses = ref<AccountAssetStatus[]>([])
const draftOwnership = ref<ProductOwnership | undefined>()
const draftHasNote = ref<boolean | undefined>()
const draftSpendLimitMin = ref<number | undefined>()
const draftSpendLimitMax = ref<number | undefined>()
const draftAmountSpentMin = ref<number | undefined>()
const draftAmountSpentMax = ref<number | undefined>()

watch(advancedOpen, (open) => {
  if (!open) return
  draftMediaIds.value = [...(query.value.mediaIds ?? [])]
  draftChannelIds.value = [...(query.value.channelIds ?? [])]
  draftAssetStatuses.value = [...(query.value.assetStatuses ?? [])]
  draftOwnership.value = query.value.productOwnership
  draftHasNote.value = query.value.hasNote
  draftSpendLimitMin.value = query.value.spendLimitMin
  draftSpendLimitMax.value = query.value.spendLimitMax
  draftAmountSpentMin.value = query.value.amountSpentMin
  draftAmountSpentMax.value = query.value.amountSpentMax
})

async function applyAdvanced() {
  await setFilters({
    mediaIds: draftMediaIds.value.length ? draftMediaIds.value : undefined,
    channelIds: draftChannelIds.value.length ? draftChannelIds.value : undefined,
    assetStatuses: draftAssetStatuses.value.length ? draftAssetStatuses.value : undefined,
    productOwnership: draftOwnership.value,
    hasNote: draftHasNote.value,
    spendLimitMin: draftSpendLimitMin.value,
    spendLimitMax: draftSpendLimitMax.value,
    amountSpentMin: draftAmountSpentMin.value,
    amountSpentMax: draftAmountSpentMax.value
  })
}

async function resetAdvanced() {
  draftMediaIds.value = []
  draftChannelIds.value = []
  draftAssetStatuses.value = []
  draftOwnership.value = undefined
  draftHasNote.value = undefined
  draftSpendLimitMin.value = undefined
  draftSpendLimitMax.value = undefined
  draftAmountSpentMin.value = undefined
  draftAmountSpentMax.value = undefined
  await setFilters({
    mediaIds: undefined,
    channelIds: undefined,
    assetStatuses: undefined,
    productOwnership: undefined,
    hasNote: undefined,
    spendLimitMin: undefined,
    spendLimitMax: undefined,
    amountSpentMin: undefined,
    amountSpentMax: undefined
  })
}

function buildListQuery(): AccountQuery {
  const base = { ...query.value, viewerUserId: currentViewerUserId.value }
  if (spendPeriod.value === 'CUSTOM' && base.spendRange) return base
  const { spendRange: _omit, ...rest } = base
  return rest
}

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const rows = ref<AdAccountListItem[]>([])
const stats = ref<AccountStats | null>(null)
const total = ref(0)
const totalPages = ref(1)

async function loadAccounts() {
  pending.value = true
  errorMessage.value = null
  try {
    const listQuery = buildListQuery()
    const [list, nextStats] = await Promise.all([
      accountService.getAccounts(listQuery),
      accountService.getAccountStats(listQuery)
    ])
    rows.value = list.data
    total.value = list.pagination.total
    totalPages.value = list.pagination.totalPages
    stats.value = nextStats
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载账户失败'
    rows.value = []
    stats.value = null
  } finally {
    pending.value = false
  }
}

watch(
  () => [route.query, spendPeriod.value, currentViewerUserId.value] as const,
  () => { void loadAccounts() },
  { immediate: true, deep: true }
)

const page = computed({
  get: () => query.value.page ?? 1,
  set: (value: number) => { void setFilters({ page: value }, { resetPage: false }) }
})

const periodSpendHeader = computed(() => {
  if (spendPeriod.value === 'TODAY') return '今日消耗'
  if (spendPeriod.value === '30D') return '近30日消耗'
  if (spendPeriod.value === 'CUSTOM') return '周期消耗'
  return '近7日消耗'
})

function periodSpendOf(item: AdAccountListItem): number | null {
  if (spendPeriod.value === 'TODAY') return item.todaySpend
  if (spendPeriod.value === '30D') return item.spend30d
  if (spendPeriod.value === 'CUSTOM') return item.selectedPeriodSpend ?? null
  return item.spend7d
}

function moneyOrDash(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatCurrency(value)
}

const assetStatusLabel: Record<AccountAssetStatus, string> = {
  AVAILABLE: '可用',
  ASSIGNED: '已分配',
  IN_USE: '使用中',
  IDLE: '闲置',
  DISABLED: '停用',
  ARCHIVED: '归档'
}

const assetStatusColor: Record<AccountAssetStatus, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  AVAILABLE: 'neutral',
  ASSIGNED: 'info',
  IN_USE: 'success',
  IDLE: 'warning',
  DISABLED: 'neutral',
  ARCHIVED: 'neutral'
}

const mediaStatusLabel: Record<AccountMediaStatus, string> = {
  ACTIVE: '正常',
  RESTRICTED: '受限',
  DISABLED: '停用',
  BANNED: '封禁',
  UNKNOWN: '未知'
}

const mediaStatusColor: Record<AccountMediaStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  RESTRICTED: 'warning',
  DISABLED: 'neutral',
  BANNED: 'error',
  UNKNOWN: 'neutral'
}

function productLabel(item: AdAccountListItem): string {
  if (!item.product) return '—'
  if (item.product.ownershipType === 'EXTERNAL' && item.customer) {
    return `${item.product.name} · 外接 · ${item.customer.name}`
  }
  if (item.product.ownershipType === 'EXTERNAL') {
    return `${item.product.name} · 外接`
  }
  return `${item.product.name} · 自家`
}

function isAssigned(item: AdAccountListItem): boolean {
  return item.team != null || item.member != null
}

function isDisabled(item: AdAccountListItem): boolean {
  return item.assetStatus === 'DISABLED'
}

/** Read-model mirror of isInAccountPool for list actions. */
function isPoolEligible(item: AdAccountListItem): boolean {
  return item.assetStatus === 'AVAILABLE'
    && item.mediaStatus === 'ACTIVE'
    && item.team == null
}

const selectedAccount = ref<AdAccountListItem | null>(null)
const showTransferModal = ref(false)
const showRecycleModal = ref(false)
const showDisableModal = ref(false)
const showAssignModal = ref(false)
const showProductModal = ref(false)
const showManagerModal = ref(false)

const transferTargetTeamId = ref<string | undefined>()
const transferTargetMemberId = ref<string | undefined>()
const transferReason = ref('')
const recycleReason = ref('')
/** Multi-select for batch lifecycle (transfer / recycle / assign / disable / product / manager). */
const selectedIds = ref<string[]>([])
const showBatchRecycleModal = ref(false)
const showBatchTransferModal = ref(false)
const showBatchAssignModal = ref(false)
const showBatchDisableModal = ref(false)
const showBatchProductModal = ref(false)
const showBatchManagerModal = ref(false)
const batchRecycleReason = ref('')
const batchDisableReason = ref('')
const batchBusy = ref(false)
const disableReason = ref('')
const assignTargetTeamId = ref<string | undefined>()
const assignTargetMemberId = ref<string | undefined>()
const assignManagerId = ref<string | undefined>()
const assignProductId = ref<string | undefined>()
const assignReason = ref('')
const changeProductId = ref<string | undefined>()
const changeProductReason = ref('')
const changeManagerId = ref<string | undefined>()
const changeManagerReason = ref('')

const targetTeamMembers = computed(() => {
  if (!transferTargetTeamId.value) return []
  return members.filter(item => item.teamId === transferTargetTeamId.value)
})

const assignTeamMembers = computed(() => {
  if (!assignTargetTeamId.value) return []
  return members.filter(item => item.teamId === assignTargetTeamId.value)
})

const productOptions = computed(() =>
  products.map(item => ({
    label: item.ownershipType === 'EXTERNAL' ? `${item.name} · 外接` : `${item.name} · 自家`,
    value: item.id
  }))
)

const managerOptions = computed(() =>
  members.map(item => ({ label: item.name, value: item.id }))
)

const canConfirmAssign = computed(() =>
  Boolean(
    assignTargetTeamId.value
    && assignTargetMemberId.value
    && assignManagerId.value
    && assignProductId.value
  )
)

watch(assignTargetTeamId, () => {
  assignTargetMemberId.value = undefined
})

function isSelectable(item: AdAccountListItem): boolean {
  return !isDisabled(item) && item.assetStatus !== 'ARCHIVED'
}

function openDetail(account: AdAccountListItem) {
  void navigateTo(`/accounts/${account.id}`)
}

function openTransfer(account: AdAccountListItem) {
  selectedAccount.value = account
  transferTargetTeamId.value = undefined
  transferTargetMemberId.value = undefined
  transferReason.value = ''
  showTransferModal.value = true
}

function openRecycle(account: AdAccountListItem) {
  selectedAccount.value = account
  recycleReason.value = ''
  showRecycleModal.value = true
}

function toggleSelect(id: string) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedIds.value = [...set]
}

const selectedRows = computed(() =>
  rows.value.filter(item => selectedIds.value.includes(item.id))
)

const transferableSelected = computed(() =>
  selectedRows.value.filter(item => isAssigned(item) && !isDisabled(item))
)

const recyclableSelected = computed(() => transferableSelected.value)

const assignableSelected = computed(() =>
  selectedRows.value.filter(item => isPoolEligible(item))
)

const disableableSelected = computed(() =>
  selectedRows.value.filter(item => !isDisabled(item))
)

const productableSelected = computed(() => disableableSelected.value)
const managerableSelected = computed(() => disableableSelected.value)

const selectableOnPage = computed(() => rows.value.filter(isSelectable))

const allPageSelected = computed(() =>
  selectableOnPage.value.length > 0
  && selectableOnPage.value.every(item => selectedIds.value.includes(item.id))
)

function toggleSelectAllPage(value: boolean | 'indeterminate') {
  const pageIds = selectableOnPage.value.map(item => item.id)
  if (value === true) {
    selectedIds.value = [...new Set([...selectedIds.value, ...pageIds])]
  } else {
    const drop = new Set(pageIds)
    selectedIds.value = selectedIds.value.filter(id => !drop.has(id))
  }
}

function clearSelection() {
  selectedIds.value = []
}

async function runBatch(
  title: string,
  targets: AdAccountListItem[],
  action: (account: AdAccountListItem) => Promise<void>,
  successDescription: (ok: number) => string
) {
  if (!targets.length || batchBusy.value) return
  batchBusy.value = true
  const failures: string[] = []
  let ok = 0
  for (const account of targets) {
    try {
      await action(account)
      ok += 1
    } catch (error) {
      failures.push(`${account.externalAccountId}: ${error instanceof Error ? error.message : '失败'}`)
    }
  }
  batchBusy.value = false
  clearSelection()
  toast.add({
    title: failures.length ? `${title}部分完成` : `${title}完成`,
    description: failures.length
      ? `成功 ${ok} 户。${failures.slice(0, 3).join('；')}`
      : successDescription(ok),
    color: failures.length ? 'warning' : 'success',
    icon: failures.length ? 'i-lucide-alert-circle' : 'i-lucide-check'
  })
  await loadAccounts()
}

function openBatchRecycle() {
  if (!recyclableSelected.value.length) return
  batchRecycleReason.value = ''
  showBatchRecycleModal.value = true
}

function openBatchTransfer() {
  if (!transferableSelected.value.length) return
  transferTargetTeamId.value = undefined
  transferTargetMemberId.value = undefined
  transferReason.value = ''
  showBatchTransferModal.value = true
}

function openBatchAssign() {
  if (!assignableSelected.value.length) return
  assignTargetTeamId.value = undefined
  assignTargetMemberId.value = undefined
  assignManagerId.value = undefined
  assignProductId.value = undefined
  assignReason.value = ''
  showBatchAssignModal.value = true
}

function openBatchDisable() {
  if (!disableableSelected.value.length) return
  batchDisableReason.value = ''
  showBatchDisableModal.value = true
}

function openBatchProduct() {
  if (!productableSelected.value.length) return
  changeProductId.value = undefined
  changeProductReason.value = ''
  showBatchProductModal.value = true
}

function openBatchManager() {
  if (!canChangeAccountManager.value) {
    toast.add({
      title: '无权限',
      description: '仅平台管理员、组织管理员或团队负责人可更换户管',
      color: 'error',
      icon: 'i-lucide-shield-off'
    })
    return
  }
  if (!managerableSelected.value.length) return
  changeManagerId.value = undefined
  changeManagerReason.value = ''
  showBatchManagerModal.value = true
}

async function confirmBatchRecycle() {
  const targets = [...recyclableSelected.value]
  const reason = batchRecycleReason.value.trim()
  if (!targets.length || !reason) return
  showBatchRecycleModal.value = false
  await runBatch(
    '批量回收',
    targets,
    account => accountService.recycleAccount({
      accountId: account.id,
      reason,
      createdBy: 'mem-lisi'
    }),
    ok => `${ok} 户已回到账户池`
  )
}

async function confirmBatchTransfer() {
  const targets = [...transferableSelected.value]
  const teamId = transferTargetTeamId.value
  const reason = transferReason.value.trim()
  if (!targets.length || !teamId || !reason) return
  const team = teams.find(item => item.id === teamId)
  const member = members.find(item => item.id === transferTargetMemberId.value)
  showBatchTransferModal.value = false
  await runBatch(
    '批量转移',
    targets,
    account => accountService.transferAccount({
      accountId: account.id,
      teamId,
      memberId: transferTargetMemberId.value,
      reason,
      createdBy: 'mem-lisi'
    }),
    ok => `${ok} 户 → ${team?.name ?? ''}${member ? ` / ${member.name}` : ''}`
  )
}

async function confirmBatchAssign() {
  const targets = [...assignableSelected.value]
  const teamId = assignTargetTeamId.value
  const memberId = assignTargetMemberId.value
  const managerId = assignManagerId.value
  const productId = assignProductId.value
  if (!targets.length || !teamId || !memberId || !managerId || !productId || batchBusy.value) return
  if (!canAllocateAccounts.value || !currentMember.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  batchBusy.value = true
  showBatchAssignModal.value = false
  try {
    await accountService.assignDirect({
      accountIds: targets.map(item => item.id),
      teamId,
      memberId,
      managerId,
      productId,
      reason: assignReason.value.trim() || null,
      createdBy: currentMember.value.id,
      actorUserId: currentViewerUserId.value
    })
    const team = teams.find(item => item.id === teamId)
    clearSelection()
    toast.add({
      title: '批量分配完成',
      description: `${targets.length} 户 → ${team?.name ?? teamId}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '批量分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    batchBusy.value = false
  }
}

async function confirmBatchDisable() {
  const targets = [...disableableSelected.value]
  const reason = batchDisableReason.value.trim()
  if (!targets.length || !reason) return
  showBatchDisableModal.value = false
  await runBatch(
    '批量停用',
    targets,
    account => accountService.disableAccount({
      accountId: account.id,
      reason,
      createdBy: 'mem-lisi'
    }),
    ok => `${ok} 户已停用`
  )
}

async function confirmBatchProduct() {
  const targets = [...productableSelected.value]
  const productId = changeProductId.value
  if (!targets.length || !productId) return
  const product = products.find(item => item.id === productId)
  showBatchProductModal.value = false
  await runBatch(
    '批量更换产品',
    targets,
    account => accountService.changeProduct({
      accountId: account.id,
      productId,
      reason: changeProductReason.value.trim() || undefined,
      createdBy: 'mem-lisi'
    }),
    ok => `${ok} 户 → ${product?.name ?? productId}`
  )
}

async function confirmBatchManager() {
  if (!canChangeAccountManager.value) {
    toast.add({
      title: '无权限',
      description: '仅平台管理员、组织管理员或团队负责人可更换户管',
      color: 'error',
      icon: 'i-lucide-shield-off'
    })
    return
  }
  const targets = [...managerableSelected.value]
  const managerMemberId = changeManagerId.value
  if (!targets.length || !managerMemberId) return
  const manager = members.find(item => item.id === managerMemberId)
  showBatchManagerModal.value = false
  await runBatch(
    '批量更换户管',
    targets,
    account => accountService.changeManager({
      accountId: account.id,
      managerMemberId,
      reason: changeManagerReason.value.trim() || undefined,
      createdBy: currentMember.value?.id ?? 'unknown',
      actorUserId: currentViewerUserId.value
    }),
    ok => `${ok} 户 → ${manager?.name ?? managerMemberId}`
  )
}

function openDisable(account: AdAccountListItem) {
  selectedAccount.value = account
  disableReason.value = ''
  showDisableModal.value = true
}

function openAssign(account: AdAccountListItem) {
  selectedAccount.value = account
  assignTargetTeamId.value = undefined
  assignTargetMemberId.value = undefined
  assignManagerId.value = undefined
  assignProductId.value = undefined
  assignReason.value = ''
  showAssignModal.value = true
}

function openChangeProduct(account: AdAccountListItem) {
  selectedAccount.value = account
  changeProductId.value = account.product?.id
  changeProductReason.value = ''
  showProductModal.value = true
}

function openChangeManager(account: AdAccountListItem) {
  if (!canChangeAccountManager.value) {
    toast.add({
      title: '无权限',
      description: '仅平台管理员、组织管理员或团队负责人可更换户管',
      color: 'error',
      icon: 'i-lucide-shield-off'
    })
    return
  }
  selectedAccount.value = account
  changeManagerId.value = account.manager?.id
  changeManagerReason.value = ''
  showManagerModal.value = true
}

async function confirmTransfer() {
  if (!selectedAccount.value || !transferTargetTeamId.value || !transferReason.value.trim()) return
  const account = selectedAccount.value
  const team = teams.find(item => item.id === transferTargetTeamId.value)
  const member = members.find(item => item.id === transferTargetMemberId.value)
  try {
    await accountService.transferAccount({
      accountId: account.id,
      teamId: transferTargetTeamId.value,
      memberId: transferTargetMemberId.value,
      reason: transferReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showTransferModal.value = false
    toast.add({
      title: '转移成功',
      description: `${account.externalAccountId} → ${team?.name ?? ''}${member ? ` / ${member.name}` : ''}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '转移失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmRecycle() {
  if (!selectedAccount.value || !recycleReason.value.trim()) return
  const account = selectedAccount.value
  try {
    await accountService.recycleAccount({
      accountId: account.id,
      reason: recycleReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showRecycleModal.value = false
    toast.add({
      title: '回收成功',
      description: `${account.externalAccountId} 已回到账户池`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '回收失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmDisable() {
  if (!selectedAccount.value || !disableReason.value.trim()) return
  const account = selectedAccount.value
  try {
    await accountService.disableAccount({
      accountId: account.id,
      reason: disableReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showDisableModal.value = false
    toast.add({
      title: '停用成功',
      description: `${account.externalAccountId} 已停用`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '停用失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmAssign() {
  if (
    !selectedAccount.value
    || !assignTargetTeamId.value
    || !assignTargetMemberId.value
    || !assignManagerId.value
    || !assignProductId.value
  ) return
  if (!canAllocateAccounts.value || !currentMember.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  const account = selectedAccount.value
  const team = teams.find(item => item.id === assignTargetTeamId.value)
  const targetMember = members.find(item => item.id === assignTargetMemberId.value)
  try {
    await accountService.assignDirect({
      accountIds: [account.id],
      teamId: assignTargetTeamId.value,
      memberId: assignTargetMemberId.value,
      managerId: assignManagerId.value,
      productId: assignProductId.value,
      reason: assignReason.value.trim() || undefined,
      createdBy: currentMember.value.id,
      actorUserId: currentViewerUserId.value
    })
    showAssignModal.value = false
    toast.add({
      title: '分配成功',
      description: `${account.externalAccountId} → ${team?.name ?? ''}${targetMember ? ` / ${targetMember.name}` : ''}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmChangeProduct() {
  if (!selectedAccount.value || !changeProductId.value) return
  const account = selectedAccount.value
  const product = products.find(item => item.id === changeProductId.value)
  try {
    await accountService.changeProduct({
      accountId: account.id,
      productId: changeProductId.value,
      reason: changeProductReason.value.trim() || undefined,
      createdBy: 'mem-lisi'
    })
    showProductModal.value = false
    toast.add({
      title: '产品已更新',
      description: `${account.externalAccountId} → ${product?.name ?? changeProductId.value}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '更换产品失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmChangeManager() {
  if (!canChangeAccountManager.value) {
    toast.add({
      title: '无权限',
      description: '仅平台管理员、组织管理员或团队负责人可更换户管',
      color: 'error',
      icon: 'i-lucide-shield-off'
    })
    return
  }
  if (!selectedAccount.value || !changeManagerId.value) return
  const account = selectedAccount.value
  const manager = members.find(item => item.id === changeManagerId.value)
  try {
    await accountService.changeManager({
      accountId: account.id,
      managerMemberId: changeManagerId.value,
      reason: changeManagerReason.value.trim() || undefined,
      createdBy: currentMember.value?.id ?? 'unknown',
      actorUserId: currentViewerUserId.value
    })
    showManagerModal.value = false
    toast.add({
      title: '户管已更新',
      description: `${account.externalAccountId} → ${manager?.name ?? changeManagerId.value}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAccounts()
  } catch (error) {
    toast.add({
      title: '更换户管失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

function moreItems(account: AdAccountListItem) {
  const disabled = isDisabled(account)
  const primary: {
    label: string
    icon: string
    disabled?: boolean
    onSelect: () => void
  }[] = [{
    label: '详情',
    icon: 'i-lucide-eye',
    onSelect: () => openDetail(account)
  }]
  if (canAllocateAccounts.value) {
    primary.push({
      label: '分配',
      icon: 'i-lucide-user-plus',
      disabled: disabled || !isPoolEligible(account),
      onSelect: () => openAssign(account)
    })
  }
  primary.push({
    label: '回收',
    icon: 'i-lucide-rotate-ccw',
    disabled: disabled || !isAssigned(account),
    onSelect: () => openRecycle(account)
  })
  return [primary, [
    {
      label: '更换产品',
      icon: 'i-lucide-package',
      disabled,
      onSelect: () => openChangeProduct(account)
    },
    ...(canChangeAccountManager.value
      ? [{
          label: '更换户管',
          icon: 'i-lucide-user-cog',
          disabled,
          onSelect: () => openChangeManager(account)
        }]
      : []),
    {
      label: '停用',
      icon: 'i-lucide-ban',
      disabled,
      onSelect: () => openDisable(account)
    }
  ]]
}

const columns: TableColumn<AdAccountListItem>[] = [{
  id: 'select',
  header: ''
}, {
  accessorKey: 'externalAccountId',
  header: '账户ID'
}, {
  accessorKey: 'media',
  header: '媒体'
}, {
  accessorKey: 'channel',
  header: '渠道'
}, {
  id: 'platformAsset',
  header: '管理资产'
}, {
  accessorKey: 'timezone',
  header: '时区'
}, {
  id: 'serviceFeePolicy',
  header: '费率政策'
}, {
  id: 'product',
  header: '产品'
}, {
  id: 'team',
  header: '团队'
}, {
  id: 'member',
  header: '成员'
}, {
  id: 'manager',
  header: '户管'
}, {
  accessorKey: 'assetStatus',
  header: '资产状态'
}, {
  accessorKey: 'mediaStatus',
  header: '媒体状态'
}, {
  id: 'spendLimit',
  header: '消耗上限'
}, {
  id: 'amountSpent',
  header: '已花费'
}, {
  id: 'remainingLimit',
  header: '剩余额度'
}, {
  id: 'effectiveRemaining',
  header: '有效可消耗'
}, {
  id: 'periodSpend',
  header: () => periodSpendHeader.value
}, {
  id: 'lastSpendAt',
  header: '最近消耗'
}, {
  id: 'idleDays',
  header: '闲置天数'
}, {
  id: 'receivedAt',
  header: '入库'
}, {
  id: 'note',
  header: '备注'
}, {
  id: 'actions',
  header: '操作'
}]

function cellAccount(row: Row<AdAccountListItem>): AdAccountListItem {
  return row.original
}

const exportColumns = [
  { key: 'externalAccountId', header: '账户ID' },
  { key: 'accountName', header: '名称' },
  { key: 'media', header: '媒体' },
  { key: 'channel', header: '渠道' },
  { key: 'timezone', header: '时区' },
  { key: 'product', header: '产品' },
  { key: 'team', header: '团队' },
  { key: 'member', header: '成员' },
  { key: 'manager', header: '户管' },
  { key: 'assetStatus', header: '资产状态' },
  { key: 'mediaStatus', header: '媒体状态' },
  { key: 'spendLimit', header: '消耗上限' },
  { key: 'amountSpent', header: '已花费' },
  { key: 'effectiveRemaining', header: '有效可消耗' },
  { key: 'spend7d', header: '7D Spend' },
  { key: 'note', header: '备注' }
]

function mapExportRow(item: AdAccountListItem) {
  return {
    externalAccountId: item.externalAccountId,
    accountName: item.accountName ?? '',
    media: item.media.name,
    channel: item.channel.name,
    timezone: item.timezone ?? '',
    product: item.product?.name ?? '',
    team: item.team?.name ?? '',
    member: item.member?.name ?? '',
    manager: item.manager?.name ?? '',
    assetStatus: item.assetStatus,
    mediaStatus: item.mediaStatus,
    spendLimit: item.spendLimit ?? '',
    amountSpent: item.amountSpent,
    effectiveRemaining: item.effectiveRemaining ?? '',
    spend7d: item.spend7d,
    note: item.note ?? ''
  }
}

/** Page through the filtered result set so large exports stay memory-friendly. */
async function* getExportRows() {
  const pageSize = 500
  let page = 1
  for (;;) {
    const list = await accountService.getAccounts({
      ...buildListQuery(),
      page,
      pageSize
    })
    if (!list.data.length) break
    yield list.data.map(mapExportRow)
    if (list.data.length < pageSize) break
    page += 1
  }
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <FiltersEntitySearch v-model="keyword" class="w-48 lg:w-64" />
          <UButton
            icon="i-lucide-sliders-horizontal"
            color="neutral"
            variant="ghost"
            label="高级筛选"
            @click="advancedOpen = true"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-shield"
        title="按当前用户权限过滤"
        description="列表经 AccountAccessService 过滤。左下角可切换 Mock 身份：李四（成员）仅见分配账户且不可更换户管；王五（Org Admin）可见全部并可更换户管。"
      />
      <div class="flex flex-wrap items-center gap-3">
        <FiltersQuickFilter v-model="quickMedia" label="媒体" :options="mediaFilterOptions" />
        <FiltersQuickFilter v-model="quickAssetStatus" label="状态" :options="assetStatusQuickOptions" />
        <FiltersQuickFilter v-model="quickOwnership" label="归属" :options="ownershipQuickOptions" />
        <AccountsSpendPeriodSelect
          v-model="spendPeriod"
          v-model:custom-from="customFrom"
          v-model:custom-to="customTo"
        />
        <UBadge
          v-if="stats"
          :label="`${stats.total} 个账户`"
          variant="subtle"
          color="neutral"
        />
        <UBadge
          v-if="stats"
          :label="`使用中 ${stats.inUse}`"
          variant="subtle"
          color="success"
        />
        <UBadge
          v-if="stats"
          :label="`有备注 ${stats.withNote}`"
          variant="subtle"
          color="warning"
        />
        <FiltersExportFilteredButton
          filename-prefix="accounts"
          :columns="exportColumns"
          :get-rows="getExportRows"
        />
        <UDropdownMenu
          v-if="selectedIds.length"
          :items="[[
            ...(canAllocateAccounts
              ? [{
                  label: `分配 (${assignableSelected.length})`,
                  icon: 'i-lucide-user-plus',
                  disabled: !assignableSelected.length,
                  onSelect: openBatchAssign
                }]
              : []),
            {
              label: `转移 (${transferableSelected.length})`,
              icon: 'i-lucide-arrow-right-left',
              disabled: !transferableSelected.length,
              onSelect: openBatchTransfer
            },
            {
              label: `回收 (${recyclableSelected.length})`,
              icon: 'i-lucide-rotate-ccw',
              disabled: !recyclableSelected.length,
              onSelect: openBatchRecycle
            }
          ], [
            {
              label: `更换产品 (${productableSelected.length})`,
              icon: 'i-lucide-package',
              disabled: !productableSelected.length,
              onSelect: openBatchProduct
            },
            ...(canChangeAccountManager
              ? [{
                  label: `更换户管 (${managerableSelected.length})`,
                  icon: 'i-lucide-user-cog',
                  disabled: !managerableSelected.length,
                  onSelect: openBatchManager
                }]
              : [])
          ], [
            {
              label: `停用 (${disableableSelected.length})`,
              icon: 'i-lucide-ban',
              disabled: !disableableSelected.length,
              onSelect: openBatchDisable
            }
          ]]"
        >
          <UButton
            :label="`批量操作 (${selectedIds.length})`"
            icon="i-lucide-settings-2"
            size="xs"
            color="primary"
            variant="soft"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
        <UButton
          v-if="selectedIds.length"
          label="清除选择"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="clearSelection"
        />
      </div>

      <FiltersActiveFilterChips
        :chips="activeChips"
        @remove="removeFilter"
        @clear="clearFilters"
      />

      <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {{ errorMessage }}
        <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadAccounts" />
      </div>

      <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载账户中…
      </div>

      <div
        v-else-if="!rows.length"
        class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
      >
        <UIcon name="i-lucide-inbox" class="size-8" />
        <p>没有符合条件的账户</p>
        <UButton
          v-if="activeChips.length"
          size="xs"
          variant="soft"
          label="清除筛选"
          @click="clearFilters"
        />
      </div>

      <template v-else>
        <UTable :data="rows" :columns="columns" class="shrink-0">
          <template #select-header>
            <UCheckbox
              :model-value="allPageSelected
                ? true
                : (selectableOnPage.some(a => selectedIds.includes(a.id)) ? 'indeterminate' : false)"
              :disabled="!selectableOnPage.length"
              @update:model-value="toggleSelectAllPage"
            />
          </template>
          <template #select-cell="{ row }">
            <UCheckbox
              :model-value="selectedIds.includes(cellAccount(row).id)"
              :disabled="!isSelectable(cellAccount(row))"
              @update:model-value="toggleSelect(cellAccount(row).id)"
            />
          </template>
          <template #externalAccountId-cell="{ row }">
            <div class="min-w-36">
              <NuxtLink
                :to="`/accounts/${cellAccount(row).id}`"
                class="font-mono text-sm text-highlighted hover:text-primary hover:underline transition-colors"
              >
                {{ cellAccount(row).externalAccountId }}
              </NuxtLink>
              <p class="text-xs text-muted truncate">
                {{ cellAccount(row).accountName ?? '—' }}
              </p>
            </div>
          </template>

          <template #media-cell="{ row }">
            <UBadge :label="cellAccount(row).media.name" variant="subtle" color="neutral" size="xs" />
          </template>

          <template #channel-cell="{ row }">
            <NuxtLink
              :to="`/channels/${cellAccount(row).channel.id}`"
              class="text-highlighted hover:text-primary hover:underline transition-colors"
            >
              {{ cellAccount(row).channel.name }}
            </NuxtLink>
          </template>

          <template #platformAsset-cell="{ row }">
            <span v-if="cellAccount(row).platformAsset" class="font-mono text-xs">
              {{ cellAccount(row).platformAsset!.typeName }}
              {{ cellAccount(row).platformAsset!.externalId }}
            </span>
            <span v-else>—</span>
          </template>

          <template #timezone-cell="{ row }">
            <span class="text-xs">{{ cellAccount(row).timezone ?? '—' }}</span>
          </template>

          <template #serviceFeePolicy-cell="{ row }">
            <span class="text-xs">{{ cellAccount(row).serviceFeePolicy?.name ?? '—' }}</span>
          </template>

          <template #product-cell="{ row }">
            <span class="text-xs">{{ productLabel(cellAccount(row)) }}</span>
          </template>

          <template #team-cell="{ row }">
            <NuxtLink
              v-if="cellAccount(row).team"
              :to="`/teams/${cellAccount(row).team.id}`"
              class="text-highlighted hover:text-primary hover:underline transition-colors"
            >
              {{ cellAccount(row).team.name }}
            </NuxtLink>
            <span v-else>—</span>
          </template>

          <template #member-cell="{ row }">
            <span>{{ cellAccount(row).member?.name ?? '—' }}</span>
          </template>

          <template #manager-cell="{ row }">
            <span>{{ cellAccount(row).manager?.name ?? '—' }}</span>
          </template>

          <template #assetStatus-cell="{ row }">
            <UBadge
              :label="assetStatusLabel[cellAccount(row).assetStatus]"
              :color="assetStatusColor[cellAccount(row).assetStatus]"
              variant="subtle"
              size="xs"
            />
          </template>

          <template #mediaStatus-cell="{ row }">
            <UBadge
              :label="mediaStatusLabel[cellAccount(row).mediaStatus]"
              :color="mediaStatusColor[cellAccount(row).mediaStatus]"
              variant="subtle"
              size="xs"
            />
          </template>

          <template #spendLimit-cell="{ row }">
            <span class="font-mono text-xs">{{ moneyOrDash(cellAccount(row).spendLimit) }}</span>
          </template>

          <template #amountSpent-cell="{ row }">
            <span class="font-mono text-xs">{{ formatCurrency(cellAccount(row).amountSpent) }}</span>
          </template>

          <template #remainingLimit-cell="{ row }">
            <span class="font-mono text-xs">{{ moneyOrDash(cellAccount(row).remainingLimit) }}</span>
          </template>
          <template #effectiveRemaining-cell="{ row }">
            <span class="font-mono text-xs">{{ moneyOrDash(cellAccount(row).effectiveRemaining) }}</span>
          </template>

          <template #periodSpend-cell="{ row }">
            <span class="font-mono text-xs">{{ moneyOrDash(periodSpendOf(cellAccount(row))) }}</span>
          </template>

          <template #lastSpendAt-cell="{ row }">
            <span class="text-xs">
              {{ cellAccount(row).lastSpendAt?.slice(0, 10) ?? '—' }}
            </span>
          </template>

          <template #idleDays-cell="{ row }">
            <span class="text-xs">
              {{ (() => {
                const lastSpendAt = cellAccount(row).lastSpendAt
                if (!lastSpendAt) return '—'
                const lastSpend = new Date(lastSpendAt)
                const today = new Date(MOCK_TODAY)
                const diffMs = today.getTime() - lastSpend.getTime()
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                const days = diffDays >= 0 ? diffDays : 0
                if (days === 0) return '今日'
                if (days === 1) return '1天'
                return `${days}天`
              })() }}
            </span>
          </template>

          <template #receivedAt-cell="{ row }">
            <span class="text-xs">{{ cellAccount(row).receivedAt ?? '—' }}</span>
          </template>

          <template #note-cell="{ row }">
            <UTooltip v-if="cellAccount(row).note" :text="cellAccount(row).note!">
              <UIcon name="i-lucide-sticky-note" class="size-4 text-warning" />
            </UTooltip>
            <span v-else class="text-muted">—</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UButton
                v-if="isAssigned(cellAccount(row)) && !isDisabled(cellAccount(row))"
                label="转移"
                icon="i-lucide-arrow-right-left"
                color="info"
                variant="ghost"
                size="xs"
                @click="openTransfer(cellAccount(row))"
              />
              <UDropdownMenu :items="moreItems(cellAccount(row))">
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>

        <div class="flex justify-end">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="query.pageSize ?? 20"
            :sibling-count="1"
          />
        </div>
      </template>
    </div>

    <FiltersAdvancedFilterDrawer
      v-model:open="advancedOpen"
      v-model:media-ids="draftMediaIds"
      v-model:channel-ids="draftChannelIds"
      v-model:asset-statuses="draftAssetStatuses"
      v-model:product-ownership="draftOwnership"
      v-model:has-note="draftHasNote"
      v-model:spend-limit-min="draftSpendLimitMin"
      v-model:spend-limit-max="draftSpendLimitMax"
      v-model:amount-spent-min="draftAmountSpentMin"
      v-model:amount-spent-max="draftAmountSpentMax"
      :media-options="advancedMediaOptions"
      :channel-options="advancedChannelOptions"
      @apply="applyAdvanced"
      @reset="resetAdvanced"
    />

    <UModal v-model:open="showTransferModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-arrow-right-left" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">转移账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>

            <div class="text-sm">
              <span class="text-muted">当前: </span>
              <span class="text-highlighted">{{ selectedAccount.team?.name ?? '未分配' }}</span>
              <span v-if="selectedAccount.member" class="text-muted"> / {{ selectedAccount.member.name }}</span>
              <span class="text-muted"> · 户管 {{ selectedAccount.manager?.name ?? '—' }}</span>
            </div>

            <USeparator />

            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="transferTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>

            <UFormField label="目标成员" description="可选；划转使用权不自动改变户管。">
              <USelectMenu
                v-model="transferTargetMemberId"
                :items="targetTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!transferTargetTeamId"
              />
            </UFormField>

            <UFormField label="转移原因" required>
              <UTextarea
                v-model="transferReason"
                placeholder="请说明转移原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showTransferModal = false" />
              <UButton
                label="确认转移"
                icon="i-lucide-arrow-right-left"
                color="info"
                :disabled="!transferTargetTeamId || !transferReason.trim()"
                @click="confirmTransfer"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showRecycleModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-rotate-ccw" class="size-5 text-warning" />
              <span class="font-semibold text-highlighted">回收账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-lg bg-elevated p-3 text-sm">
              <p class="text-warning font-medium mb-1">
                确认回收？
              </p>
              <p class="text-muted">
                将结束当前团队归属，账户回到可分配池。
              </p>
            </div>

            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>

            <UFormField label="回收原因" required>
              <UTextarea
                v-model="recycleReason"
                placeholder="请说明回收原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showRecycleModal = false" />
              <UButton
                label="确认回收"
                icon="i-lucide-rotate-ccw"
                color="warning"
                :disabled="!recycleReason.trim()"
                @click="confirmRecycle"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchRecycleModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-rotate-ccw" class="size-5 text-warning" />
              <span class="font-semibold text-highlighted">批量回收</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将结束 {{ recyclableSelected.length }} 个已分配账户的当前归属，逐户回收到账户池。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in recyclableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="回收原因" required>
              <UTextarea
                v-model="batchRecycleReason"
                placeholder="请说明回收原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchRecycleModal = false" />
              <UButton
                label="确认批量回收"
                icon="i-lucide-rotate-ccw"
                color="warning"
                :loading="batchBusy"
                :disabled="!batchRecycleReason.trim()"
                @click="confirmBatchRecycle"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchTransferModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-arrow-right-left" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">批量转移</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将 {{ transferableSelected.length }} 个已分配账户转移到同一目标团队。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in transferableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="transferTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>
            <UFormField label="目标成员" description="可选">
              <USelectMenu
                v-model="transferTargetMemberId"
                :items="targetTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :clear="true"
                :disabled="!transferTargetTeamId"
              />
            </UFormField>
            <UFormField label="转移原因" required>
              <UTextarea
                v-model="transferReason"
                placeholder="请说明转移原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchTransferModal = false" />
              <UButton
                label="确认批量转移"
                icon="i-lucide-arrow-right-left"
                color="info"
                :loading="batchBusy"
                :disabled="!transferTargetTeamId || !transferReason.trim()"
                @click="confirmBatchTransfer"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchAssignModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="size-5 text-primary" />
              <span class="font-semibold text-highlighted">批量分配</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将 {{ assignableSelected.length }} 个池内账户直接分配到同一团队。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in assignableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="assignTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>
            <UFormField label="目标成员" required>
              <USelectMenu
                v-model="assignTargetMemberId"
                :items="assignTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!assignTargetTeamId"
              />
            </UFormField>
            <UFormField label="户管" required>
              <USelectMenu
                v-model="assignManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>
            <UFormField label="产品" required>
              <USelectMenu
                v-model="assignProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>
            <UFormField label="分配原因">
              <UTextarea
                v-model="assignReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchAssignModal = false" />
              <UButton
                label="确认批量分配"
                icon="i-lucide-user-plus"
                color="primary"
                :loading="batchBusy"
                :disabled="!canConfirmAssign"
                @click="confirmBatchAssign"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchDisableModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-ban" class="size-5 text-error" />
              <span class="font-semibold text-highlighted">批量停用</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将停用 {{ disableableSelected.length }} 个账户；有归属会先结束，不会进入账户池。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in disableableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="停用原因" required>
              <UTextarea
                v-model="batchDisableReason"
                placeholder="请说明停用原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchDisableModal = false" />
              <UButton
                label="确认批量停用"
                icon="i-lucide-ban"
                color="error"
                :loading="batchBusy"
                :disabled="!batchDisableReason.trim()"
                @click="confirmBatchDisable"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchProductModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-package" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">批量更换产品</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将 {{ productableSelected.length }} 个账户统一更换到同一产品。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in productableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="新产品" required>
              <USelectMenu
                v-model="changeProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>
            <UFormField label="原因">
              <UTextarea
                v-model="changeProductReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchProductModal = false" />
              <UButton
                label="确认批量更换"
                icon="i-lucide-package"
                color="info"
                :loading="batchBusy"
                :disabled="!changeProductId"
                @click="confirmBatchProduct"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showBatchManagerModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-cog" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">批量更换户管</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              将 {{ managerableSelected.length }} 个账户统一更换到同一户管。
            </p>
            <ul class="text-xs font-mono space-y-1 max-h-32 overflow-auto">
              <li v-for="account in managerableSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
            <UFormField label="新户管" required>
              <USelectMenu
                v-model="changeManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>
            <UFormField label="原因">
              <UTextarea
                v-model="changeManagerReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showBatchManagerModal = false" />
              <UButton
                label="确认批量更换"
                icon="i-lucide-user-cog"
                color="info"
                :loading="batchBusy"
                :disabled="!changeManagerId"
                @click="confirmBatchManager"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showDisableModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-ban" class="size-5 text-error" />
              <span class="font-semibold text-highlighted">停用账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-lg bg-elevated p-3 text-sm">
              <p class="text-error font-medium mb-1">
                确认停用？
              </p>
              <p class="text-muted">
                将结束当前归属（如有），资产状态变为停用，不会进入账户池。
              </p>
            </div>

            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>

            <UFormField label="停用原因" required>
              <UTextarea
                v-model="disableReason"
                placeholder="请说明停用原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showDisableModal = false" />
              <UButton
                label="确认停用"
                icon="i-lucide-ban"
                color="error"
                :disabled="!disableReason.trim()"
                @click="confirmDisable"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showAssignModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="size-5 text-primary" />
              <span class="font-semibold text-highlighted">分配账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>

            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="assignTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>

            <UFormField label="目标成员" required>
              <USelectMenu
                v-model="assignTargetMemberId"
                :items="assignTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!assignTargetTeamId"
              />
            </UFormField>

            <UFormField label="户管" required>
              <USelectMenu
                v-model="assignManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>

            <UFormField label="产品" required>
              <USelectMenu
                v-model="assignProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>

            <UFormField label="分配原因">
              <UTextarea
                v-model="assignReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showAssignModal = false" />
              <UButton
                label="确认分配"
                icon="i-lucide-user-plus"
                color="primary"
                :disabled="!canConfirmAssign"
                @click="confirmAssign"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showProductModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-package" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">更换产品</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>
            <div class="text-sm">
              <span class="text-muted">当前产品: </span>
              <span class="text-highlighted">{{ selectedAccount.product?.name ?? '—' }}</span>
            </div>

            <UFormField label="新产品" required>
              <USelectMenu
                v-model="changeProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>

            <UFormField label="原因">
              <UTextarea
                v-model="changeProductReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showProductModal = false" />
              <UButton
                label="确认更换"
                icon="i-lucide-package"
                color="info"
                :disabled="!changeProductId"
                @click="confirmChangeProduct"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showManagerModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-cog" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">更换户管</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.externalAccountId }}</span>
            </div>
            <div class="text-sm">
              <span class="text-muted">当前户管: </span>
              <span class="text-highlighted">{{ selectedAccount.manager?.name ?? '—' }}</span>
            </div>

            <UFormField label="新户管" required>
              <USelectMenu
                v-model="changeManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>

            <UFormField label="原因">
              <UTextarea
                v-model="changeManagerReason"
                placeholder="可选说明..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showManagerModal = false" />
              <UButton
                label="确认更换"
                icon="i-lucide-user-cog"
                color="info"
                :disabled="!changeManagerId"
                @click="confirmChangeManager"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
    </template>
  </UDashboardPanel>
</template>
