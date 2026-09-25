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

const { cartesianAxis, legendColor } = useChartTheme()

/** Preserve API order (already sorted by current sortBy). */
const displayRows = computed(() => props.rows)

const chartData = computed(() => ({
  labels: displayRows.value.map(r => r.label),
  datasets: [
    {
      label: '使用中',
      data: displayRows.value.map(r => r.inUseCount),
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1
    },
    {
      label: '闲置',
      data: displayRows.value.map(r => r.idleCount),
      backgroundColor: 'rgba(251, 146, 60, 0.8)',
      borderColor: 'rgb(251, 146, 60)',
      borderWidth: 1
    },
    {
      label: '封禁',
      data: displayRows.value.map(r => r.bannedCount),
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1
    }
  ]
}))

function onChartClick(_event: ChartEvent, elements: ActiveElement[]) {
  if (!elements.length) return
  const index = elements[0]!.index
  const row = displayRows.value[index]
  if (!row) return
  void navigateQualityDrilldown(props.groupBy, row, props.lockedQuery)
}

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: onChartClick,
  scales: {
    x: cartesianAxis({ stacked: true }),
    y: cartesianAxis({ stacked: true, beginAtZero: true })
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 15,
        color: legendColor.value
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">
        账户状态结构
      </h3>
      <div class="text-xs text-muted">
        按{{ dimensionHeader }} · 使用中 / 闲置 / 封禁 · 点击下钻
      </div>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      加载中…
    </div>

    <div v-else-if="!displayRows.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无结构数据
    </div>

    <ClientOnly v-else>
      <div class="h-80">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
