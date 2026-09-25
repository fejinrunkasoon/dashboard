<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConnectorSyncLog, SyncLogStatus } from '~/services'
import { logsService, mediaService } from '~/services'

useSeoMeta({ title: '同步日志' })

const pending = ref(true)
const rows = ref<ConnectorSyncLog[]>([])
const mediaItems = ref<{ label: string, value: string | null }[]>([
  { label: '全部媒体', value: null }
])

const mediaFilter = ref<string | null>(null)
const statusFilter = ref<SyncLogStatus | null>(null)
const keyword = ref('')

const statusItems = [
  { label: '全部状态', value: null as SyncLogStatus | null },
  { label: '成功', value: 'SUCCEEDED' as SyncLogStatus | null },
  { label: '部分成功', value: 'PARTIAL' as SyncLogStatus | null },
  { label: '失败', value: 'FAILED' as SyncLogStatus | null },
  { label: '运行中', value: 'RUNNING' as SyncLogStatus | null },
  { label: '等待中', value: 'PENDING' as SyncLogStatus | null }
]

const columns: TableColumn<ConnectorSyncLog>[] = [
  { accessorKey: 'at', header: '时间' },
  { id: 'connector', header: '连接器 / 媒体' },
  { accessorKey: 'scope', header: '范围' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'count', header: '条数' },
  { id: 'error', header: '错误摘要' },
  { id: 'actions', header: '' }
]

function formatAt(value: string) {
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

function statusColor(status: string) {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'PARTIAL' || status === 'RUNNING') return 'warning'
  if (status === 'FAILED') return 'error'
  return 'neutral'
}

function statusLabel(status: string) {
  if (status === 'SUCCEEDED') return '成功'
  if (status === 'PARTIAL') return '部分成功'
  if (status === 'RUNNING') return '运行中'
  if (status === 'PENDING') return '等待中'
  return '失败'
}

async function refresh() {
  pending.value = true
  try {
    const platforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
    mediaItems.value = [
      { label: '全部媒体', value: null },
      ...platforms.map(p => ({ label: p.name, value: p.id as string | null }))
    ]
    rows.value = await logsService.getSyncLogs({
      mediaId: mediaFilter.value ?? undefined,
      status: statusFilter.value ?? undefined,
      keyword: keyword.value || undefined
    })
  } finally {
    pending.value = false
  }
}

await refresh()

watch([mediaFilter, statusFilter], () => {
  void refresh()
})
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="同步日志"
      description="来自平台连接 Discovery Job 的结果摘要（与操作审计分离）。执行账户发现后刷新即可看到新记录。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <div class="flex flex-wrap gap-2 w-fit lg:ms-auto">
        <UButton
          label="同步运维"
          icon="i-lucide-activity"
          color="neutral"
          variant="outline"
          to="/settings/sync"
        />
        <UButton
          label="平台连接"
          icon="i-lucide-link"
          color="neutral"
          variant="outline"
          to="/accounts/connections"
        />
      </div>
    </UPageCard>

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="媒体">
        <USelectMenu
          v-model="mediaFilter"
          :items="mediaItems"
          value-key="value"
          class="w-40"
        />
      </UFormField>
      <UFormField label="状态">
        <USelectMenu
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          class="w-36"
        />
      </UFormField>
      <UFormField label="关键词">
        <UInput
          v-model="keyword"
          placeholder="连接器 / 范围 / 错误"
          class="w-52"
          @keyup.enter="refresh"
        />
      </UFormField>
      <UButton
        label="查询"
        icon="i-lucide-search"
        color="primary"
        variant="soft"
        :loading="pending"
        @click="refresh"
      />
      <UButton
        label="刷新"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <div v-if="pending && !rows.length" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      暂无同步日志。请到「账户中心 → 平台连接」执行账户发现，完成后点刷新。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="rows" :columns="columns" class="shrink-0">
        <template #at-cell="{ row }">
          <span class="text-xs text-muted tabular-nums">{{ formatAt(row.original.at) }}</span>
        </template>
        <template #connector-cell="{ row }">
          <div>
            <p class="text-sm font-medium text-highlighted">{{ row.original.connector }}</p>
            <p class="text-xs text-muted">{{ row.original.media }}</p>
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="statusLabel(row.original.status)"
            :color="statusColor(row.original.status)"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #error-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.errorSummary ?? '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            label="运维详情"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="`/settings/sync?jobId=${row.original.id}`"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
