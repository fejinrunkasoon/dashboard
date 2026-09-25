<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Alert, AlertQuery, AlertSeverity, AlertStatus } from '~/domain'
import { isShortageAlertType } from '~/domain'
import { alertService, demandService } from '~/services'
import {
  ALERT_TYPE_LABEL,
  ALERT_SEVERITY_LABEL,
  ALERT_STATUS_LABEL,
  ALERT_ENTITY_TYPE_LABEL,
  labelOf
} from '~/utils/labels'

useSeoMeta({ title: '预警与待办' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const ASSIGNEE = 'mem-lisi'

const typeFilterOptions = [
  { label: '全部类型', value: 'all' },
  { label: '团队账户缺口', value: 'TEAM_ACCOUNT_SHORTAGE' },
  { label: '账户池缺口', value: 'POOL_SHORTAGE' },
  { label: '账户封禁', value: 'ACCOUNT_BANNED' },
  { label: '48小时无消耗', value: 'NO_SPEND_48H' },
  { label: '需求逾期', value: 'DEMAND_OVERDUE' },
  { label: 'API访问失效', value: 'API_ACCESS_LOST' },
  { label: '同步失败', value: 'SYNC_FAILED' },
  { label: '凭据过期', value: 'CREDENTIAL_EXPIRED' },
  { label: '对账差异', value: 'RECONCILIATION_VARIANCE' },
  { label: '渠道余额不足', value: 'CHANNEL_BALANCE_LOW' }
]

const severityFilterOptions = [
  { label: '全部级别', value: 'all' },
  { label: '紧急', value: 'URGENT' },
  { label: '警告', value: 'WARNING' },
  { label: '信息', value: 'INFO' }
]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待处理', value: 'OPEN' },
  { label: '处理中', value: 'IN_PROGRESS' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '已忽略', value: 'IGNORED' }
]

const assignedOptions = [
  { label: '全部认领', value: 'all' },
  { label: '已认领', value: 'yes' },
  { label: '未认领', value: 'no' }
]

const entityTypeOptions = [
  { label: '全部实体', value: 'all' },
  { label: '广告账户', value: 'AdAccount' },
  { label: '账户需求', value: 'AccountDemand' },
  { label: '团队', value: 'Team' },
  { label: '渠道', value: 'Channel' },
  { label: '同步任务', value: 'SyncJob' }
]

function asArray(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return String(value).split(',').map(part => part.trim()).filter(Boolean)
}

function asNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const query = computed<AlertQuery>(() => {
  const q = route.query
  return {
    keyword: typeof q.keyword === 'string' ? q.keyword : undefined,
    types: asArray(q.types).length ? asArray(q.types) : undefined,
    severities: asArray(q.severities).length
      ? asArray(q.severities) as AlertSeverity[]
      : undefined,
    statuses: asArray(q.statuses).length
      ? asArray(q.statuses) as AlertStatus[]
      : undefined,
    entityType: typeof q.entityType === 'string' && q.entityType ? q.entityType : undefined,
    assigned: q.assigned === 'yes' ? true : q.assigned === 'no' ? false : undefined,
    page: asNumber(q.page) ?? 1,
    pageSize: asNumber(q.pageSize) ?? 20
  }
})

async function setFilters(
  patch: Partial<AlertQuery>,
  options: { resetPage?: boolean } = {}
) {
  const resetPage = options.resetPage !== false
  const next: AlertQuery = { ...query.value, ...patch }
  if (resetPage && patch.page == null) next.page = 1

  const routeQuery: Record<string, string | string[]> = {}
  if (next.keyword?.trim()) routeQuery.keyword = next.keyword.trim()
  if (next.types?.length) routeQuery.types = next.types
  if (next.severities?.length) routeQuery.severities = next.severities
  if (next.statuses?.length) routeQuery.statuses = next.statuses
  if (next.entityType) routeQuery.entityType = next.entityType
  if (next.assigned === true) routeQuery.assigned = 'yes'
  else if (next.assigned === false) routeQuery.assigned = 'no'
  if ((next.page ?? 1) > 1) routeQuery.page = String(next.page)
  if ((next.pageSize ?? 20) !== 20) routeQuery.pageSize = String(next.pageSize)

  await router.replace({ query: routeQuery })
}

function clearFilters() {
  void setFilters({
    keyword: undefined,
    types: undefined,
    severities: undefined,
    statuses: undefined,
    entityType: undefined,
    assigned: undefined,
    page: 1
  })
}

function removeFilter(key: string) {
  if (key === 'keyword') void setFilters({ keyword: undefined })
  else if (key === 'types') void setFilters({ types: undefined })
  else if (key === 'severities') void setFilters({ severities: undefined })
  else if (key === 'statuses') void setFilters({ statuses: undefined })
  else if (key === 'entityType') void setFilters({ entityType: undefined })
  else if (key === 'assigned') void setFilters({ assigned: undefined })
}

const keyword = computed({
  get: () => query.value.keyword ?? '',
  set: (value: string) => { void setFilters({ keyword: value || undefined }) }
})

const quickType = computed({
  get: () => query.value.types?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ types: value === 'all' ? undefined : [value] })
  }
})

