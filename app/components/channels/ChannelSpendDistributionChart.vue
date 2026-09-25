<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js'
import type { ChannelSpendDistribution } from '~/services'
import { formatCurrency } from '~/utils'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  distribution: ChannelSpendDistribution[]
}

const props = defineProps<Props>()

const { legendColor, surfaceColor } = useChartTheme()

const chartData = computed(() => {
  if (!props.distribution.length) return null

  return {
    labels: props.distribution.map(d => d.channelName),
    datasets: [
      {
        data: props.distribution.map(d => d.spend),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderWidth: 2,
        borderColor: surfaceColor.value
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        color: legendColor.value,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || ''
          const value = formatCurrency(context.parsed)
          const percentage = props.distribution[context.dataIndex]?.percentage.toFixed(1) || '0'
          return `${label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">渠道消耗分布</h3>
      <div class="text-xs text-muted">
        Top 8 渠道
      </div>
    </div>

    <div v-if="!distribution.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无分布数据
    </div>

    <ClientOnly v-else>
      <div class="relative h-80 w-full overflow-hidden">
        <Doughnut v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
