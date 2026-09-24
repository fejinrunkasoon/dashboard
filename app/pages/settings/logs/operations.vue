<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OperationLog } from '~/services'
import { logsService } from '~/services'

useSeoMeta({ title: '操作日志' })

const pending = ref(true)
const rows = ref<OperationLog[]>([])

rows.value = await logsService.getOperationLogs()
pending.value = false

const columns: TableColumn<OperationLog>[] = [
  { accessorKey: 'at', header: '时间' },
  { accessorKey: 'actor', header: '操作人' },
  { accessorKey: 'module', header: '模块' },
  { accessorKey: 'action', header: '动作' },
  { accessorKey: 'target', header: '对象' },
  { accessorKey: 'result', header: '结果' }
]

function formatAt(value: string) {
  return value.replace('T', ' ').replace('.000Z', ' UTC')
}

function resultColor(result: string) {
  return result === 'SUCCESS' ? 'success' : 'error'
}

function resultLabel(result: string) {
  return result === 'SUCCESS' ? '成功' : '失败'
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="操作日志"
      description="平台配置、平台连接与账户权限的操作审计（Audit）。与同步日志分离：这里记录「谁做了什么」。"
      variant="naked"
      class="mb-2"
    />

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      暂无操作日志。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="rows" :columns="columns" class="shrink-0">
        <template #at-cell="{ row }">
          <span class="text-xs text-muted tabular-nums">{{ formatAt(row.original.at) }}</span>
        </template>
        <template #result-cell="{ row }">
          <UBadge
            :label="resultLabel(row.original.result)"
            :color="resultColor(row.original.result)"
            variant="subtle"
            size="xs"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
