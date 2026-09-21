<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js'
import type { ChannelSpendTrend } from '~/services'
import { formatCurrency } from '~/utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface Props {
  trends: ChannelSpendTrend[]
}

const props = defineProps<Props>()

const { cartesianAxis, legendColor } = useChartTheme()

const colors = [
  { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' },
  { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' },
  { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgb(251, 146, 60)' },
  { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgb(168, 85, 247)' },
  { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgb(236, 72, 153)' }
]

const chartData = computed(() => {
  if (!props.trends.length) return null

  const channelMap = new Map<string, number[]>()
  const channelNames = new Map<string, string>()

  props.trends.forEach(trend => {
    trend.channels.forEach(ch => {
      if (!channelMap.has(ch.channelId)) {
        channelMap.set(ch.channelId, [])
        channelNames.set(ch.channelId, ch.channelName)
      }
      channelMap.get(ch.channelId)!.push(ch.spend)
    })
  })

  const datasets = Array.from(channelMap.entries()).map(([channelId, data], index) => {
    const color = colors[index % colors.length]
    return {
      label: channelNames.get(channelId) || channelId,
      data,
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      tension: 0.3,
      fill: false
    }
  })

  return {
    labels: props.trends.map(t => {
      const date = new Date(t.date)
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }),
    datasets
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  scales: {
    x: cartesianAxis(),
    y: cartesianAxis({
      beginAtZero: true,
      ticks: {
        callback: (value) => formatCurrency(Number(value))
      }
    })
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
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">渠道消耗趋势</h3>
      <div class="text-xs text-muted">
        Top 5 渠道对比
      </div>
    </div>

    <div v-if="!trends.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无趋势数据
    </div>

    <ClientOnly v-else>
      <div class="h-80">
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
