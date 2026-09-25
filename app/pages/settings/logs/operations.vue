<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OperationLog, OperationLogResult } from '~/services'
import { logsService } from '~/services'

useSeoMeta({ title: '操作日志' })

const pending = ref(true)
const rows = ref<OperationLog[]>([])
const modules = ref<string[]>([])

const moduleFilter = ref<string | null>(null)
const resultFilter = ref<OperationLogResult | null>(null)
const keyword = ref('')

const moduleItems = computed(() => [
  { label: '全部模块', value: null as string | null },
  ...modules.value.map(m => ({ label: m, value: m as string | null }))
])

const resultItems = [
  { label: '全部结果', value: null as OperationLogResult | null },
  { label: '成功', value: 'SUCCESS' as OperationLogResult | null },
  { label: '失败', value: 'FAILED' as OperationLogResult | null }
]

const columns: TableColumn<OperationLog>[] = [
  { accessorKey: 'at', header: '时间' },
  { accessorKey: 'actor', header: '操作人' },
  { accessorKey: 'module', header: '模块' },
  { accessorKey: 'action', header: '动作' },
  { accessorKey: 'target', header: '对象' },
  { accessorKey: 'result', header: '结果' }
]

function formatAt(value: string) {
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

function resultColor(result: string) {
  return result === 'SUCCESS' ? 'success' : 'error'
}

function resultLabel(result: string) {
  return result === 'SUCCESS' ? '成功' : '失败'
}

async function refresh() {
  pending.value = true
  try {
    modules.value = await logsService.listOperationModules()
    rows.value = await logsService.getOperationLogs({
      module: moduleFilter.value ?? undefined,
      result: resultFilter.value ?? undefined,
      keyword: keyword.value || undefined
    })
  } finally {
    pending.value = false
  }
}

await refresh()

watch([moduleFilter, resultFilter], () => {
  void refresh()
})
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="操作日志"
      description="平台配置、平台连接与账户权限的操作审计（Audit）。与同步日志分离：这里记录「谁做了什么」。新操作会追加到列表顶部。"
      variant="naked"
      class="mb-2"
    />

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="模块">
        <USelectMenu
          v-model="moduleFilter"
          :items="moduleItems"
          value-key="value"
          class="w-44"
        />
      </UFormField>
      <UFormField label="结果">
        <USelectMenu
          v-model="resultFilter"
          :items="resultItems"
          value-key="value"
          class="w-36"
        />
      </UFormField>
      <UFormField label="关键词">
        <UInput
          v-model="keyword"
          placeholder="动作 / 对象 / 操作人"
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
      暂无匹配的操作日志。可到「账户中心 → 平台连接」执行发现/导入后再刷新。
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
