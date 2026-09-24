<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { PlatformAssetListItem, PlatformAssetQuery } from '~/services'
import { channelService, mediaService } from '~/services'

useSeoMeta({ title: '媒体资产' })

const route = useRoute()
const router = useRouter()

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
const channels = await channelService.getChannels()
const assetTypes = await mediaService.getPlatformAssetTypes(undefined, { status: 'ACTIVE' })
const activeMediaIds = new Set(mediaPlatforms.map(item => item.id))

const mediaFilterOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
]

const channelFilterOptions = [
  { label: '全部渠道', value: 'all' },
  ...channels.map(item => ({ label: item.name, value: item.id }))
]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'DISABLED', value: 'DISABLED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' }
]

const typeFilterOptions = [
  { label: '全部类型', value: 'all' },
  ...assetTypes
    .filter(item => activeMediaIds.has(item.mediaId))
    .map(item => ({ label: item.name, value: item.id }))
]

const linkedOptions = [
  { label: '全部', value: 'all' },
  { label: '已关联账户', value: 'yes' },
  { label: '未关联账户', value: 'no' }
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

const query = computed<PlatformAssetQuery>(() => {
  const q = route.query
  return {
    keyword: typeof q.keyword === 'string' ? q.keyword : undefined,
    mediaIds: asArray(q.mediaIds).length ? asArray(q.mediaIds) : undefined,
    channelIds: asArray(q.channelIds).length ? asArray(q.channelIds) : undefined,
    statuses: asArray(q.statuses).length ? asArray(q.statuses) : undefined,
    typeIds: asArray(q.typeIds).length ? asArray(q.typeIds) : undefined,
    linked: q.linked === 'yes' || q.linked === 'no' ? q.linked : undefined,
    page: asNumber(q.page) ?? 1,
    pageSize: asNumber(q.pageSize) ?? 20
  }
})

async function setFilters(
  patch: Partial<PlatformAssetQuery>,
  options: { resetPage?: boolean } = {}
) {
  const resetPage = options.resetPage !== false
  const next: PlatformAssetQuery = {
    ...query.value,
    ...patch
  }
  if (resetPage && patch.page == null) {
    next.page = 1
  }

  const routeQuery: Record<string, string | string[]> = {}
  if (next.keyword?.trim()) routeQuery.keyword = next.keyword.trim()
  if (next.mediaIds?.length) routeQuery.mediaIds = next.mediaIds
  if (next.channelIds?.length) routeQuery.channelIds = next.channelIds
  if (next.statuses?.length) routeQuery.statuses = next.statuses
  if (next.typeIds?.length) routeQuery.typeIds = next.typeIds
  if (next.linked) routeQuery.linked = next.linked
  if ((next.page ?? 1) > 1) routeQuery.page = String(next.page)
  if ((next.pageSize ?? 20) !== 20) routeQuery.pageSize = String(next.pageSize)

  await router.replace({ query: routeQuery })
}

function clearFilters() {
  void setFilters({
    keyword: undefined,
    mediaIds: undefined,
    channelIds: undefined,
    statuses: undefined,
    typeIds: undefined,
    linked: undefined,
    page: 1
  })
}

function removeFilter(key: string) {
  if (key === 'keyword') void setFilters({ keyword: undefined })
  else if (key === 'mediaIds') void setFilters({ mediaIds: undefined })
  else if (key === 'channelIds') void setFilters({ channelIds: undefined })
  else if (key === 'statuses') void setFilters({ statuses: undefined })
  else if (key === 'typeIds') void setFilters({ typeIds: undefined })
  else if (key === 'linked') void setFilters({ linked: undefined })
}

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

const quickChannel = computed({
  get: () => query.value.channelIds?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ channelIds: value === 'all' ? undefined : [value] })
  }
})

const quickStatus = computed({
  get: () => query.value.statuses?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ statuses: value === 'all' ? undefined : [value] })
  }
})

const quickType = computed({
  get: () => query.value.typeIds?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ typeIds: value === 'all' ? undefined : [value] })
  }
})

const advancedOpen = ref(false)
const draftLinked = ref('all')

watch(advancedOpen, (open) => {
  if (open) draftLinked.value = query.value.linked ?? 'all'
})

function applyAdvanced() {
  void setFilters({
    linked: draftLinked.value === 'yes' || draftLinked.value === 'no'
      ? draftLinked.value
      : undefined
  })
}

function resetAdvanced() {
  draftLinked.value = 'all'
  void setFilters({ linked: undefined })
}

const page = computed({
  get: () => query.value.page ?? 1,
  set: (value: number) => { void setFilters({ page: value }, { resetPage: false }) }
})

const activeChips = computed(() => {
  const chips: { key: string, label: string }[] = []
  const q = query.value
  if (q.keyword?.trim()) chips.push({ key: 'keyword', label: `搜索: ${q.keyword}` })
  if (q.mediaIds?.length) {
    const names = q.mediaIds
      .map(id => mediaPlatforms.find(m => m.id === id)?.name ?? id)
      .join(', ')
    chips.push({ key: 'mediaIds', label: `媒体: ${names}` })
  }
  if (q.channelIds?.length) {
    const names = q.channelIds
      .map(id => channels.find(c => c.id === id)?.name ?? id)
      .join(', ')
    chips.push({ key: 'channelIds', label: `渠道: ${names}` })
  }
  if (q.statuses?.length) {
    chips.push({ key: 'statuses', label: `状态: ${q.statuses.join(', ')}` })
  }
  if (q.typeIds?.length) {
    const names = q.typeIds
      .map(id => assetTypes.find(item => item.id === id)?.name ?? id)
      .join(', ')
    chips.push({ key: 'typeIds', label: `类型: ${names}` })
  }
  if (q.linked === 'yes') chips.push({ key: 'linked', label: '已关联账户' })
  if (q.linked === 'no') chips.push({ key: 'linked', label: '未关联账户' })
  return chips
})

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const rows = ref<PlatformAssetListItem[]>([])
const total = ref(0)
const totalPages = ref(1)

