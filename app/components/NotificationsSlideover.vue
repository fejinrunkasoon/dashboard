<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { Alert } from '~/domain'
import { alertService } from '~/services'

const { isNotificationsSlideoverOpen } = useDashboard()

const alerts = ref<Alert[]>([])
const pending = ref(true)

async function load() {
  pending.value = true
  try {
    const result = await alertService.getAlerts({
      statuses: ['OPEN', 'IN_PROGRESS'],
      page: 1,
      pageSize: 20
    })
    alerts.value = result.data
  } finally {
    pending.value = false
  }
}

watch(isNotificationsSlideoverOpen, (open) => {
  if (open) void load()
}, { immediate: true })

const severityColor = (severity: string) => {
  if (severity === 'URGENT') return 'error'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

const severityLabel = (severity: string) => {
  if (severity === 'URGENT') return '紧急'
  if (severity === 'WARNING') return '警告'
  return '提示'
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="预警通知"
  >
    <template #body>
      <div v-if="pending" class="text-center text-dimmed py-8 text-sm">
        加载中…
      </div>

      <template v-else>
        <NuxtLink
          v-for="alert in alerts"
          :key="alert.id"
          to="/alerts"
          class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 first:-mt-3"
          @click="isNotificationsSlideoverOpen = false"
        >
          <UBadge
            :color="severityColor(alert.severity)"
            :label="severityLabel(alert.severity)"
            variant="subtle"
            size="xs"
            class="mt-1 shrink-0"
          />

          <div class="text-sm flex-1 min-w-0">
            <p class="flex items-center justify-between gap-2">
              <span class="text-highlighted font-medium truncate">{{ alert.title }}</span>

              <time
                :datetime="alert.detectedAt"
                class="text-muted text-xs shrink-0"
                v-text="formatTimeAgo(new Date(alert.detectedAt))"
              />
            </p>

            <p class="text-dimmed mt-0.5 line-clamp-2">
              {{ alert.description }}
            </p>
          </div>
        </NuxtLink>

        <div
          v-if="!alerts.length"
          class="text-center text-dimmed py-8"
        >
          暂无待处理预警
        </div>

        <div v-else class="pt-3">
          <UButton
            to="/alerts"
            label="打开预警中心"
            block
            color="neutral"
            variant="soft"
            size="sm"
            @click="isNotificationsSlideoverOpen = false"
          />
        </div>
      </template>
    </template>
  </USlideover>
</template>
