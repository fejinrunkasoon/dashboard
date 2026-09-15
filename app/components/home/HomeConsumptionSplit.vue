<script setup lang="ts">
import type { DashboardOverview } from '~/types'

const { data: overviewResponse } = await useFetch<{ overview: DashboardOverview }>('/api/overview')

const overview = computed(() => overviewResponse.value?.overview)

const formatNumber = (value: number) => `$${value.toLocaleString()}`

const internalPercent = computed(() => {
  if (!overview.value) return 0
  const total = overview.value.internalConsumed + overview.value.externalConsumed
  if (total === 0) return 0
  return Math.round((overview.value.internalConsumed / total) * 100)
})

const externalPercent = computed(() => 100 - internalPercent.value)
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-xs text-muted uppercase">
        消耗结构 (自家 / 外接)
      </p>
    </template>

    <div v-if="overview" class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">自家产品</span>
            <span class="text-highlighted font-medium">{{ formatNumber(overview.internalConsumed) }}</span>
          </div>
          <div class="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${internalPercent}%` }"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">外接产品</span>
            <span class="text-highlighted font-medium">{{ formatNumber(overview.externalConsumed) }}</span>
          </div>
          <div class="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-secondary transition-all"
              :style="{ width: `${externalPercent}%` }"
            />
          </div>
        </div>
      </div>

      <USeparator />

      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <p class="text-2xl font-semibold text-highlighted">{{ internalPercent }}%</p>
          <p class="text-xs text-muted">自家占比</p>
        </div>
        <div>
          <p class="text-2xl font-semibold text-highlighted">{{ externalPercent }}%</p>
          <p class="text-xs text-muted">外接占比</p>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-dimmed py-8">
      加载中...
    </div>
  </UCard>
</template>