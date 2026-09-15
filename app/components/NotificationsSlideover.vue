<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { Alert } from '~/types'

const { isNotificationsSlideoverOpen } = useDashboard()

const { data: alerts } = await useFetch<Alert[]>('/api/alerts')

const pendingAlerts = computed(() =>
  alerts.value?.filter(a => a.status === 'pending' || a.status === 'claimed') ?? []
)

const priorityColor = (priority: string) => {
  if (priority === 'urgent') return 'error'
  if (priority === 'warning') return 'warning'
  return 'info'
}

const priorityLabel = (priority: string) => {
  if (priority === 'urgent') return '紧急'
  if (priority === 'warning') return '警告'
  return '提示'
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="预警通知"
  >
    <template #body>
      <div
        v-for="alert in pendingAlerts"
        :key="alert.id"
        class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 first:-mt-3"
      >
        <UBadge
          :color="priorityColor(alert.priority)"
          :label="priorityLabel(alert.priority)"
          variant="subtle"
          size="xs"
          class="mt-1 shrink-0"
        />

        <div class="text-sm flex-1 min-w-0">
          <p class="flex items-center justify-between gap-2">
            <span class="text-highlighted font-medium truncate">{{ alert.title }}</span>

            <time
              :datetime="alert.triggeredAt"
              class="text-muted text-xs shrink-0"
              v-text="formatTimeAgo(new Date(alert.triggeredAt))"
            />
          </p>

          <p class="text-dimmed mt-0.5 line-clamp-2">
            {{ alert.description }}
          </p>
        </div>
      </div>

      <div
        v-if="!pendingAlerts?.length"
        class="text-center text-dimmed py-8"
      >
        暂无待处理预警
      </div>
    </template>
  </USlideover>
</template>