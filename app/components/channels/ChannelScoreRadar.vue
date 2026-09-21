<script setup lang="ts">
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js'
import type { ChannelScore } from '~/services'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface Props {
  scores: ChannelScore[]
}

const props = defineProps<Props>()

const { gridColor, tickColor, tickBackdropColor } = useChartTheme()

const selectedChannelIndex = ref(0)
const selectedChannel = computed(() => props.scores[selectedChannelIndex.value] || null)

const chartData = computed(() => {
  if (!selectedChannel.value) return null

  const dims = selectedChannel.value.dimensions

  return {
    labels: ['稳定性', '有效率', '异常率', '生命周期', '消耗表现', '余额能力'],
    datasets: [
      {
        label: selectedChannel.value.channelName,
        data: [
          dims.stability,
          dims.validRate,
          dims.abnormalRate,
          dims.lifetime,
          dims.spend,
          dims.balance
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'radar'>>(() => ({
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      grid: { color: gridColor.value },
      angleLines: { color: gridColor.value },
      pointLabels: { color: tickColor.value },
      ticks: {
        stepSize: 20,
        color: tickColor.value,
        backdropColor: tickBackdropColor.value
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `${context.label}: ${context.parsed.r.toFixed(1)}`
        }
      }
    }
  }
}))

function getLevelColor(level: string) {
  switch (level) {
    case 'EXCELLENT': return 'success'
    case 'GOOD': return 'primary'
    case 'NEEDS_IMPROVEMENT': return 'warning'
    default: return 'neutral'
  }
}

function getLevelText(level: string) {
  switch (level) {
    case 'EXCELLENT': return '优秀'
    case 'GOOD': return '良好'
    case 'NEEDS_IMPROVEMENT': return '需改进'
    default: return level
  }
}
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">渠道综合评分</h3>
      <UBadge
        v-if="selectedChannel"
        :label="getLevelText(selectedChannel.level)"
        :color="getLevelColor(selectedChannel.level)"
        variant="subtle"
      />
    </div>

    <div v-if="!scores.length" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无评分数据
    </div>

    <template v-else>
      <div class="mb-4">
        <USelect
          v-model="selectedChannelIndex"
          :items="scores.map((s, i) => ({ label: `#${s.rank} ${s.channelName} (${s.overall})`, value: i }))"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </div>

      <div v-if="selectedChannel" class="space-y-4">
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="text-4xl font-bold text-primary">{{ selectedChannel.overall }}</div>
            <div class="text-sm text-muted">综合评分</div>
          </div>
        </div>

        <ClientOnly>
          <div class="h-80 flex items-center justify-center">
            <Radar v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>
        </ClientOnly>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">稳定性</div>
            <div class="font-medium">{{ selectedChannel.dimensions.stability.toFixed(1) }}</div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">有效率</div>
            <div class="font-medium">{{ selectedChannel.dimensions.validRate.toFixed(1) }}%</div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">异常率</div>
            <div class="font-medium">{{ selectedChannel.dimensions.abnormalRate.toFixed(1) }}</div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">生命周期</div>
            <div class="font-medium">{{ selectedChannel.dimensions.lifetime.toFixed(1) }}</div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">消耗表现</div>
            <div class="font-medium">{{ selectedChannel.dimensions.spend.toFixed(1) }}</div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900">
            <div class="text-muted">余额能力</div>
            <div class="font-medium">{{ selectedChannel.dimensions.balance.toFixed(1) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
