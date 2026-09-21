<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { ChannelListItem } from '~/services'
import { channelService, mediaService } from '~/services'
import { formatCurrency } from '~/utils'

useSeoMeta({ title: '渠道中心' })

const { query, chips, patch, remove, clear } = useChannelFilters()
const keyword = ref(query.value.keyword)
const pending = ref(true)
const rows = ref<ChannelListItem[]>([])
const errorMessage = ref('')
const advancedOpen = ref(false)
const draftSpend = ref('all')

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'DISABLED', value: 'DISABLED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' }
]

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
]

const abnormalOptions = [
  { label: '全部异常', value: 'all' },
  { label: '有异常', value: 'yes' },
  { label: '无异常', value: 'no' }
]

const inUseOptions = [
  { label: '全部使用', value: 'all' },
  { label: '有使用中', value: 'yes' },
  { label: '无使用中', value: 'no' }
]

const spendOptions = [
  { label: '全部', value: 'all' },
  { label: '有 30D 消耗', value: 'yes' },
  { label: '无 30D 消耗', value: 'no' }
]

function tri(value: string) {
  return value === 'all' ? '' : value
}

const statusModel = computed({
  get: () => query.value.status || 'all',
  set: (value: string) => patch({ status: value === 'all' ? '' : value })
})

const mediaModel = computed({
  get: () => query.value.mediaId || 'all',
  set: (value: string) => patch({ mediaId: value === 'all' ? '' : value })
})

const abnormalModel = computed({
  get: () => query.value.abnormal || 'all',
  set: (value: string) => patch({ abnormal: tri(value) })
})

const inUseModel = computed({
  get: () => query.value.inUse || 'all',
  set: (value: string) => patch({ inUse: tri(value) })
})

watch(keyword, (value) => {
  if (value === query.value.keyword) return
  patch({ keyword: value })
})

watch(() => query.value.keyword, (value) => {
  if (keyword.value !== value) keyword.value = value
})

watch(advancedOpen, (open) => {
  if (open) draftSpend.value = query.value.spend30d || 'all'
})

function applyAdvanced() {
  patch({ spend30d: tri(draftSpend.value) })
}

function resetAdvanced() {
  draftSpend.value = 'all'
  patch({ spend30d: '' })
}

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    rows.value = await channelService.getChannelList({
      keyword: query.value.keyword.trim() || undefined,
      status: query.value.status
        ? query.value.status as ChannelListItem['status']
        : undefined,
      mediaId: query.value.mediaId || undefined,
      abnormal: query.value.abnormal === 'yes' || query.value.abnormal === 'no'
        ? query.value.abnormal
        : undefined,
      inUse: query.value.inUse === 'yes' || query.value.inUse === 'no'
        ? query.value.inUse
        : undefined,
      spend30d: query.value.spend30d === 'yes' || query.value.spend30d === 'no'
        ? query.value.spend30d
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
  query.value.mediaId,
  query.value.abnormal,
  query.value.inUse,
  query.value.spend30d
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
  acc.valid += item.currentValid
  acc.inUse += item.inUse
  acc.abnormal += item.abnormal
  return acc
}, { valid: 0, inUse: 0, abnormal: 0 }))

function openChannel(id: string) {
  void navigateTo(`/channels/${id}`)
}

const exportColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Channel' },
  { key: 'status', header: 'Status' },
  { key: 'supportedMedia', header: 'Supported Media' },
  { key: 'deliveredAccounts', header: 'Delivered' },
  { key: 'currentValid', header: 'Valid' },
  { key: 'inUse', header: 'In Use' },
  { key: 'abnormal', header: 'Abnormal' },
  { key: 'averageLifetimeDays', header: 'Avg Lifetime' },
  { key: 'spend30d', header: '30D Spend' }
]