const quickSeverity = computed({
  get: () => query.value.severities?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({
      severities: value === 'all' ? undefined : [value as AlertSeverity]
    })
  }
})

const quickStatus = computed({
  get: () => query.value.statuses?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({
      statuses: value === 'all' ? undefined : [value as AlertStatus]
    })
  }
})

const quickAssigned = computed({
  get: () => {
    if (query.value.assigned === true) return 'yes'
    if (query.value.assigned === false) return 'no'
    return 'all'
  },
  set: (value: string) => {
    void setFilters({
      assigned: value === 'yes' ? true : value === 'no' ? false : undefined
    })
  }
})

const advancedOpen = ref(false)
const draftEntityType = ref('all')

watch(advancedOpen, (open) => {
  if (open) draftEntityType.value = query.value.entityType || 'all'
})

function applyAdvanced() {
  void setFilters({
    entityType: draftEntityType.value === 'all' ? undefined : draftEntityType.value
  })
}

function resetAdvanced() {
  draftEntityType.value = 'all'
  void setFilters({ entityType: undefined })
}

const page = computed({
  get: () => query.value.page ?? 1,
  set: (value: number) => { void setFilters({ page: value }, { resetPage: false }) }
})

const activeChips = computed(() => {
  const chips: { key: string, label: string }[] = []
  const q = query.value
  if (q.keyword?.trim()) chips.push({ key: 'keyword', label: `搜索: ${q.keyword}` })
  if (q.types?.length) chips.push({ key: 'types', label: `类型: ${q.types.join(', ')}` })
  if (q.severities?.length) {
    chips.push({ key: 'severities', label: `级别: ${q.severities.join(', ')}` })
  }
  if (q.statuses?.length) {
    chips.push({ key: 'statuses', label: `状态: ${q.statuses.join(', ')}` })
  }
  if (q.assigned === true) chips.push({ key: 'assigned', label: '已认领' })
  if (q.assigned === false) chips.push({ key: 'assigned', label: '未认领' })
  if (q.entityType) chips.push({ key: 'entityType', label: `实体: ${q.entityType}` })
  return chips
})

const { openAlertCount, refreshOpenAlertCount } = useDashboard()

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const rows = ref<Alert[]>([])
const total = ref(0)
const totalPages = ref(1)

const selectedAlert = ref<Alert | null>(null)
const showDetail = ref(false)
const actionNote = ref('')
const actionPending = ref(false)

async function loadAlerts() {
  pending.value = true
  errorMessage.value = null
  try {
    const [result] = await Promise.all([
      alertService.getAlerts({ ...query.value }),
      refreshOpenAlertCount()
    ])
    rows.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载预警失败'
    rows.value = []
    total.value = 0
    totalPages.value = 1
  } finally {
    pending.value = false
  }
}

watch(
  () => query.value,
  () => { void loadAlerts() },
  { immediate: true, deep: true }
)

function openDetail(alert: Alert) {
  selectedAlert.value = alert
  actionNote.value = ''
  showDetail.value = true
}

