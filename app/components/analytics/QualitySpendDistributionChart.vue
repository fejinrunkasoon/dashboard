<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartEvent,
  type ActiveElement
} from 'chart.js'
import type { QualityGroupBy, QualityPivotRow } from '~/services'
import { formatCurrency } from '~/utils'
import { navigateQualityDrilldown } from '~/utils/quality-drilldown'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(251, 146, 60, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(14, 165, 233, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(239, 68, 68, 0.8)'
]

const props = withDefaults(defineProps<{
  rows: QualityPivotRow[]
  groupBy: QualityGroupBy
  dimensionHeader?: string
  lockedQuery?: Record<string, string | string[]>
  pending?: boolean
}>(), {
  dimensionHeader: '维度',
  lockedQuery: () => ({}),
  pending: false
})

const { legendColor, surfaceColor } = useChartTheme()

const sortedRows = computed(() =>
  [...props.rows]
    .filter(r => r.spend > 0)
    .sort((a, b) => b.spend - a.spend)
)

const totalSpend = computed(() =>
  sortedRows.value.reduce((sum, r) => sum + r.spend, 0)
)

const chartData = computed(() => {
  if (!sortedRows.value.length) return null
  return {
    labels: sortedRows.value.map(r => r.label),
    datasets: [
      {
        data: sortedRows.value.map(r => r.spend),
        backgroundColor: sortedRows.value.map((_, i) => PALETTE[i % PALETTE.length]!),
        borderWidth: 2,
        borderColor: surfaceColor.value
      }
    ]
  }
})

function onChartClick(_event: ChartEvent, elements: ActiveElement[]) {
  if (!elements.length) return
  const index = elements[0]!.index
  const row = sortedRows.value[index]
  if (!row) return
  void navigateQualityDrilldown(props.groupBy, row, props.lockedQuery)
}

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: onChartClick,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 12,
        color: legendColor.value,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const row = sortedRows.value[context.dataIndex]
          const spend = row?.spend ?? context.parsed
          const pct = totalSpend.value > 0
            ? ((spend / totalSpend.value) * 100).toFixed(1)
            : '0'
          return `${context.label}: ${formatCurrency(spend)} (${pct}%)`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">
        媒体消耗分布
      </h3>
      <div class="text-xs text-muted">
        按{{ dimensionHeader }} · 点击下钻
      </div>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      加载中…
    </div>

    <div v-else-if="!sortedRows.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无消耗数据
    </div>

    <ClientOnly v-else>
      <div class="relative h-72 w-full overflow-hidden">
        <Doughnut v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
