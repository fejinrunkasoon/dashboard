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
import type { TeamSpendRanking } from '~/services'
import { formatCurrency } from '~/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  rankings: TeamSpendRanking[]
}

const props = defineProps<Props>()

const { cartesianAxis } = useChartTheme()

const chartData = computed(() => {
  return {
    labels: props.rankings.map(r => r.teamName),
    datasets: [
      {
        label: '消耗金额',
        data: props.rankings.map(r => r.spend),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
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
      ticks: {
        callback: (value) => formatCurrency(Number(value))
      }
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
          return `消耗: ${formatCurrency(context.parsed.x)}`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">团队消耗排名</h3>
      <div class="text-xs text-muted">
        Top 10
      </div>
    </div>

    <div v-if="!rankings.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无排名数据
    </div>

    <ClientOnly v-else>
      <div class="h-96">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
