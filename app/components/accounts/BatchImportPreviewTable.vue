<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { BatchImportRow, BatchImportRowStatus } from '~/domain'

defineProps<{
  rows: BatchImportRow[]
  pending?: boolean
}>()

const columns: TableColumn<BatchImportRow>[] = [
  { accessorKey: 'rowIndex', header: '#' },
  { accessorKey: 'mediaCode', header: '媒体' },
  { accessorKey: 'externalAccountId', header: '账户 ID' },
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'channelCode', header: '渠道' },
  { accessorKey: 'timezone', header: '时区' },
  { accessorKey: 'rowStatus', header: '状态' },
  { accessorKey: 'issueMessage', header: '说明' }
]

function statusColor(status: BatchImportRowStatus) {
  if (status === 'VALID') return 'success'
  if (status === 'IMPORTED') return 'primary'
  if (status === 'SKIPPED') return 'neutral'
  return 'error'
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <div
      v-if="pending"
      class="flex items-center justify-center gap-2 py-12 text-sm text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      加载预览…
    </div>
    <div
      v-else-if="!rows.length"
      class="py-12 text-center text-sm text-muted"
    >
      暂无预览行。请上传 CSV 或选择已有导入任务。
    </div>
    <UTable
      v-else
      :data="rows"
      :columns="columns"
      class="shrink-0"
    >
      <template #externalAccountId-cell="{ row }">
        <span class="font-mono text-sm">
          {{ row.original.externalAccountId || '—' }}
        </span>
      </template>
      <template #rowStatus-cell="{ row }">
        <UBadge
          :label="row.original.rowStatus"
          :color="statusColor(row.original.rowStatus)"
          variant="subtle"
          size="xs"
        />
      </template>
      <template #issueMessage-cell="{ row }">
        <span class="text-xs text-muted">
          {{ row.original.issueMessage || (row.original.issueCode ?? '—') }}
        </span>
      </template>
    </UTable>
  </div>
</template>
