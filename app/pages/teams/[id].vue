<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { AccountDemandItem, AdAccountListItem } from '~/domain'
import type {
  TeamDemandListItem,
  TeamDetailBundle,
  TeamMemberListItem,
  TeamProductPerformanceItem,
  QualityGroupBy,
  QualityPivotResult,
  QualitySpendPeriod
} from '~/services'
import {
  accountService,
  analyticsService,
  demandService,
  mediaService,
  productService,
  teamService
} from '~/services'
import { formatCurrency } from '~/utils'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

const route = useRoute()
const toast = useToast()

const teamId = computed(() => String(route.params.id ?? ''))

const pending = ref(true)
const notFound = ref(false)
const detail = ref<TeamDetailBundle | null>(null)
const accounts = ref<AdAccountListItem[]>([])
const memberRows = ref<TeamMemberListItem[]>([])
const productRows = ref<TeamProductPerformanceItem[]>([])
const demandRows = ref<TeamDemandListItem[]>([])

const showApplyModal = ref(false)
const editingDemandId = ref<string | null>(null)
const expandedDemandId = ref<string | null>(null)
const expandedItems = ref<AccountDemandItem[]>([])
const mediaNameById = ref<Record<string, string>>({})
const productNameById = ref<Record<string, string>>({})

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Members', value: 'members' },
  { label: 'Product Performance', value: 'products' },
  { label: 'Account Demand', value: 'demands' },
  { label: '质量', value: 'quality' }
]

const activeTab = ref('overview')

const qualityGroupBy = ref<QualityGroupBy>('member')
const qualitySpendPeriod = ref<QualitySpendPeriod>('30D')
const qualityCustomFrom = ref(shiftDate(MOCK_TODAY, -29))
const qualityCustomTo = ref(MOCK_TODAY)
const qualityPending = ref(false)
const qualityResult = ref<QualityPivotResult | null>(null)

const qualityGroupOptions: { label: string, value: QualityGroupBy }[] = [
  { label: 'Member', value: 'member' },
  { label: 'Product', value: 'product' }
]

async function loadQuality() {
  if (!teamId.value) return
  if (qualitySpendPeriod.value === 'CUSTOM' && (!qualityCustomFrom.value || !qualityCustomTo.value)) return
  qualityPending.value = true
  try {
    qualityResult.value = await analyticsService.getQualityPivot({
      groupBy: qualityGroupBy.value,
      spendPeriod: qualitySpendPeriod.value,
      spendRange: qualitySpendPeriod.value === 'CUSTOM'
        ? { from: qualityCustomFrom.value, to: qualityCustomTo.value }
        : undefined,
      teamIds: [teamId.value],
      sortBy: 'accountCount',
      sortOrder: 'desc'
    })
  } finally {
    qualityPending.value = false
  }
}

watch(
  [activeTab, qualityGroupBy, qualitySpendPeriod, qualityCustomFrom, qualityCustomTo, teamId],
  ([tab]) => {
    if (tab === 'quality') void loadQuality()
  }
)

async function loadLookups() {
  const [medias, products] = await Promise.all([
    mediaService.getMediaPlatforms(),
    productService.getProducts()
  ])
  mediaNameById.value = Object.fromEntries(medias.map(item => [item.id, item.name]))
  productNameById.value = Object.fromEntries(products.map(item => [item.id, item.name]))
}

async function load() {
  pending.value = true
  notFound.value = false
  try {
    const bundle = await teamService.getTeamDetail(teamId.value)
    if (!bundle) {
      detail.value = null
      notFound.value = true
      return
    }
    detail.value = bundle
    useSeoMeta({ title: `${bundle.team.name} · 团队详情` })

    const [accountPage, members, products, demands] = await Promise.all([
      accountService.getAccounts({ teamIds: [teamId.value], page: 1, pageSize: 100 }),
      teamService.getTeamMembersWithMetrics(teamId.value),
      teamService.getTeamProductPerformance(teamId.value),
      teamService.getTeamDemands(teamId.value)
    ])
    accounts.value = accountPage.data
    memberRows.value = members
    productRows.value = products
    demandRows.value = demands
  } finally {
    pending.value = false
  }
}

watch(teamId, () => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : 'overview'
  activeTab.value = tabs.some(item => item.value === tab) ? tab : 'overview'
  expandedDemandId.value = null
  expandedItems.value = []
  void loadLookups()
  void load()
}, { immediate: true })

