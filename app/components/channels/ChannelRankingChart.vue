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
  type ChartOptions
} from 'chart.js'
import type { ChannelScore } from '~/services'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  scores: ChannelScore[]
}

const props = defineProps<Props>()

const { cartesianAxis } = useChartTheme()

const chartData = computed(() => {
  const sortedScores = [...props.scores].sort((a, b) => b.overall - a.overall)

  return {
    labels: sortedScores.map(s => s.channelName),
    datasets: [
      {
        label: '综合评分',
        data: sortedScores.map(s => s.overall),
        backgroundColor: sortedScores.map(s => {
          if (s.level === 'EXCELLENT') return 'rgba(34, 197, 94, 0.8)'
          if (s.level === 'GOOD') return 'rgba(59, 130, 246, 0.8)'
          return 'rgba(251, 146, 60, 0.8)'
        }),
        borderColor: sortedScores.map(s => {
          if (s.level === 'EXCELLENT') return 'rgb(34, 197, 94)'
          if (s.level === 'GOOD') return 'rgb(59, 130, 246)'
          return 'rgb(251, 146, 60)'
        }),
        borderWidth: 1
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: cartesianAxis({
      beginAtZero: true,
      max: 100,
      ticks: { stepSize: 20 }
    }),
    y: cartesianAxis({ grid: { display: false } })
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `评分: ${context.parsed.x}`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">渠道评分排行榜</h3>
      <div class="flex items-center gap-2 text-xs">
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded bg-green-500" />
          <span class="text-muted">优秀</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded bg-blue-500" />
          <span class="text-muted">良好</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded bg-orange-500" />
          <span class="text-muted">需改进</span>
        </div>
      </div>
    </div>

    <div v-if="!scores.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无排行数据
    </div>

    <ClientOnly v-else>
      <div class="h-96">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>

    <div v-if="scores.length" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <div class="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ scores.filter(s => s.level === 'EXCELLENT').length }}
          </div>
          <div class="text-muted">优秀渠道</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ scores.filter(s => s.level === 'GOOD').length }}
          </div>
          <div class="text-muted">良好渠道</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {{ scores.filter(s => s.level === 'NEEDS_IMPROVEMENT').length }}
          </div>
          <div class="text-muted">需改进</div>
        </div>
      </div>
    </div>
  </div>
</template>