async function runAction(action: 'acknowledge' | 'resolve' | 'ignore' | 'reopen') {
  if (!selectedAlert.value || actionPending.value) return
  actionPending.value = true
  try {
    let updated: Alert
    if (action === 'acknowledge') {
      updated = await alertService.acknowledge(selectedAlert.value.id, ASSIGNEE)
    } else if (action === 'resolve') {
      updated = await alertService.resolve(selectedAlert.value.id, actionNote.value)
    } else if (action === 'ignore') {
      updated = await alertService.ignore(selectedAlert.value.id, actionNote.value)
    } else {
      updated = await alertService.reopen(selectedAlert.value.id)
    }
    selectedAlert.value = updated
    toast.add({
      title: '已更新预警',
      description: `${updated.type} → ${updated.status}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadAlerts()
  } catch (error) {
    toast.add({
      title: '操作失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    actionPending.value = false
  }
}

function goAllocate(alert: Alert) {
  if (!alert.relatedDemandItemId) return
  void navigateTo({
    path: '/accounts/scheduling',
    query: { demandItemId: alert.relatedDemandItemId }
  })
}

function goCreateOrder(alert: Alert) {
  if (!alert.relatedDemandItemId) return
  void navigateTo({
    path: '/accounts/scheduling',
    query: {
      demandItemId: alert.relatedDemandItemId,
      openOrder: '1'
    }
  })
}

async function goRelatedOrder(orderId: string) {
  const page = await demandService.getChannelAccountOrders({ page: 1, pageSize: 200 })
  const order = page.data.find(item => item.id === orderId)
  if (!order) {
    toast.add({
      title: '订单未找到',
      description: orderId,
      color: 'warning',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  void navigateTo({
    path: `/channels/${order.channelId}`,
    query: { tab: 'orders' }
  })
}

function entityLink(alert: Alert): string | null {
  if (alert.entityType === 'AdAccount') return `/accounts/${alert.entityId}`
  if (alert.entityType === 'Team') return `/teams/${alert.entityId}`
  if (alert.entityType === 'Channel') return `/channels/${alert.entityId}`
  if (alert.entityType === 'SyncJob') {
    return `/settings/sync?jobId=${encodeURIComponent(alert.entityId)}`
  }
  if (alert.entityType === 'AccountDemand') {
    if (alert.relatedDemandItemId) {
      return `/accounts/scheduling?demandItemId=${encodeURIComponent(alert.relatedDemandItemId)}`
    }
    return '/accounts/scheduling'
  }
  return null
}

function relatedDemandLink(alert: Alert): string | null {
  if (alert.relatedDemandItemId) {
    return `/accounts/scheduling?demandItemId=${encodeURIComponent(alert.relatedDemandItemId)}`
  }
  if (alert.relatedDemandId) return '/accounts/scheduling'
  return null
}

const severityColor = (severity: AlertSeverity) => {
  if (severity === 'URGENT') return 'error'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

const statusColor = (status: AlertStatus) => {
  if (status === 'OPEN') return 'error'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'RESOLVED') return 'success'
  return 'neutral'
}

const columns: TableColumn<Alert>[] = [
  { accessorKey: 'type', header: '类型' },
  { accessorKey: 'severity', header: '级别' },
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'entityType', header: '实体' },
  { accessorKey: 'status', header: '状态' },
  { id: 'assignee', header: '处理人' },
  { id: 'detectedAt', header: '发现时间' },
  { id: 'actions', header: '操作' }
]

function cell(row: Row<Alert>): Alert {
  return row.original
}

const exportColumns = [
  { key: 'type', header: '类型' },
  { key: 'severity', header: '级别' },
  { key: 'title', header: '标题' },
  { key: 'entityType', header: '实体' },
  { key: 'entityId', header: '实体 ID' },
  { key: 'status', header: '状态' },
  { key: 'assigneeUserId', header: '处理人' },
  { key: 'detectedAt', header: '发现时间' }
]

async function getExportRows() {
  const result = await alertService.getAlerts({
    ...query.value,
    page: 1,
    pageSize: 5000
  })
  return result.data.map(item => ({
    type: item.type,
    severity: item.severity,
    title: item.title,
    entityType: item.entityType,
    entityId: item.entityId,
    status: item.status,
    assigneeUserId: item.assigneeUserId ?? '',
    detectedAt: item.detectedAt
  }))
}

const hasActiveFilters = computed(() => activeChips.value.length > 0)
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="预警与待办" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            :label="`待处理 ${openAlertCount}`"
            variant="subtle"
            color="warning"
          />
          <FiltersEntitySearch
            v-model="keyword"
            placeholder="搜索标题 / 描述 / 类型"
            class="w-48 lg:w-64"
          />
          <UButton
            icon="i-lucide-sliders-horizontal"
            color="neutral"
            variant="ghost"
            label="高级筛选"
            @click="advancedOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <FiltersQuickFilter v-model="quickType" label="类型" :options="typeFilterOptions" />
          <FiltersQuickFilter v-model="quickSeverity" label="级别" :options="severityFilterOptions" />
          <FiltersQuickFilter v-model="quickStatus" label="状态" :options="statusFilterOptions" />
          <FiltersQuickFilter v-model="quickAssigned" label="认领" :options="assignedOptions" />
          <UBadge :label="`共 ${total}`" variant="subtle" color="primary" />
          <FiltersExportFilteredButton
            filename-prefix="alerts"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>

        <FiltersActiveFilterChips
          :chips="activeChips"
          @remove="removeFilter"
          @clear="clearFilters"
        />

        <p class="text-xs text-muted">
          预警闭环：发现 → 认领处理 → 业务动作（分配 / 建单）→ 解决。调度 Shortage 会幂等同步正式 Shortage Alert。
        </p>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadAlerts" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载预警…
        </div>

        <div
          v-else-if="!rows.length"
          class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
        >
          <UIcon name="i-lucide-inbox" class="size-8" />
          <p>{{ hasActiveFilters ? '无匹配的预警' : '暂无预警' }}</p>
          <UButton
            v-if="hasActiveFilters"
            size="xs"
            variant="soft"
            label="清除筛选"
            @click="clearFilters"
          />
        </div>

        <template v-else>
          <UTable :data="rows" :columns="columns" class="shrink-0">
            <template #type-cell="{ row }">
              <span class="text-xs">{{ labelOf(ALERT_TYPE_LABEL, cell(row).type) }}</span>
            </template>
            <template #severity-cell="{ row }">
              <UBadge
                :label="labelOf(ALERT_SEVERITY_LABEL, cell(row).severity)"
                variant="subtle"
                :color="severityColor(cell(row).severity)"
                size="xs"
              />
            </template>
            <template #title-cell="{ row }">
              <div class="min-w-48">
                <UButton
                  :label="cell(row).title"
                  variant="ghost"
                  color="neutral"
                  class="font-medium -px-2 -py-1"
                  @click="openDetail(cell(row))"
                />
                <p class="text-xs text-muted truncate ps-2">
                  {{ cell(row).description }}
                </p>
              </div>
            </template>
            <template #entityType-cell="{ row }">
              <NuxtLink
                v-if="entityLink(cell(row))"
                :to="entityLink(cell(row))!"
                class="text-xs text-primary hover:underline"
                @click.stop
              >
                {{ labelOf(ALERT_ENTITY_TYPE_LABEL, cell(row).entityType) }} / {{ cell(row).entityId }}
              </NuxtLink>
              <span v-else class="text-xs">
                {{ labelOf(ALERT_ENTITY_TYPE_LABEL, cell(row).entityType) }} / {{ cell(row).entityId }}
              </span>
            </template>
            <template #status-cell="{ row }">
              <UBadge
                :label="labelOf(ALERT_STATUS_LABEL, cell(row).status)"
                variant="subtle"
                :color="statusColor(cell(row).status)"
                size="xs"
              />
            </template>
            <template #assignee-cell="{ row }">
              <span class="text-xs">{{ cell(row).assigneeUserId ?? '—' }}</span>
            </template>
            <template #detectedAt-cell="{ row }">
              <span class="text-xs">{{ cell(row).detectedAt.slice(0, 16).replace('T', ' ') }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex items-center gap-1 flex-wrap">
                <UButton
                  label="详情"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="openDetail(cell(row))"
                />
                <UButton
                  v-if="isShortageAlertType(cell(row).type) && cell(row).relatedDemandItemId"
                  label="去分配"
                  size="xs"
                  color="primary"
                  variant="ghost"
                  @click="goAllocate(cell(row))"
                />
              </div>
            </template>
          </UTable>

          <div class="flex items-center justify-between gap-3 pt-2">
            <p class="text-xs text-muted">
              第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条
            </p>
            <UPagination
              v-model="page"
              :total="total"
              :items-per-page="query.pageSize ?? 20"
              :sibling-count="1"
              show-edges
              size="sm"
            />
          </div>
        </template>
      </div>

      <UModal v-model:open="showDetail" :ui="{ content: 'sm:max-w-lg' }">
        <template #content>
          <div v-if="selectedAlert" class="p-4 space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-highlighted">
                  {{ selectedAlert.title }}
                </h3>
                <p class="text-xs text-muted font-mono mt-1">
                  {{ labelOf(ALERT_TYPE_LABEL, selectedAlert.type) }} · {{ selectedAlert.id }}
                </p>
              </div>
              <UBadge
                :label="labelOf(ALERT_STATUS_LABEL, selectedAlert.status)"
                variant="subtle"
                :color="statusColor(selectedAlert.status)"
                size="xs"
              />
            </div>

            <p class="text-sm text-muted">
              {{ selectedAlert.description }}
            </p>

            <dl class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt class="text-muted">级别</dt>
                <dd>{{ labelOf(ALERT_SEVERITY_LABEL, selectedAlert.severity) }}</dd>
              </div>
              <div>
                <dt class="text-muted">处理人</dt>
                <dd>{{ selectedAlert.assigneeUserId ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-muted">实体</dt>
                <dd>
                  <NuxtLink
                    v-if="entityLink(selectedAlert)"
                    :to="entityLink(selectedAlert)!"
                    class="text-primary"
                  >
                    {{ labelOf(ALERT_ENTITY_TYPE_LABEL, selectedAlert.entityType) }} / {{ selectedAlert.entityId }}
                  </NuxtLink>
                  <span v-else>{{ labelOf(ALERT_ENTITY_TYPE_LABEL, selectedAlert.entityType) }} / {{ selectedAlert.entityId }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-muted">发现时间</dt>
                <dd>{{ selectedAlert.detectedAt }}</dd>
              </div>
              <div v-if="selectedAlert.relatedDemandId">
                <dt class="text-muted">需求</dt>
                <dd>
                  <NuxtLink
                    v-if="relatedDemandLink(selectedAlert)"
                    :to="relatedDemandLink(selectedAlert)!"
                    class="font-mono text-primary"
                  >
                    {{ selectedAlert.relatedDemandId }}
                  </NuxtLink>
                  <span v-else class="font-mono">{{ selectedAlert.relatedDemandId }}</span>
                </dd>
              </div>
              <div v-if="selectedAlert.relatedDemandItemId">
                <dt class="text-muted">需求明细</dt>
                <dd>
                  <NuxtLink
                    :to="`/accounts/scheduling?demandItemId=${encodeURIComponent(selectedAlert.relatedDemandItemId)}`"
                    class="font-mono text-primary"
                  >
                    {{ selectedAlert.relatedDemandItemId }}
                  </NuxtLink>
                </dd>
              </div>
              <div v-if="selectedAlert.relatedChannelOrderId">
                <dt class="text-muted">渠道订单</dt>
                <dd>
                  <button
                    type="button"
                    class="font-mono text-primary hover:underline"
                    @click="goRelatedOrder(selectedAlert.relatedChannelOrderId)"
                  >
                    {{ selectedAlert.relatedChannelOrderId }}
                  </button>
                </dd>
              </div>
              <div v-if="selectedAlert.relatedTeamId">
                <dt class="text-muted">团队</dt>
                <dd>
                  <NuxtLink
                    :to="`/teams/${selectedAlert.relatedTeamId}`"
                    class="font-mono text-primary"
                  >
                    {{ selectedAlert.relatedTeamId }}
                  </NuxtLink>
                </dd>
              </div>
            </dl>

            <UTextarea
              v-if="selectedAlert.status === 'OPEN' || selectedAlert.status === 'IN_PROGRESS'"
              v-model="actionNote"
              placeholder="处理备注（解决 / 忽略时可选）"
              :rows="2"
            />

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="selectedAlert.status === 'OPEN'"
                label="认领处理"
                size="xs"
                color="primary"
                :loading="actionPending"
                @click="runAction('acknowledge')"
              />
              <UButton
                v-if="selectedAlert.status === 'OPEN' || selectedAlert.status === 'IN_PROGRESS'"
                label="解决"
                size="xs"
                color="success"
                variant="soft"
                :loading="actionPending"
                @click="runAction('resolve')"
              />
              <UButton
                v-if="selectedAlert.status === 'OPEN' || selectedAlert.status === 'IN_PROGRESS'"
                label="忽略"
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="actionPending"
                @click="runAction('ignore')"
              />
              <UButton
                v-if="selectedAlert.status === 'RESOLVED' || selectedAlert.status === 'IGNORED'"
                label="重新打开"
                size="xs"
                color="warning"
                variant="soft"
                :loading="actionPending"
                @click="runAction('reopen')"
              />

              <template v-if="isShortageAlertType(selectedAlert.type) && selectedAlert.relatedDemandItemId">
                <UButton
                  label="去分配"
                  size="xs"
                  color="primary"
                  variant="outline"
                  icon="i-lucide-git-compare"
                  @click="goAllocate(selectedAlert)"
                />
                <UButton
                  label="创建渠道订单"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-truck"
                  @click="goCreateOrder(selectedAlert)"
                />
              </template>

              <UButton
                label="关闭"
                size="xs"
                color="neutral"
                variant="ghost"
                class="ms-auto"
                @click="showDetail = false"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>

  <FiltersAdvancedFilterShell
    v-model:open="advancedOpen"
    @apply="applyAdvanced"
    @reset="resetAdvanced"
  >
    <UFormField label="关联实体">
      <USelect
        v-model="draftEntityType"
        :items="entityTypeOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