async function loadAssets() {
  pending.value = true
  errorMessage.value = null
  try {
    const result = await mediaService.getPlatformAssetList({ ...query.value })
    rows.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载媒体资产失败'
    rows.value = []
    total.value = 0
    totalPages.value = 1
  } finally {
    pending.value = false
  }
}

watch(
  () => query.value,
  () => { void loadAssets() },
  { immediate: true, deep: true }
)

function viewAccounts(asset: PlatformAssetListItem) {
  void navigateTo({
    path: '/accounts',
    query: { platformAssetIds: asset.id }
  })
}

const columns: TableColumn<PlatformAssetListItem>[] = [
  { accessorKey: 'mediaName', header: 'Media' },
  { accessorKey: 'typeName', header: 'Type' },
  { accessorKey: 'externalId', header: 'External ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'channelName', header: 'Channel' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'linkedAccountCount', header: 'Linked Accounts' },
  { id: 'actions', header: 'Actions' }
]

function cell(row: Row<PlatformAssetListItem>): PlatformAssetListItem {
  return row.original
}

const exportColumns = [
  { key: 'mediaName', header: 'Media' },
  { key: 'typeName', header: 'Type' },
  { key: 'externalId', header: 'External ID' },
  { key: 'name', header: 'Name' },
  { key: 'channelName', header: 'Channel' },
  { key: 'status', header: 'Status' },
  { key: 'linkedAccountCount', header: 'Linked Accounts' }
]

async function getExportRows() {
  const result = await mediaService.getPlatformAssetList({
    ...query.value,
    page: 1,
    pageSize: 5000
  })
  return result.data.map(item => ({
    mediaName: item.mediaName,
    typeName: item.typeName,
    externalId: item.externalId,
    name: item.name ?? '',
    channelName: item.channelName ?? '',
    status: item.status,
    linkedAccountCount: item.linkedAccountCount
  }))
}

const hasActiveFilters = computed(() => activeChips.value.length > 0)
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="媒体资产" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <FiltersEntitySearch
            v-model="keyword"
            placeholder="搜索 External ID / 名称"
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
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <FiltersQuickFilter v-model="quickMedia" label="媒体" :options="mediaFilterOptions" />
          <FiltersQuickFilter v-model="quickChannel" label="渠道" :options="channelFilterOptions" />
          <FiltersQuickFilter v-model="quickType" label="类型" :options="typeFilterOptions" />
          <FiltersQuickFilter v-model="quickStatus" label="状态" :options="statusFilterOptions" />
          <UBadge
            :label="`共 ${total}`"
            variant="subtle"
            color="primary"
          />
          <FiltersExportFilteredButton
            filename-prefix="platform-assets"
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
          按媒体动态展示 Platform Asset（BM / MCC / Business Center / Organization…），非写死 BM Management。
          关联账户数为当前生效 Assignment；点「查看账户」下钻全部账户列表。
          登记新资产请到
          <NuxtLink to="/settings/dictionary" class="text-primary underline">系统管理 → 数据字典 → 资产实例</NuxtLink>。
        </p>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadAssets" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载媒体资产…
        </div>

        <div
          v-else-if="!rows.length"
          class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
        >
          <UIcon name="i-lucide-inbox" class="size-8" />
          <p>{{ hasActiveFilters ? '无匹配的媒体资产' : '暂无媒体资产' }}</p>
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
            <template #mediaName-cell="{ row }">
              <UBadge :label="cell(row).mediaName" variant="subtle" color="neutral" size="xs" />
            </template>

            <template #typeName-cell="{ row }">
              <span class="text-sm">{{ cell(row).typeName }}</span>
            </template>

            <template #externalId-cell="{ row }">
              <span class="font-mono text-sm">{{ cell(row).externalId }}</span>
            </template>

            <template #name-cell="{ row }">
              <span class="text-sm">{{ cell(row).name ?? '—' }}</span>
            </template>

            <template #channelName-cell="{ row }">
              <span class="text-sm">{{ cell(row).channelName ?? '—' }}</span>
            </template>

            <template #status-cell="{ row }">
              <UBadge :label="cell(row).status" variant="subtle" size="xs" />
            </template>

            <template #linkedAccountCount-cell="{ row }">
              <span class="tabular-nums">{{ cell(row).linkedAccountCount }}</span>
            </template>

            <template #actions-cell="{ row }">
              <UButton
                label="查看账户"
                icon="i-lucide-list"
                color="primary"
                variant="ghost"
                size="xs"
                @click="viewAccounts(cell(row))"
              />
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
    </template>
  </UDashboardPanel>

  <FiltersAdvancedFilterShell
    v-model:open="advancedOpen"
    @apply="applyAdvanced"
    @reset="resetAdvanced"
  >
    <UFormField label="关联账户">
      <USelect
        v-model="draftLinked"
        :items="linkedOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