watch(activeTab, (tab) => {
  if (!teamId.value) return
  const current = typeof route.query.tab === 'string' ? route.query.tab : undefined
  if (current === tab || (!current && tab === 'overview')) return
  void navigateTo({
    path: `/teams/${teamId.value}`,
    query: tab === 'overview' ? {} : { tab }
  }, { replace: true })
})

function onApplyAccount() {
  editingDemandId.value = null
  showApplyModal.value = true
}

function onEditDraft(demandId: string) {
  editingDemandId.value = demandId
  showApplyModal.value = true
}

async function onSubmitDraft(demandId: string) {
  try {
    await demandService.submitDemand(demandId)
    toast.add({
      title: '已提交申请',
      description: '状态已变为 SUBMITTED，等待团队负责人审批后才能分配。',
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '提交失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onApproveDemand(demandId: string) {
  const actor = detail.value?.team.leaderMemberId
  if (!actor) {
    toast.add({ title: '该团队没有负责人，不能审批', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  try {
    const demand = await demandService.approveDemand(demandId, actor)
    toast.add({
      title: '需求已通过',
      description: `${demand.demandNo} → APPROVED`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '审批失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onRejectDemand(demandId: string) {
  const actor = detail.value?.team.leaderMemberId
  if (!actor) {
    toast.add({ title: '该团队没有负责人，不能审批', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  try {
    const demand = await demandService.rejectDemand(demandId, actor)
    toast.add({
      title: '需求已驳回',
      description: `${demand.demandNo} → REJECTED`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '驳回失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onCancelDemand(demandId: string) {
  try {
    const result = await demandService.cancelDemand(demandId)
    const auto = result.autoRecycledAccountIds.length
    const manual = result.pendingManualAccountIds.length
    toast.add({
      title: '需求已取消',
      description: `自动回收 ${auto} 户；闲置不超过 1 天的 ${manual} 户需确认回收。`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '取消失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onConfirmIdleRecycle(demandId: string) {
  try {
    const ids = await demandService.confirmManualIdleRecycle(demandId)
    toast.add({
      title: ids.length ? '已确认回收' : '没有待确认的闲置账户',
      description: ids.length ? `${ids.length} 户已回到账户池` : '分配后闲置不超过 1 天，或已有消耗的账户不会自动回收。',
      icon: 'i-lucide-rotate-ccw',
      color: ids.length ? 'success' : 'warning'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '回收失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onDemandSaved(payload: { demandId: string; submitted: boolean }) {
  toast.add({
    title: payload.submitted ? '申请已提交' : '草稿已保存',
    description: payload.submitted
      ? 'Demand 已进入 SUBMITTED，等待后续调度。'
      : '可在 Account Demand Tab 继续编辑或提交。',
    icon: 'i-lucide-check',
    color: 'success'
  })
  activeTab.value = 'demands'
  await load()
}

async function toggleDemandItems(demandId: string) {
  if (expandedDemandId.value === demandId) {
    expandedDemandId.value = null
    expandedItems.value = []
    return
  }
  expandedDemandId.value = demandId
  expandedItems.value = await demandService.getDemandItems(demandId)
}

function usageColor(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warning'
  return 'error'
}

const demandStatusLabel: Record<string, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  APPROVED: '已批准',
  PARTIALLY_ALLOCATED: '部分分配',
  FULFILLED: '已满足',
  REJECTED: '已拒绝',
  CANCELLED: '已取消'
}

const accountColumns: TableColumn<AdAccountListItem>[] = [
  { accessorKey: 'externalAccountId', header: '账户ID' },
  { id: 'media', header: '媒体' },
  { id: 'member', header: '成员' },
  { id: 'product', header: '产品' },
  { accessorKey: 'assetStatus', header: '资产状态' },
  { accessorKey: 'mediaStatus', header: '媒体状态' },
  { id: 'todaySpend', header: 'Today' },
  { id: 'spend7d', header: '7D' }
]

const memberColumns: TableColumn<TeamMemberListItem>[] = [
  { accessorKey: 'name', header: '成员' },
  { accessorKey: 'accounts', header: 'Accounts' },
  { accessorKey: 'inUse', header: 'In Use' },
  { accessorKey: 'idle', header: 'Idle' },
  { id: 'usageRate', header: 'Usage Rate' },
  { id: 'todaySpend', header: 'Today' },
  { id: 'spend7d', header: '7D' }
]

const productColumns: TableColumn<TeamProductPerformanceItem>[] = [
  { accessorKey: 'productName', header: '产品' },
  { id: 'ownershipType', header: '归属' },
  { accessorKey: 'accountCount', header: '账户数' },
  { id: 'spend7d', header: '7D Spend' },
  { id: 'spend30d', header: '30D Spend' }
]

const demandColumns: TableColumn<TeamDemandListItem>[] = [
  { accessorKey: 'demandNo', header: 'Demand No' },
  { id: 'status', header: 'Status' },
  { accessorKey: 'priority', header: 'Priority' },
  { id: 'expectedDate', header: 'Expected' },
  { accessorKey: 'requestedQuantity', header: 'Requested' },
  { accessorKey: 'allocatedQuantity', header: 'Allocated' },
  { id: 'unfulfilledQuantity', header: 'Gap' },
  { id: 'reason', header: 'Reason' },
  { id: 'actions', header: '操作' }
]

function accountCell(row: Row<AdAccountListItem>) {
  return row.original
}
function memberCell(row: Row<TeamMemberListItem>) {
  return row.original
}
function productCell(row: Row<TeamProductPerformanceItem>) {
  return row.original
}
function demandCell(row: Row<TeamDemandListItem>) {
  return row.original
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="团队详情" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/teams"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            label="返回列表"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <TeamsTeamCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <div v-if="pending" class="flex items-center justify-center gap-2 py-20 text-muted text-sm">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载团队详情…
      </div>

      <div
        v-else-if="notFound"
        class="flex flex-col items-center justify-center gap-3 py-20 text-muted"
      >
        <UIcon name="i-lucide-search-x" class="size-10" />
        <p class="text-sm">
          未找到团队 {{ teamId }}
        </p>
        <UButton to="/teams" label="返回团队列表" variant="soft" />
      </div>

      <template v-else-if="detail">
        <TeamsTeamDetailHeader :detail="detail" @apply="onApplyAccount" />

        <UTabs v-model="activeTab" :items="tabs" class="w-full" :content="false" />

        <div class="rounded-lg border border-default p-4">
          <template v-if="activeTab === 'overview'">
            <div class="space-y-6">
              <div>
                <h3 class="text-sm font-medium mb-2">
                  使用摘要
                </h3>
                <div class="grid sm:grid-cols-2 gap-2 text-sm">
                  <p>
                    <span class="text-muted">负责人：</span>
                    {{ detail.leader?.name ?? '—' }}
                  </p>
                  <p>
                    <span class="text-muted">成员数：</span>
                    {{ detail.metrics.memberCount }}
                  </p>
                  <p>
                    <span class="text-muted">7D 自家 / 外接：</span>
                    {{ formatCurrency(detail.metrics.internalSpend7d) }}
                    /
                    {{ formatCurrency(detail.metrics.externalSpend7d) }}
                  </p>
                  <p>
                    <span class="text-muted">未满足需求：</span>
                    <span :class="detail.metrics.unfulfilledDemand > 0 ? 'text-warning font-medium' : ''">
                      {{ detail.metrics.unfulfilledDemand }} 个账户
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-medium">
                    最近需求
                  </h3>
                  <UButton
                    label="查看全部"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    @click="activeTab = 'demands'"
                  />
                </div>
                <div v-if="!detail.recentDemands.length" class="text-sm text-muted py-4 text-center">
                  暂无需求记录
                </div>
                <ul v-else class="space-y-2">
                  <li
                    v-for="d in detail.recentDemands"
                    :key="d.id"
                    class="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-default pb-2 last:border-0"
                  >
                    <div>
                      <span class="font-mono text-highlighted">{{ d.demandNo }}</span>
                      <span class="text-muted ms-2">{{ demandStatusLabel[d.status] ?? d.status }}</span>
                    </div>
                    <span :class="d.unfulfilledQuantity > 0 ? 'text-warning' : 'text-muted'">
                      缺口 {{ d.unfulfilledQuantity }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'accounts'">
            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              title="团队账户与成员分配"
              class="mb-4"
              description="打开账户详情 → Assignment 标签，可为成员分配 / 取消访问权限。Team Manager 可见本团队全部账户；Member 仅见自己接入或被分配的账户。"
            />
            <div v-if="!accounts.length" class="text-sm text-muted py-8 text-center">
              该团队当前无归属账户
            </div>
            <UTable v-else :data="accounts" :columns="accountColumns">
              <template #externalAccountId-cell="{ row }">
                <UButton
                  :label="accountCell(row).externalAccountId"
                  variant="ghost"
                  color="neutral"
                  class="font-mono text-sm -px-2 -py-1"
                  :to="`/accounts/${accountCell(row).id}`"
                />
              </template>
              <template #media-cell="{ row }">
                <UBadge :label="accountCell(row).media.name" variant="subtle" color="neutral" size="xs" />
              </template>
              <template #member-cell="{ row }">
                {{ accountCell(row).member?.name ?? '—' }}
              </template>
              <template #product-cell="{ row }">
                {{ accountCell(row).product?.name ?? '—' }}
              </template>
              <template #todaySpend-cell="{ row }">
                {{ formatCurrency(accountCell(row).todaySpend) }}
              </template>
              <template #spend7d-cell="{ row }">
                {{ formatCurrency(accountCell(row).spend7d) }}
              </template>
            </UTable>
          </template>

          <template v-else-if="activeTab === 'members'">
            <div v-if="!memberRows.length" class="text-sm text-muted py-8 text-center">
              暂无成员
            </div>
            <UTable v-else :data="memberRows" :columns="memberColumns">
              <template #name-cell="{ row }">
                <div>
                  <p class="font-medium text-highlighted">
                    {{ memberCell(row).name }}
                  </p>
                  <p class="text-xs text-muted font-mono">
                    {{ memberCell(row).code }}
                  </p>
                </div>
              </template>
              <template #usageRate-cell="{ row }">
                <UBadge
                  :label="`${memberCell(row).usageRate}%`"
                  :color="usageColor(memberCell(row).usageRate)"
                  variant="subtle"
                  size="xs"
                />
              </template>
              <template #todaySpend-cell="{ row }">
                {{ formatCurrency(memberCell(row).todaySpend) }}
              </template>
              <template #spend7d-cell="{ row }">
                {{ formatCurrency(memberCell(row).spend7d) }}
              </template>
            </UTable>
          </template>

          <template v-else-if="activeTab === 'products'">
            <div v-if="!productRows.length" class="text-sm text-muted py-8 text-center">
              当前归属账户无产品绑定
            </div>
            <UTable v-else :data="productRows" :columns="productColumns">
              <template #ownershipType-cell="{ row }">
                <UBadge
                  :label="productCell(row).ownershipType === 'INTERNAL' ? '自家' : '外接'"
                  variant="subtle"
                  :color="productCell(row).ownershipType === 'INTERNAL' ? 'primary' : 'neutral'"
                  size="xs"
                />
              </template>
              <template #spend7d-cell="{ row }">
                {{ formatCurrency(productCell(row).spend7d) }}
              </template>
              <template #spend30d-cell="{ row }">
                {{ formatCurrency(productCell(row).spend30d) }}
              </template>
            </UTable>
          </template>

          <template v-else-if="activeTab === 'demands'">
            <TeamsTeamDemandsPanel
              :demand-rows="demandRows"
              :expanded-demand-id="expandedDemandId"
              :expanded-items="expandedItems"
              :media-name-by-id="mediaNameById"
              :product-name-by-id="productNameById"
              :leader-member-id="detail.team.leaderMemberId"
              @apply="onApplyAccount"
              @toggle="toggleDemandItems"
              @edit="onEditDraft"
              @submit="onSubmitDraft"
              @approve="onApproveDemand"
              @reject="onRejectDemand"
              @cancel="onCancelDemand"
              @confirm-recycle="onConfirmIdleRecycle"
            />
          </template>

          <template v-else-if="activeTab === 'quality'">
            <div class="space-y-3">
              <p class="text-xs text-muted">
                本团质量切片（与账户分析同一聚合 API）。Spend = Media Spend only。
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
                :locked-query="{ teamIds: teamId }"
                :dimension-header="qualityGroupOptions.find(i => i.value === qualityGroupBy)?.label ?? 'Dimension'"
              />
            </div>
          </template>
        </div>

        <TeamsApplyAccountDemandModal
          :key="`${teamId}:${editingDemandId ?? 'new'}`"
          v-model:open="showApplyModal"
          :team-id="teamId"
          :demand-id="editingDemandId"
          @saved="onDemandSaved"
        />
      </template>
    </div>
    </template>
  </UDashboardPanel>
</template>
