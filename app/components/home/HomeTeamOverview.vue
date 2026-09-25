<script setup lang="ts">
import type { DashboardTeamRow } from '~/services'
import { formatCurrency } from '~/utils'

defineProps<{
  teams: DashboardTeamRow[]
  rangeDays: number
}>()

function formatRate(value: number): string {
  // team list stores usageRate/banRate as 0–100 from calcUsageRate
  if (value > 1) return `${value.toFixed(0)}%`
  return `${(value * 100).toFixed(0)}%`
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted uppercase">
          团队概览 · {{ rangeDays }} 日消耗
        </p>
        <div class="flex items-center gap-2">
          <UButton
            to="/teams/analytics"
            label="团队分析"
            size="xs"
            color="primary"
            variant="ghost"
            icon="i-lucide-chart-area"
          />
          <UButton
            to="/teams"
            label="全部团队"
            size="xs"
            color="neutral"
            variant="ghost"
          />
        </div>
      </div>
    </template>

    <div v-if="!teams.length" class="text-sm text-muted py-6 text-center">
      暂无团队数据
    </div>

    <div v-else class="space-y-2">
      <NuxtLink
        v-for="row in teams"
        :key="row.id"
        :to="`/teams/${row.id}`"
        class="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-elevated/50 transition-colors"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted truncate">
            {{ row.name }}
          </p>
          <p class="text-xs text-muted">
            账户 {{ row.accounts }} · 使用率 {{ formatRate(row.usageRate) }}
            · Ban {{ formatRate(row.banRate) }}
          </p>
        </div>
        <p class="text-sm tabular-nums text-highlighted shrink-0">
          {{ formatCurrency(row.spend) }}
        </p>
      </NuxtLink>
    </div>
  </UCard>
</template>
