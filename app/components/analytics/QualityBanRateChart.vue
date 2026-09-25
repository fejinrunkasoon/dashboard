<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartEvent,
  type ActiveElement
} from 'chart.js'
import type { QualityGroupBy, QualityPivotRow } from '~/services'
import { navigateQualityDrilldown } from '~/utils/quality-drilldown'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

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

const { cartesianAxis } = useChartTheme()

const sortedRows = computed(() =>
  [...props.rows].sort((a, b) => b.banRate - a.banRate || b.bannedCount - a.bannedCount)
)

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

const chartData = computed(() => ({
  labels: sortedRows.value.map(r => r.label),
  datasets: [
    {
      label: '封禁率',
      data: sortedRows.value.map(r => r.banRate * 100),
      backgroundColor: 'rgba(251, 146, 60, 0.85)',
      borderColor: 'rgb(251, 146, 60)',
      borderWidth: 1
    }
  ]
}))

function onChartClick(_event: ChartEvent, elements: ActiveElement[]) {
  if (!elements.length) return
  const index = elements[0]!.index
  const row = sortedRows.value[index]
  if (!row) return
  void navigateQualityDrilldown(props.groupBy, row, props.lockedQuery)
}

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  onClick: onChartClick,
  scales: {
    x: cartesianAxis({
      beginAtZero: true,
      ticks: {
        callback: (value) => `${Number(value).toFixed(0)}%`
      }
    }),
    y: cartesianAxis({ grid: { display: false } })
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const row = sortedRows.value[context.dataIndex]
          if (!row) return `封禁率: ${formatRate(context.parsed.x / 100)}`
          return `封禁率: ${formatRate(row.banRate)}（${row.bannedCount}/${row.accountCount}）`
        }
      }
    }
  }
}))

const chartHeight = computed(() => Math.max(220, sortedRows.value.length * 36 + 48))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">
        封禁率排名
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
      暂无封禁率数据
    </div>

    <ClientOnly v-else>
      <div :style="{ height: `${chartHeight}px` }">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
