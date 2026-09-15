<script setup lang="ts">
import type { Period, Range, DashboardOverview } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  })
}

const { data: overviewResponse } = await useFetch<{ overview: DashboardOverview }>('/api/overview')

const stats = computed(() => {
  if (!overviewResponse.value?.overview) return []
  const o = overviewResponse.value.overview
  return [{
    title: '账户总数',
    icon: 'i-lucide-layout-grid',
    value: o.totalAccounts.toLocaleString(),
    variation: 8,
    to: '/accounts'
  }, {
    title: '使用中账户',
    icon: 'i-lucide-circle-check',
    value: o.activeAccounts.toLocaleString(),
    variation: 5,
    to: '/accounts'
  }, {
    title: '使用率',
    icon: 'i-lucide-percent',
    value: `${o.usageRate}%`,
    variation: 3,
    to: '/teams'
  }, {
    title: '今日消耗',
    icon: 'i-lucide-circle-dollar-sign',
    value: formatCurrency(o.consumedToday),
    variation: 12,
    to: '/accounts'
  }, {
    title: '今日封户',
    icon: 'i-lucide-shield-alert',
    value: o.bannedToday.toString(),
    variation: -15,
    to: '/alerts'
  }, {
    title: '待处理预警',
    icon: 'i-lucide-bell-ring',
    value: o.pendingAlerts.toString(),
    variation: -20,
    to: '/alerts'
  }]
})
</script>

<template>
  <UPageGrid class="lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      :to="stat.to"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>