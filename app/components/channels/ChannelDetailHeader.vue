<script setup lang="ts">
import type { ChannelDetailBundle, ChannelMetrics } from '~/services'
import { formatCurrency } from '~/utils'
import { ENTITY_STATUS_LABEL, labelOf } from '~/utils/labels'

const props = defineProps<{
  detail: ChannelDetailBundle
}>()

const m = computed(() => props.detail.metrics)

const kpiItems = computed(() => {
  const metrics: ChannelMetrics = m.value
  return [
    { label: '已交付', value: String(metrics.deliveredAccounts) },
    { label: '有效', value: String(metrics.currentValid) },
    { label: '使用中', value: String(metrics.inUse) },
    { label: '异常', value: String(metrics.abnormal), warn: metrics.abnormal > 0 },
    {
      label: '平均寿命',
      value: metrics.averageLifetimeDays == null ? '—' : `${metrics.averageLifetimeDays}d`
    },
    { label: '今日', value: formatCurrency(metrics.todaySpend) },
    { label: '7D', value: formatCurrency(metrics.spend7d) },
    { label: '30D Media', value: formatCurrency(metrics.spend30d) }
  ]
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-xl font-semibold text-highlighted">
            {{ detail.channel.name }}
          </h1>
          <UBadge :label="detail.channel.code" variant="subtle" color="neutral" size="xs" class="font-mono" />
          <UBadge :label="labelOf(ENTITY_STATUS_LABEL, detail.channel.status)" variant="subtle" size="xs" />
        </div>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="media in detail.supportedMedia"
            :key="media.id"
            :label="media.name"
            variant="subtle"
            color="neutral"
            size="xs"
          />
        </div>
        <p class="text-sm text-muted">
          联系人：{{ detail.channel.contactName ?? '—' }}
          <span class="mx-1.5 text-dimmed">·</span>
          Telegram：{{ detail.channel.telegramReference ?? '—' }}
        </p>
      </div>
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
        <p
          class="mt-1 text-sm font-medium"
          :class="item.warn ? 'text-warning' : 'text-highlighted'"
        >
          {{ item.value }}
        </p>
      </div>
    </div>
  </div>
</template>
