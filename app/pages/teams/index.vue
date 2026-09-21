<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { TeamListItem } from '~/services'
import { teamService } from '~/services'
import { formatCurrency } from '~/utils'

useSeoMeta({ title: '团队中心' })

const { query, chips, patch, remove, clear } = useTeamFilters()
const keyword = ref(query.value.keyword)
const pending = ref(true)
const rows = ref<TeamListItem[]>([])
const errorMessage = ref('')
const advancedOpen = ref(false)
const draftUsage = ref('all')

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'DISABLED', value: 'DISABLED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' }
]

const idleOptions = [
  { label: '全部闲置', value: 'all' },
  { label: '有闲置', value: 'yes' },
  { label: '无闲置', value: 'no' }
]

const unfulfilledOptions = [
  { label: '全部需求', value: 'all' },
  { label: '有未完成', value: 'yes' },
  { label: '无未完成', value: 'no' }
]

const bannedOptions = [
  { label: '全部封禁', value: 'all' },
  { label: '有封禁', value: 'yes' },
  { label: '无封禁', value: 'no' }
]

const usageOptions = [
  { label: '全部', value: 'all' },
  { label: '< 60%', value: 'low' },
  { label: '60–80%', value: 'mid' },
  { label: '≥ 80%', value: 'high' }
]

function tri(value: string) {
  return value === 'all' ? '' : value
}

const statusModel = computed({
  get: () => query.value.status || 'all',
  set: (value: string) => patch({ status: tri(value) })
})

const idleModel = computed({
  get: () => query.value.idle || 'all',
  set: (value: string) => patch({ idle: tri(value) })
})

const unfulfilledModel = computed({
  get: () => query.value.unfulfilled || 'all',
  set: (value: string) => patch({ unfulfilled: tri(value) })
})

const bannedModel = computed({
  get: () => query.value.banned || 'all',
  set: (value: string) => patch({ banned: tri(value) })
})

watch(keyword, (value) => {
  if (value === query.value.keyword) return
  patch({ keyword: value })
})

watch(() => query.value.keyword, (value) => {
  if (keyword.value !== value) keyword.value = value
})

watch(advancedOpen, (open) => {
  if (open) draftUsage.value = query.value.usage || 'all'
})

function applyAdvanced() {
  patch({ usage: tri(draftUsage.value) })
}

function resetAdvanced() {
  draftUsage.value = 'all'
  patch({ usage: '' })
}

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    rows.value = await teamService.getTeamList({
      keyword: query.value.keyword.trim() || undefined,
      status: query.value.status
        ? query.value.status as TeamListItem['status']
        : undefined,
      idle: query.value.idle === 'yes' || query.value.idle === 'no' ? query.value.idle : undefined,
      unfulfilled: query.value.unfulfilled === 'yes' || query.value.unfulfilled === 'no'
        ? query.value.unfulfilled
        : undefined,
      banned: query.value.banned === 'yes' || query.value.banned === 'no'
        ? query.value.banned
        : undefined,
      usage: query.value.usage === 'low' || query.value.usage === 'mid' || query.value.usage === 'high'
        ? query.value.usage
        : undefined
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败'
    rows.value = []
  } finally {
    pending.value = false
  }
}

watch(() => [
  query.value.keyword,
  query.value.status,
  query.value.idle,
  query.value.unfulfilled,
  query.value.banned,
  query.value.usage
], () => {
  void load()
}, { immediate: true })

const page = computed({
  get: () => query.value.page,
  set: (value: number) => patch({ page: value }, false)
})

const pagedRows = computed(() => {
  const start = (query.value.page - 1) * query.value.pageSize
  return rows.value.slice(start, start + query.value.pageSize)
})

const summary = computed(() => rows.value.reduce((acc, item) => {
  acc.accounts += item.accounts
  acc.idle += item.idle
  acc.unfulfilled += item.unfulfilledDemand
  return acc
}, { accounts: 0, idle: 0, unfulfilled: 0 }))

function openTeam(id: string) {
  void navigateTo(`/teams/${id}`)
}

const exportColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Team' },
  { key: 'status', header: 'Status' },
  { key: 'leader', header: 'Leader' },
  { key: 'memberCount', header: 'Members' },
  { key: 'accounts', header: 'Accounts' },
  { key: 'inUse', header: 'In Use' },
  { key: 'idle', header: 'Idle' },
  { key: 'usageRate', header: 'Usage Rate' },
  { key: 'todaySpend', header: 'Today Spend' },
  { key: 'spend7d', header: '7D Spend' },
  { key: 'banRate', header: 'Ban Rate' },
  { key: 'unfulfilledDemand', header: 'Unfulfilled Demand' }
]

