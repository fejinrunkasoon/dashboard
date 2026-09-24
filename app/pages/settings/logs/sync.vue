<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConnectorSyncLog } from '~/services'
import { logsService } from '~/services'

useSeoMeta({ title: '同步日志' })

const pending = ref(true)
const rows = ref<ConnectorSyncLog[]>([])

rows.value = await logsService.getSyncLogs()
pending.value = false

const columns: TableColumn<ConnectorSyncLog>[] = [
  { accessorKey: 'at', header: '时间' },
  { id: 'connector', header: 'Connector / 媒体' },
  { accessorKey: 'scope', header: '范围' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'count', header: '条数' },
  { id: 'error', header: '错误摘要' }
]

function formatAt(value: string) {
  return value.replace('T', ' ').replace('.000Z', ' UTC')
}

function statusColor(status: string) {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'PARTIAL') return 'warning'
  return 'error'
}

function statusLabel(status: string) {
  if (status === 'SUCCEEDED') return '成功'
  if (status === 'PARTIAL') return '部分成功'
  return '失败'
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="同步日志"
      description="Sync Job 结果摘要（与操作审计分离）。业务授权请到平台连接；App 开通请到媒体平台开通。"
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
          label="媒体平台开通"
          icon="i-lucide-plug"
          color="neutral"
          variant="outline"
          to="/settings"
        />
      </div>
    </UPageCard>

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      暂无同步日志。
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
      </UTable>
    </div>
  </div>
</template>
