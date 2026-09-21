<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ChannelAccountOrder, ChannelAccountOrderStatus } from '~/domain'
import { DEMAND_TIMEZONE_OPTIONS } from '~/domain'
import { channelService, demandService, mediaService } from '~/services'

useSeoMeta({ title: '渠道订单' })

const { query, chips, patch, remove, clear } = useChannelFilters()
const keyword = ref(query.value.keyword)
const pending = ref(true)
const rows = ref<ChannelAccountOrder[]>([])
const channelName = ref<Record<string, string>>({})
const mediaName = ref<Record<string, string>>({})
const errorMessage = ref('')
const advancedOpen = ref(false)
const draftProgress = ref('all')

const channels = await channelService.getChannels()
const medias = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: 'DRAFT', value: 'DRAFT' },
  { label: 'PENDING', value: 'PENDING' },
  { label: 'PENDING_CONFIRM', value: 'PENDING_CONFIRM' },
  { label: 'ACCEPTED', value: 'ACCEPTED' },
  { label: 'REJECTED', value: 'REJECTED' },
  { label: 'TIMEOUT', value: 'TIMEOUT' },
  { label: 'PROCESSING', value: 'PROCESSING' },
  { label: 'PARTIAL_DELIVERED', value: 'PARTIAL_DELIVERED' },
  { label: 'DELIVERED', value: 'DELIVERED' },
  { label: 'PARTIAL_CLOSED', value: 'PARTIAL_CLOSED' },
  { label: 'PARSING_EXCEPTION', value: 'PARSING_EXCEPTION' },
  { label: 'QUANTITY_EXCEPTION', value: 'QUANTITY_EXCEPTION' },
  { label: 'CANCELLED', value: 'CANCELLED' }
]

const channelOptions = [
  { label: '全部渠道', value: 'all' },
  ...channels.map(item => ({ label: item.name, value: item.id }))
]

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  ...medias.map(item => ({ label: item.name, value: item.id }))
]

const timezoneOptions = [
  { label: '全部时区', value: 'all' },
  ...DEMAND_TIMEZONE_OPTIONS
]

const progressOptions = [
  { label: '全部', value: 'all' },
  { label: '未交', value: 'NONE' },
  { label: '部分交付', value: 'PARTIAL' },
  { label: '已满交', value: 'FULL' }
]

const statusModel = computed({
  get: () => query.value.status || 'all',
  set: (value: string) => patch({ status: value === 'all' ? '' : value })
})

const channelModel = computed({
  get: () => query.value.channelId || 'all',
  set: (value: string) => patch({ channelId: value === 'all' ? '' : value })
})

const mediaModel = computed({
  get: () => query.value.mediaId || 'all',
  set: (value: string) => patch({ mediaId: value === 'all' ? '' : value })
})

const timezoneModel = computed({
  get: () => query.value.timezone || 'all',
  set: (value: string) => patch({ timezone: value === 'all' ? '' : value })
})

watch(keyword, (value) => {
  if (value === query.value.keyword) return
  patch({ keyword: value })
})

watch(() => query.value.keyword, (value) => {
  if (keyword.value !== value) keyword.value = value
})

watch(advancedOpen, (open) => {
  if (open) draftProgress.value = query.value.progress || 'all'
})

function applyAdvanced() {
  patch({ progress: draftProgress.value === 'all' ? '' : draftProgress.value })
}

function resetAdvanced() {
  draftProgress.value = 'all'
  patch({ progress: '' })
}

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    const status = query.value.status as ChannelAccountOrderStatus | ''
    const progress = query.value.progress
    const orderPage = await demandService.getChannelAccountOrders({
      page: 1,
      pageSize: 200,
      keyword: query.value.keyword.trim() || undefined,
      channelIds: query.value.channelId ? [query.value.channelId] : undefined,
      mediaIds: query.value.mediaId ? [query.value.mediaId] : undefined,
      statuses: status ? [status] : undefined,
      timezone: query.value.timezone || undefined,
      deliveryProgress: progress === 'NONE' || progress === 'PARTIAL' || progress === 'FULL'
        ? progress
        : undefined
    })
    channelName.value = Object.fromEntries(channels.map(item => [item.id, item.name]))
    mediaName.value = Object.fromEntries(medias.map(item => [item.id, item.name]))
    rows.value = orderPage.data
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
  query.value.channelId,
  query.value.mediaId,
  query.value.timezone,
  query.value.progress
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

