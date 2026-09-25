<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { QualityGroupBy, QualityPivotRow } from '~/services'
import { formatCurrency } from '~/utils'
import { navigateQualityDrilldown } from '~/utils/quality-drilldown'

const props = withDefaults(defineProps<{
  rows: QualityPivotRow[]
  groupBy: QualityGroupBy
  pending?: boolean
  /** Base filters preserved on drill-down (e.g. locked channel/team). */
  lockedQuery?: Record<string, string | string[]>
  dimensionHeader?: string
}>(), {
  pending: false,
  lockedQuery: () => ({}),
  dimensionHeader: 'Dimension'
})

const emit = defineEmits<{
  drilldown: [row: QualityPivotRow]
}>()

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function viewAccounts(row: QualityPivotRow) {
  if (!row.drillable) return
  emit('drilldown', row)
  void navigateQualityDrilldown(props.groupBy, row, props.lockedQuery)
}

const columns = computed<TableColumn<QualityPivotRow>[]>(() => [
  { accessorKey: 'label', header: props.dimensionHeader },
  { accessorKey: 'accountCount', header: '账户' },
  { accessorKey: 'activeValidCount', header: '有效活跃' },
  { accessorKey: 'inUseCount', header: '使用中' },
  { accessorKey: 'idleCount', header: '闲置' },
  { accessorKey: 'bannedCount', header: '封禁' },
  { accessorKey: 'banRate', header: '封禁率' },
  { accessorKey: 'usageRate', header: '使用率' },
  { accessorKey: 'spend', header: '媒体消耗' },
  { id: 'actions', header: '' }
])

function cell(row: Row<QualityPivotRow>): QualityPivotRow {
  return row.original
}
</script>

<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-12 text-muted text-sm gap-2">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      聚合中…
    </div>

    <div
      v-else-if="!rows.length"
      class="flex flex-col items-center justify-center gap-2 py-12 text-muted text-sm"
    >
      <UIcon name="i-lucide-inbox" class="size-8" />
      <p>无匹配数据</p>
    </div>

    <UTable v-else :data="rows" :columns="columns" class="shrink-0">
      <template #label-cell="{ row }">
        <span class="text-sm font-medium">{{ cell(row).label }}</span>
      </template>
      <template #accountCount-cell="{ row }">
        <span class="tabular-nums">{{ cell(row).accountCount }}</span>
      </template>
      <template #activeValidCount-cell="{ row }">
        <span class="tabular-nums">{{ cell(row).activeValidCount }}</span>
      </template>
      <template #inUseCount-cell="{ row }">
        <span class="tabular-nums">{{ cell(row).inUseCount }}</span>
      </template>
      <template #idleCount-cell="{ row }">
        <span class="tabular-nums">{{ cell(row).idleCount }}</span>
      </template>
      <template #bannedCount-cell="{ row }">
        <span
          class="tabular-nums"
          :class="cell(row).bannedCount > 0 ? 'text-warning font-medium' : ''"
        >
          {{ cell(row).bannedCount }}
        </span>
      </template>
      <template #banRate-cell="{ row }">
        <span class="tabular-nums">{{ formatRate(cell(row).banRate) }}</span>
      </template>
      <template #usageRate-cell="{ row }">
        <span class="tabular-nums">{{ formatRate(cell(row).usageRate) }}</span>
      </template>
      <template #spend-cell="{ row }">
        <span class="tabular-nums">{{ formatCurrency(cell(row).spend) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          label="查看账户"
          size="xs"
          color="primary"
          variant="ghost"
          :disabled="!cell(row).drillable"
          @click="viewAccounts(cell(row))"
        />
      </template>
    </UTable>
  </div>
</template>
