<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Alert, AlertQuery, AlertSeverity, AlertStatus } from '~/domain'
import { isShortageAlertType } from '~/domain'
import { alertService } from '~/services'

useSeoMeta({ title: '预警与待办' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const ASSIGNEE = 'mem-lisi'

const typeFilterOptions = [
  { label: '全部类型', value: 'all' },
  { label: 'TEAM_ACCOUNT_SHORTAGE', value: 'TEAM_ACCOUNT_SHORTAGE' },
  { label: 'POOL_SHORTAGE', value: 'POOL_SHORTAGE' },
  { label: 'ACCOUNT_BANNED', value: 'ACCOUNT_BANNED' },
  { label: 'NO_SPEND_48H', value: 'NO_SPEND_48H' },
  { label: 'DEMAND_OVERDUE', value: 'DEMAND_OVERDUE' },
  { label: 'API_ACCESS_LOST', value: 'API_ACCESS_LOST' },
  { label: 'SYNC_FAILED', value: 'SYNC_FAILED' },
  { label: 'CREDENTIAL_EXPIRED', value: 'CREDENTIAL_EXPIRED' },
  { label: 'RECONCILIATION_VARIANCE', value: 'RECONCILIATION_VARIANCE' }
]

const severityFilterOptions = [
  { label: '全部级别', value: 'all' },
  { label: 'URGENT', value: 'URGENT' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'INFO', value: 'INFO' }
]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: 'OPEN', value: 'OPEN' },
  { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
  { label: 'RESOLVED', value: 'RESOLVED' },
  { label: 'IGNORED', value: 'IGNORED' }
]

const assignedOptions = [
  { label: '全部认领', value: 'all' },
  { label: '已认领', value: 'yes' },
  { label: '未认领', value: 'no' }
]

const entityTypeOptions = [
  { label: '全部实体', value: 'all' },
  { label: 'AdAccount', value: 'AdAccount' },
  { label: 'AccountDemand', value: 'AccountDemand' },
  { label: 'Team', value: 'Team' },
  { label: 'Channel', value: 'Channel' }
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

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const rows = ref<Alert[]>([])
const total = ref(0)
const totalPages = ref(1)
const openCount = ref(0)

const selectedAlert = ref<Alert | null>(null)
const showDetail = ref(false)
const actionNote = ref('')
const actionPending = ref(false)

async function loadAlerts() {
  pending.value = true
  errorMessage.value = null
  try {
    const [result, count] = await Promise.all([
      alertService.getAlerts({ ...query.value }),
      alertService.getOpenCount()
    ])
    rows.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
    openCount.value = count
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

function entityLink(alert: Alert): string | null {
  if (alert.entityType === 'AdAccount') return `/accounts/${alert.entityId}`
  if (alert.entityType === 'Team') return `/teams/${alert.entityId}`
  if (alert.entityType === 'AccountDemand') return '/accounts/scheduling'
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
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'severity', header: 'Severity' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'entityType', header: 'Entity' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'assignee', header: 'Assignee' },
  { id: 'detectedAt', header: 'Detected' },
  { id: 'actions', header: 'Actions' }
]

function cell(row: Row<Alert>): Alert {
  return row.original
}

const exportColumns = [
  { key: 'type', header: 'Type' },
  { key: 'severity', header: 'Severity' },
  { key: 'title', header: 'Title' },
  { key: 'entityType', header: 'Entity' },
  { key: 'entityId', header: 'Entity ID' },
  { key: 'status', header: 'Status' },
  { key: 'assigneeUserId', header: 'Assignee' },
  { key: 'detectedAt', header: 'Detected' }
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
            :label="`待处理 ${openCount}`"
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
              <span class="font-mono text-xs">{{ cell(row).type }}</span>
            </template>
            <template #severity-cell="{ row }">
              <UBadge
                :label="cell(row).severity"
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
              <span class="text-xs">{{ cell(row).entityType }} / {{ cell(row).entityId }}</span>
            </template>
            <template #status-cell="{ row }">
              <UBadge
                :label="cell(row).status"
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
                  {{ selectedAlert.type }} · {{ selectedAlert.id }}
                </p>
              </div>
              <UBadge
                :label="selectedAlert.status"
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
                <dt class="text-muted">Severity</dt>
                <dd>{{ selectedAlert.severity }}</dd>
              </div>
              <div>
                <dt class="text-muted">Assignee</dt>
                <dd>{{ selectedAlert.assigneeUserId ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-muted">Entity</dt>
                <dd>
                  <NuxtLink
                    v-if="entityLink(selectedAlert)"
                    :to="entityLink(selectedAlert)!"
                    class="text-primary"
                  >
                    {{ selectedAlert.entityType }} / {{ selectedAlert.entityId }}
                  </NuxtLink>
                  <span v-else>{{ selectedAlert.entityType }} / {{ selectedAlert.entityId }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-muted">Detected</dt>
                <dd>{{ selectedAlert.detectedAt }}</dd>
              </div>
              <div v-if="selectedAlert.relatedDemandId">
                <dt class="text-muted">Demand</dt>
                <dd class="font-mono">{{ selectedAlert.relatedDemandId }}</dd>
              </div>
              <div v-if="selectedAlert.relatedDemandItemId">
                <dt class="text-muted">Demand Item</dt>
                <dd class="font-mono">{{ selectedAlert.relatedDemandItemId }}</dd>
              </div>
              <div v-if="selectedAlert.relatedChannelOrderId">
                <dt class="text-muted">Channel Order</dt>
                <dd class="font-mono">{{ selectedAlert.relatedChannelOrderId }}</dd>
              </div>
              <div v-if="selectedAlert.relatedTeamId">
                <dt class="text-muted">Team</dt>
                <dd class="font-mono">{{ selectedAlert.relatedTeamId }}</dd>
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
                  label="创建 Channel Order"
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
