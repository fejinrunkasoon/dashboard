<script setup lang="ts">
import type { AccountTimelineEvent } from '~/domain'

defineProps<{
  events: AccountTimelineEvent[]
  limit?: number
}>()

const typeLabel: Record<string, string> = {
  IMPORTED: '入库',
  ASSIGNED: '分配',
  TRANSFERRED: '划转',
  RECYCLED: '回收',
  PRODUCT_CHANGED: '产品',
  MANAGER_CHANGED: '户管',
  PLATFORM_ASSET_CHANGED: '资产',
  CHANNEL_CHANGED: '渠道',
  FEE_POLICY_CHANGED: '费率',
  STATUS_CHANGED: '状态',
  DISABLED: '停用'
}

const typeColor: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary'> = {
  IMPORTED: 'primary',
  ASSIGNED: 'info',
  TRANSFERRED: 'info',
  RECYCLED: 'warning',
  PRODUCT_CHANGED: 'secondary',
  MANAGER_CHANGED: 'secondary',
  PLATFORM_ASSET_CHANGED: 'neutral',
  CHANNEL_CHANGED: 'neutral',
  FEE_POLICY_CHANGED: 'neutral',
  STATUS_CHANGED: 'warning',
  DISABLED: 'error'
}
</script>

<template>
  <div v-if="!events.length" class="text-sm text-muted py-6 text-center">
    暂无时间线事件
  </div>
  <ul v-else class="space-y-3">
    <li
      v-for="event in (limit ? events.slice(0, limit) : events)"
      :key="event.id"
      class="flex gap-3 text-sm"
    >
      <div class="w-28 shrink-0 text-xs text-muted font-mono pt-0.5">
        {{ event.at.slice(0, 10) }}
      </div>
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge
            :label="typeLabel[event.type] ?? event.type"
            :color="typeColor[event.type] ?? 'neutral'"
            variant="subtle"
            size="xs"
          />
          <span class="font-medium text-highlighted">{{ event.title }}</span>
        </div>
        <p class="text-muted text-xs">
          {{ event.description }}
        </p>
        <p v-if="event.actor" class="text-xs text-muted">
          操作人：{{ event.actor }}
        </p>
      </div>
    </li>
  </ul>
</template>