const columns: TableColumn<ChannelAccountOrder>[] = [
  { accessorKey: 'orderNo', header: 'Order' },
  { id: 'external', header: '外部单号' },
  { id: 'channel', header: 'Channel' },
  { id: 'media', header: 'Media' },
  { accessorKey: 'requestedQuantity', header: 'Requested' },
  { accessorKey: 'deliveredQuantity', header: 'Delivered' },
  { accessorKey: 'status', header: 'Status' }
]

function openOrder(order: ChannelAccountOrder) {
  void navigateTo(`/channels/${order.channelId}?tab=orders`)
}

const exportColumns = [
  { key: 'orderNo', header: 'Order' },
  { key: 'externalOrderNo', header: '外部单号' },
  { key: 'channel', header: 'Channel' },
  { key: 'media', header: 'Media' },
  { key: 'requestedQuantity', header: 'Requested' },
  { key: 'deliveredQuantity', header: 'Delivered' },
  { key: 'timezone', header: 'Timezone' },
  { key: 'status', header: 'Status' }
]

async function getExportRows() {
  const status = query.value.status as ChannelAccountOrderStatus | ''
  const progress = query.value.progress
  const orderPage = await demandService.getChannelAccountOrders({
    page: 1,
    pageSize: 5000,
    keyword: query.value.keyword.trim() || undefined,
    channelIds: query.value.channelId ? [query.value.channelId] : undefined,
    mediaIds: query.value.mediaId ? [query.value.mediaId] : undefined,
    statuses: status ? [status] : undefined,
    timezone: query.value.timezone || undefined,
    deliveryProgress: progress === 'NONE' || progress === 'PARTIAL' || progress === 'FULL'
      ? progress
      : undefined
  })
  return orderPage.data.map(item => ({
    orderNo: item.orderNo,
    externalOrderNo: item.externalOrderNo,
    channel: channelName.value[item.channelId] ?? item.channelId,
    media: mediaName.value[item.mediaId] ?? item.mediaId,
    requestedQuantity: item.requestedQuantity,
    deliveredQuantity: item.deliveredQuantity,
    timezone: item.timezone ?? '',
    status: item.status
  }))
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
            placeholder="搜索单号 / 外部单号"
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
          <FiltersQuickFilter v-model="channelModel" label="渠道" :options="channelOptions" />
          <FiltersQuickFilter v-model="mediaModel" label="媒体" :options="mediaOptions" />
          <FiltersQuickFilter v-model="statusModel" label="状态" :options="statusOptions" />
          <FiltersQuickFilter v-model="timezoneModel" label="时区" :options="timezoneOptions" />
          <UBadge :label="`共 ${rows.length}`" variant="subtle" color="neutral" />
          <FiltersExportFilteredButton
            filename-prefix="channel-orders"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>
        <FiltersActiveFilterChips :chips="chips" @remove="remove" @clear="clear" />
        <p class="text-xs text-muted">
          跨渠道订单。点击行进入该渠道的 Orders Tab。
        </p>

        <div v-if="errorMessage" class="text-sm text-error">
          {{ errorMessage }}
        </div>
        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载订单…
        </div>
        <div v-else-if="!rows.length" class="py-16 text-center text-sm text-muted">
          暂无订单
        </div>
        <template v-else>
          <UTable :data="pagedRows" :columns="columns">
            <template #orderNo-cell="{ row }">
              <UButton
                :label="row.original.orderNo"
                variant="ghost"
                color="neutral"
                class="font-mono -px-2"
                @click="openOrder(row.original)"
              />
            </template>
            <template #external-cell="{ row }">
              <span class="font-mono text-xs">{{ row.original.externalOrderNo || '—' }}</span>
            </template>
            <template #channel-cell="{ row }">
              {{ channelName[row.original.channelId] ?? row.original.channelId }}
            </template>
            <template #media-cell="{ row }">
              {{ mediaName[row.original.mediaId] ?? row.original.mediaId }}
            </template>
            <template #status-cell="{ row }">
              <UBadge :label="row.original.status" variant="subtle" size="xs" />
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
    <UFormField label="交付进度">
      <USelect
        v-model="draftProgress"
        :items="progressOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
