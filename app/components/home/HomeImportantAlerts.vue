<script setup lang="ts">
import type { Alert } from '~/domain'

defineProps<{
  alerts: Alert[]
}>()

const severityColor = (severity: string) => {
  if (severity === 'URGENT') return 'error'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted uppercase">
          重要预警
        </p>
        <UButton
          to="/alerts"
          label="预警中心"
          size="xs"
          color="neutral"
          variant="ghost"
        />
      </div>
    </template>

    <div v-if="!alerts.length" class="text-sm text-muted py-6 text-center">
      暂无待处理预警
    </div>

    <div v-else class="space-y-2">
      <NuxtLink
        v-for="alert in alerts"
        :key="alert.id"
        to="/alerts"
        class="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-elevated/50 transition-colors"
      >
        <UBadge
          :label="alert.severity"
          :color="severityColor(alert.severity)"
          variant="subtle"
          size="xs"
          class="mt-0.5 shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-highlighted truncate">
              {{ alert.title }}
            </p>
            <UBadge
              :label="alert.status"
              variant="subtle"
              color="neutral"
              size="xs"
              class="shrink-0"
            />
          </div>
          <p class="text-xs text-muted line-clamp-2 mt-0.5">
            {{ alert.description }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </UCard>
</template>
