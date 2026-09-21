<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AccountDemand, AccountDemandStatus, DemandPriority } from '~/domain'
import { demandService, mediaService, teamService } from '~/services'

useSeoMeta({ title: '团队需求' })

const OPEN_STATUSES: AccountDemandStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_ALLOCATED'
]

const { query, chips, patch, remove, clear } = useTeamFilters()
const keyword = ref(query.value.keyword)
const pending = ref(true)
const rows = ref<AccountDemand[]>([])
const teamName = ref<Record<string, string>>({})
const errorMessage = ref('')
const advancedOpen = ref(false)
const draftMedia = ref('all')

const teams = await teamService.getTeams()
const medias = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })

const statusOptions = [
  { label: '未完成', value: 'all' },
  ...OPEN_STATUSES.map(value => ({ label: value, value }))
]

const teamOptions = [
  { label: '全部团队', value: 'all' },
  ...teams.map(item => ({ label: item.name, value: item.id }))
]

const priorityOptions = [
  { label: '全部优先级', value: 'all' },
  { label: 'LOW', value: 'LOW' },
  { label: 'NORMAL', value: 'NORMAL' },
  { label: 'HIGH', value: 'HIGH' },
  { label: 'URGENT', value: 'URGENT' }
]

const expectedOptions = [
  { label: '全部期望', value: 'all' },
  { label: '已逾期', value: 'OVERDUE' },
  { label: '7 日内', value: 'WITHIN_7D' },
  { label: '未设日期', value: 'UNSET' }
]

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  ...medias.map(item => ({ label: item.name, value: item.id }))
]

const statusModel = computed({
  get: () => query.value.status || 'all',
  set: (value: string) => patch({ status: value === 'all' ? '' : value })
})

const teamModel = computed({
  get: () => query.value.teamId || 'all',
  set: (value: string) => patch({ teamId: value === 'all' ? '' : value })
})

const priorityModel = computed({
  get: () => query.value.priority || 'all',
  set: (value: string) => patch({ priority: value === 'all' ? '' : value })
})

const expectedModel = computed({
  get: () => query.value.expected || 'all',
  set: (value: string) => patch({ expected: value === 'all' ? '' : value })
})

watch(keyword, (value) => {
  if (value === query.value.keyword) return
  patch({ keyword: value })
})

watch(() => query.value.keyword, (value) => {
  if (keyword.value !== value) keyword.value = value
})

watch(advancedOpen, (open) => {
  if (open) draftMedia.value = query.value.mediaId || 'all'
})

function applyAdvanced() {
  patch({ mediaId: draftMedia.value === 'all' ? '' : draftMedia.value })
}

function resetAdvanced() {
  draftMedia.value = 'all'
  patch({ mediaId: '' })
}

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    const statuses = query.value.status
      ? [query.value.status as AccountDemandStatus]
      : OPEN_STATUSES
    const priority = query.value.priority as DemandPriority | ''
    const expected = query.value.expected
    const page = await demandService.getDemands({
      statuses,
      keyword: query.value.keyword.trim() || undefined,
      teamIds: query.value.teamId ? [query.value.teamId] : undefined,
      priorities: priority ? [priority] : undefined,
      expectedBucket: expected === 'OVERDUE' || expected === 'WITHIN_7D' || expected === 'UNSET'
        ? expected
        : undefined,
      mediaId: query.value.mediaId || undefined,
      page: 1,
      pageSize: 200
    })
    teamName.value = Object.fromEntries(teams.map(item => [item.id, item.name]))
    rows.value = page.data
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
  query.value.teamId,
  query.value.priority,
  query.value.expected,
  query.value.mediaId
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

const columns: TableColumn<AccountDemand>[] = [
  { accessorKey: 'demandNo', header: 'Demand' },
  { id: 'team', header: 'Team' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'priority', header: 'Priority' },
  { id: 'expectedDate', header: 'Expected' }
]

function openDemand(row: AccountDemand) {
  void navigateTo(`/teams/${row.teamId}?tab=demands`)
}

const exportColumns = [
  { key: 'demandNo', header: 'Demand' },
  { key: 'team', header: 'Team' },
  { key: 'status', header: 'Status' },
  { key: 'priority', header: 'Priority' },
  { key: 'expectedDate', header: 'Expected' }
]

async function getExportRows() {
  const statuses = query.value.status
    ? [query.value.status as AccountDemandStatus]
    : OPEN_STATUSES
  const priority = query.value.priority as DemandPriority | ''
  const expected = query.value.expected
  const page = await demandService.getDemands({
    statuses,
    keyword: query.value.keyword.trim() || undefined,
    teamIds: query.value.teamId ? [query.value.teamId] : undefined,
    priorities: priority ? [priority] : undefined,
    expectedBucket: expected === 'OVERDUE' || expected === 'WITHIN_7D' || expected === 'UNSET'
      ? expected
      : undefined,
    mediaId: query.value.mediaId || undefined,
    page: 1,
    pageSize: 5000
  })
  return page.data.map(item => ({
    demandNo: item.demandNo,
    team: teamName.value[item.teamId] ?? item.teamId,
    status: item.status,
    priority: item.priority,
    expectedDate: item.expectedDate ?? ''
  }))
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
            placeholder="搜索需求号 / 团队"
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
          <FiltersQuickFilter v-model="teamModel" label="团队" :options="teamOptions" />
          <FiltersQuickFilter v-model="priorityModel" label="优先级" :options="priorityOptions" />
          <FiltersQuickFilter v-model="expectedModel" label="期望" :options="expectedOptions" />
          <UBadge :label="`共 ${rows.length}`" variant="subtle" color="neutral" />
          <FiltersExportFilteredButton
            filename-prefix="team-demands"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>
        <FiltersActiveFilterChips :chips="chips" @remove="remove" @clear="clear" />
        <p class="text-xs text-muted">
          跨团队未完成需求。点击行进入该团队的 Account Demand Tab。
        </p>

        <div v-if="errorMessage" class="text-sm text-error">
          {{ errorMessage }}
        </div>
        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载需求…
        </div>
        <div v-else-if="!rows.length" class="py-16 text-center text-sm text-muted">
          暂无未完成需求
        </div>
        <template v-else>
          <UTable :data="pagedRows" :columns="columns">
            <template #demandNo-cell="{ row }">
              <UButton
                :label="row.original.demandNo"
                variant="ghost"
                color="neutral"
                class="font-mono -px-2"
                @click="openDemand(row.original)"
              />
            </template>
            <template #team-cell="{ row }">
              {{ teamName[row.original.teamId] ?? row.original.teamId }}
            </template>
            <template #status-cell="{ row }">
              <UBadge :label="row.original.status" variant="subtle" size="xs" />
            </template>
            <template #expectedDate-cell="{ row }">
              {{ row.original.expectedDate ?? '—' }}
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
    <UFormField label="媒体">
      <USelect
        v-model="draftMedia"
        :items="mediaOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