async function getExportRows() {
  const list = await channelService.getChannelList({
    keyword: query.value.keyword.trim() || undefined,
    status: query.value.status
      ? query.value.status as ChannelListItem['status']
      : undefined,
    mediaId: query.value.mediaId || undefined,
    abnormal: query.value.abnormal === 'yes' || query.value.abnormal === 'no'
      ? query.value.abnormal
      : undefined,
    inUse: query.value.inUse === 'yes' || query.value.inUse === 'no'
      ? query.value.inUse
      : undefined,
    spend30d: query.value.spend30d === 'yes' || query.value.spend30d === 'no'
      ? query.value.spend30d
      : undefined
  })
  return list.map(item => ({
    code: item.code,
    name: item.name,
    status: item.status,
    supportedMedia: item.supportedMedia.map(m => m.name).join(', '),
    deliveredAccounts: item.deliveredAccounts,
    currentValid: item.currentValid,
    inUse: item.inUse,
    abnormal: item.abnormal,
    averageLifetimeDays: item.averageLifetimeDays,
    spend30d: item.spend30d
  }))
}

const columns: TableColumn<ChannelListItem>[] = [
  { accessorKey: 'name', header: 'Channel' },
  { id: 'supportedMedia', header: 'Supported Media' },
  { accessorKey: 'deliveredAccounts', header: 'Delivered' },
  { accessorKey: 'currentValid', header: 'Valid' },
  { accessorKey: 'inUse', header: 'In Use' },
  { accessorKey: 'abnormal', header: 'Abnormal' },
  { id: 'averageLifetimeDays', header: 'Avg Lifetime' },
  { id: 'spend30d', header: '30D Spend' },
  { accessorKey: 'status', header: 'Status' }
]

function cell(row: Row<ChannelListItem>): ChannelListItem {
  return row.original
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="渠道中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <FiltersEntitySearch
            v-model="keyword"
            placeholder="搜索渠道 / 媒体..."
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
        <ChannelsChannelCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <FiltersQuickFilter v-model="statusModel" label="状态" :options="statusOptions" />
          <FiltersQuickFilter v-model="mediaModel" label="媒体" :options="mediaOptions" />
          <FiltersQuickFilter v-model="abnormalModel" label="异常" :options="abnormalOptions" />
          <FiltersQuickFilter v-model="inUseModel" label="使用中" :options="inUseOptions" />
          <UBadge :label="`Valid ${summary.valid}`" variant="subtle" color="success" />
          <UBadge :label="`In Use ${summary.inUse}`" variant="subtle" color="neutral" />
          <UBadge :label="`Abnormal ${summary.abnormal}`" variant="subtle" color="warning" />
          <FiltersExportFilteredButton
            filename-prefix="channels"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>

        <FiltersActiveFilterChips :chips="chips" @remove="remove" @clear="clear" />

        <p class="text-xs text-muted">
          渠道中心管理上游交户与结算视图。30D Spend 为媒体消耗（不含 Service Fee）。登记打款在渠道详情 Finance。
        </p>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="load" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载渠道列表…
        </div>

        <div
          v-else-if="!rows.length"
          class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
        >
          <UIcon name="i-lucide-inbox" class="size-8" />
          <p>暂无匹配的渠道</p>
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
                  @click="openChannel(cell(row).id)"
                />
                <p class="text-xs text-muted font-mono ps-2">
                  {{ cell(row).code }}
                </p>
              </div>
            </template>
            <template #supportedMedia-cell="{ row }">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="media in cell(row).supportedMedia"
                  :key="media.id"
                  :label="media.name"
                  variant="subtle"
                  color="neutral"
                  size="xs"
                />
              </div>
            </template>
            <template #averageLifetimeDays-cell="{ row }">
              {{ cell(row).averageLifetimeDays == null ? '—' : `${cell(row).averageLifetimeDays}d` }}
            </template>
            <template #spend30d-cell="{ row }">
              <UTooltip text="媒体消耗（不含 Service Fee）">
                <span>{{ formatCurrency(cell(row).spend30d) }}</span>
              </UTooltip>
            </template>
            <template #status-cell="{ row }">
              <UBadge :label="cell(row).status" variant="subtle" size="xs" />
            </template>
            <template #abnormal-cell="{ row }">
              <span :class="cell(row).abnormal > 0 ? 'text-warning font-medium' : ''">
                {{ cell(row).abnormal }}
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
    <UFormField label="30D 消耗">
      <USelect
        v-model="draftSpend"
        :items="spendOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
