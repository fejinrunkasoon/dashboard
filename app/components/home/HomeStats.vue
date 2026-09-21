<script setup lang="ts">
import type { DashboardKpis } from '~/services'
import { formatCurrency } from '~/utils'

defineProps<{
  kpis: DashboardKpis
}>()

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
</script>

<template>
  <UPageGrid class="lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      icon="i-lucide-layout-grid"
      title="账户总数"
      to="/accounts"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ kpis.accountCount.toLocaleString() }}
      </span>
    </UPageCard>

    <UPageCard
      icon="i-lucide-circle-check"
      title="使用中"
      to="/accounts?assetStatuses=IN_USE"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ kpis.inUse.toLocaleString() }}
      </span>
    </UPageCard>

    <UPageCard
      icon="i-lucide-percent"
      title="使用率"
      to="/accounts?assetStatuses=IN_USE"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ formatRate(kpis.usageRate) }}
      </span>
    </UPageCard>

    <UPageCard
      icon="i-lucide-circle-dollar-sign"
      title="今日消耗"
      to="/accounts"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ formatCurrency(kpis.todaySpend) }}
      </span>
    </UPageCard>

    <UPageCard
      icon="i-lucide-shield-alert"
      title="封禁账户"
      to="/accounts?mediaStatuses=BANNED"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ kpis.bannedCount.toLocaleString() }}
      </span>
    </UPageCard>

    <UPageCard
      icon="i-lucide-bell-ring"
      title="待处理预警"
      to="/alerts?statuses=OPEN"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none last:rounded-r-lg hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ kpis.openAlerts.toLocaleString() }}
      </span>
    </UPageCard>
  </UPageGrid>
</template>