async function getExportRows() {
  const list = await teamService.getTeamList({
    keyword: query.value.keyword.trim() || undefined,
    status: query.value.status
      ? query.value.status as TeamListItem['status']
      : undefined,
    idle: query.value.idle === 'yes' || query.value.idle === 'no' ? query.value.idle : undefined,
    unfulfilled: query.value.unfulfilled === 'yes' || query.value.unfulfilled === 'no'
      ? query.value.unfulfilled
      : undefined,
    banned: query.value.banned === 'yes' || query.value.banned === 'no'
      ? query.value.banned
      : undefined,
    usage: query.value.usage === 'low' || query.value.usage === 'mid' || query.value.usage === 'high'
      ? query.value.usage
      : undefined
  })
  return list.map(item => ({
    code: item.code,
    name: item.name,
    status: item.status,
    leader: item.leader?.name ?? '',
    memberCount: item.memberCount,
    accounts: item.accounts,
    inUse: item.inUse,
    idle: item.idle,
    usageRate: item.usageRate,
    todaySpend: item.todaySpend,
    spend7d: item.spend7d,
    banRate: item.banRate,
    unfulfilledDemand: item.unfulfilledDemand
  }))
}

function usageColor(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warning'
  return 'error'
}

const columns: TableColumn<TeamListItem>[] = [
  { accessorKey: 'name', header: 'Team' },
  { id: 'leader', header: 'Leader' },
  { accessorKey: 'memberCount', header: 'Members' },
  { accessorKey: 'accounts', header: 'Accounts' },
  { accessorKey: 'inUse', header: 'In Use' },
  { accessorKey: 'idle', header: 'Idle' },
  { id: 'usageRate', header: 'Usage Rate' },
  { id: 'todaySpend', header: 'Today Spend' },
  { id: 'spend7d', header: '7D Spend' },
  { id: 'internalSpend7d', header: 'Internal' },
  { id: 'externalSpend7d', header: 'External' },
  { id: 'banRate', header: 'Ban Rate' },
  { id: 'unfulfilledDemand', header: 'Unfulfilled Demand' }
]

function cell(row: Row<TeamListItem>): TeamListItem {
  return row.original
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="团队中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <FiltersEntitySearch
            v-model="keyword"
            placeholder="搜索团队 / 负责人..."
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
      <UDashboardToolbar>
        <TeamsTeamCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <FiltersQuickFilter v-model="statusModel" label="状态" :options="statusOptions" />
          <FiltersQuickFilter v-model="idleModel" label="闲置" :options="idleOptions" />
          <FiltersQuickFilter v-model="unfulfilledModel" label="未完成" :options="unfulfilledOptions" />
          <FiltersQuickFilter v-model="bannedModel" label="封禁" :options="bannedOptions" />
          <UBadge :label="`Accounts ${summary.accounts}`" variant="subtle" color="neutral" />
          <UBadge :label="`Idle ${summary.idle}`" variant="subtle" color="warning" />
          <UBadge :label="`Unfulfilled ${summary.unfulfilled}`" variant="subtle" color="error" />
          <FiltersExportFilteredButton
            filename-prefix="teams"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>

        <FiltersActiveFilterChips :chips="chips" @remove="remove" @clear="clear" />

        <p class="text-xs text-muted">
          团队中心是「需求与使用」视图，不是调度中心。具体账户分配在账户中心完成。
        </p>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="load" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载团队列表…
        </div>

        <div
          v-else-if="!rows.length"
          class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
        >
          <UIcon name="i-lucide-inbox" class="size-8" />
          <p>暂无匹配的团队</p>
        </div>

        <template v-else>
          <UTable :data="pagedRows" :columns="columns" class="shrink-0">
            <template #name-cell="{ row }">
              <div class="min-w-0">
                <UButton
                  :label="cell(row).name"
                  variant="ghost"
                  color="neutral"
                  class="font-medium -px-2 -py-1"
                  @click="openTeam(cell(row).id)"
                />
                <p class="text-xs text-muted font-mono ps-2">
                  {{ cell(row).code }}
                </p>
              </div>
            </template>
            <template #leader-cell="{ row }">
              {{ cell(row).leader?.name ?? '—' }}
            </template>
            <template #usageRate-cell="{ row }">
              <UBadge
                :label="`${cell(row).usageRate}%`"
                :color="usageColor(cell(row).usageRate)"
                variant="subtle"
                size="xs"
              />
            </template>
            <template #todaySpend-cell="{ row }">
              {{ formatCurrency(cell(row).todaySpend) }}
            </template>
            <template #spend7d-cell="{ row }">
              {{ formatCurrency(cell(row).spend7d) }}
            </template>
            <template #internalSpend7d-cell="{ row }">
              {{ formatCurrency(cell(row).internalSpend7d) }}
            </template>
            <template #externalSpend7d-cell="{ row }">
              {{ formatCurrency(cell(row).externalSpend7d) }}
            </template>
            <template #banRate-cell="{ row }">
              <span :class="cell(row).banRate > 10 ? 'text-error font-medium' : ''">
                {{ cell(row).banRate }}%
              </span>
            </template>
            <template #unfulfilledDemand-cell="{ row }">
              <span :class="cell(row).unfulfilledDemand > 0 ? 'text-warning font-medium' : ''">
                {{ cell(row).unfulfilledDemand }}
              </span>
            </template>
          </UTable>
          <div class="flex justify-end">
            <UPagination
              v-model:page="page"
              :total="rows.length"
              :items-per-page="query.pageSize"
              :sibling-count="1"
            />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <FiltersAdvancedFilterShell
    v-model:open="advancedOpen"
    @apply="applyAdvanced"
    @reset="resetAdvanced"
  >
    <UFormField label="使用率">
      <USelect
        v-model="draftUsage"
        :items="usageOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
