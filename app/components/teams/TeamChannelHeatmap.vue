<script setup lang="ts">
import type { TeamChannelMatrix } from '~/services'
import { formatCurrency } from '~/utils'

interface Props {
  matrix: TeamChannelMatrix | null
}

const props = defineProps<Props>()

function getColorForValue(value: number, max: number): string {
  if (value === 0) return 'bg-gray-100 dark:bg-gray-900'
  const intensity = Math.min(value / max, 1)
  if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-950'
  if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-900'
  if (intensity < 0.6) return 'bg-blue-300 dark:bg-blue-800'
  if (intensity < 0.8) return 'bg-blue-400 dark:bg-blue-700'
  return 'bg-blue-500 dark:bg-blue-600'
}

const maxValue = computed(() => {
  if (!props.matrix) return 0
  return Math.max(...props.matrix.data.flat())
})
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">团队×渠道消耗矩阵</h3>
      <div class="text-xs text-muted">
        热力图（颜色深度表示消耗金额）
      </div>
    </div>

    <div v-if="!matrix" class="flex items-center justify-center py-16 text-muted text-sm">
      暂无矩阵数据
    </div>

    <div v-else class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th class="p-2 text-left font-medium text-muted sticky left-0 bg-white dark:bg-gray-950 z-10">
                团队 \ 渠道
              </th>
              <th
                v-for="(channel, idx) in matrix.channels"
                :key="idx"
                class="p-2 text-center font-medium text-muted min-w-24"
              >
                <div class="truncate" :title="channel">{{ channel }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(team, teamIdx) in matrix.teams"
              :key="teamIdx"
              class="border-t border-gray-200 dark:border-gray-800"
            >
              <td class="p-2 font-medium sticky left-0 bg-white dark:bg-gray-950 z-10">
                <div class="truncate" :title="team">{{ team }}</div>
              </td>
              <td
                v-for="(channel, channelIdx) in matrix.channels"
                :key="channelIdx"
                class="p-2"
              >
                <div
                  :class="[
                    'h-12 rounded flex items-center justify-center text-xs font-medium transition-colors',
                    getColorForValue(matrix.data[teamIdx][channelIdx], maxValue)
                  ]"
                  :title="`${team} × ${channel}: ${formatCurrency(matrix.data[teamIdx][channelIdx])}`"
                >
                  <span v-if="matrix.data[teamIdx][channelIdx] > 0">
                    {{ formatCurrency(matrix.data[teamIdx][channelIdx]) }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center gap-2 text-xs">
        <span class="text-muted">消耗强度:</span>
        <div class="flex items-center gap-1">
          <div class="w-8 h-4 rounded bg-gray-100 dark:bg-gray-900" />
          <span class="text-muted">无</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-8 h-4 rounded bg-blue-200 dark:bg-blue-900" />
          <span class="text-muted">低</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-8 h-4 rounded bg-blue-400 dark:bg-blue-700" />
          <span class="text-muted">中</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-8 h-4 rounded bg-blue-500 dark:bg-blue-600" />
          <span class="text-muted">高</span>
        </div>
      </div>
    </div>
  </div>
</template>
