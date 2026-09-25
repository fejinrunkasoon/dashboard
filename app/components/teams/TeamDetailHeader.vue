<script setup lang="ts">
import type { TeamDetailBundle, TeamMetrics } from '~/services'
import { formatCurrency } from '~/utils'
import { ENTITY_STATUS_LABEL, labelOf } from '~/utils/labels'

const props = defineProps<{
  detail: TeamDetailBundle
}>()

const emit = defineEmits<{
  apply: []
}>()

const m = computed(() => props.detail.metrics)

function usageColor(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warning'
  return 'error'
}

const kpiItems = computed(() => {
  const metrics: TeamMetrics = m.value
  return [
    { label: '账户', value: String(metrics.accounts) },
    { label: '使用中', value: String(metrics.inUse) },
    { label: '闲置', value: String(metrics.idle) },
    { label: '使用率', value: `${metrics.usageRate}%`, badge: true },
    { label: '今日', value: formatCurrency(metrics.todaySpend) },
    { label: '7D', value: formatCurrency(metrics.spend7d) },
    { label: '封禁率', value: `${metrics.banRate}%`, warn: metrics.banRate > 10 },
    { label: '未满足', value: String(metrics.unfulfilledDemand), warn: metrics.unfulfilledDemand > 0 }
  ]
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-xl font-semibold text-highlighted">
            {{ detail.team.name }}
          </h1>
          <UBadge :label="detail.team.code" variant="subtle" color="neutral" size="xs" class="font-mono" />
          <UBadge :label="labelOf(ENTITY_STATUS_LABEL, detail.team.status)" variant="subtle" size="xs" />
        </div>
        <p class="text-sm text-muted">
          负责人：{{ detail.leader?.name ?? '—' }}
          <span class="mx-1.5 text-dimmed">·</span>
          成员 {{ detail.metrics.memberCount }}
        </p>
      </div>

      <UButton
        label="申请账户"
        icon="i-lucide-plus"
        color="primary"
        @click="emit('apply')"
      />
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <div
        v-for="item in kpiItems"
        :key="item.label"
        class="rounded-lg border border-default px-3 py-2"
      >
        <p class="text-xs text-muted">
          {{ item.label }}
        </p>
        <div class="mt-1">
          <UBadge
            v-if="item.badge"
            :label="item.value"
            :color="usageColor(detail.metrics.usageRate)"
            variant="subtle"
            size="xs"
          />
          <p
            v-else
            class="text-sm font-medium"
            :class="item.warn ? 'text-warning' : 'text-highlighted'"
          >
            {{ item.value }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
