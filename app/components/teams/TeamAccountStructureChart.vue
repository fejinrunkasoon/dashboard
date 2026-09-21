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
import type { TeamAccountStructure } from '~/services'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  structure: TeamAccountStructure[]
}

const props = defineProps<Props>()

const { cartesianAxis, legendColor } = useChartTheme()

const chartData = computed(() => {
  return {
    labels: props.structure.map(s => s.teamName),
    datasets: [
      {
        label: '使用中',
        data: props.structure.map(s => s.inUse),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      },
      {
        label: '闲置',
        data: props.structure.map(s => s.idle),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderColor: 'rgb(251, 146, 60)',
        borderWidth: 1
      },
      {
        label: '异常',
        data: props.structure.map(s => s.abnormal),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
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
      <h3 class="text-lg font-semibold">团队账户结构</h3>
      <div class="text-xs text-muted">
        堆叠柱状图
      </div>
    </div>

    <div v-if="!structure.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无结构数据
    </div>

    <ClientOnly v-else>
      <div class="h-80">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </ClientOnly>
  </div>
</template>
