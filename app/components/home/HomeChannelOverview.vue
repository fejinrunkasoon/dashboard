<script setup lang="ts">
import type { DashboardChannelRow } from '~/services'
import { formatCurrency } from '~/utils'

defineProps<{
  channels: DashboardChannelRow[]
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted uppercase">
          渠道概览
        </p>
        <div class="flex items-center gap-2">
          <UButton
            to="/channels/analytics"
            label="渠道分析"
            size="xs"
            color="primary"
            variant="ghost"
            icon="i-lucide-chart-line"
          />
          <UButton
            to="/channels"
            label="全部渠道"
            size="xs"
            color="neutral"
            variant="ghost"
          />
        </div>
      </div>
    </template>

    <div v-if="!channels.length" class="text-sm text-muted py-6 text-center">
      暂无渠道数据
    </div>

    <div v-else class="space-y-2">
      <NuxtLink
        v-for="row in channels"
        :key="row.id"
        :to="`/channels/${row.id}`"
        class="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-elevated/50 transition-colors"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted truncate">
            {{ row.name }}
          </p>
          <p class="text-xs text-muted">
            有效 {{ row.currentValid }} · 使用中 {{ row.inUse }}
            <span v-if="row.abnormal > 0" class="text-warning"> · 异常 {{ row.abnormal }}</span>
          </p>
        </div>
        <p class="text-sm tabular-nums text-highlighted shrink-0">
          {{ formatCurrency(row.spend30d) }}
        </p>
      </NuxtLink>
    </div>
  </UCard>
</template>
