<script setup lang="ts">
import type { SyncLog } from '~/domain'

defineProps<{
  logs: SyncLog[]
  pending?: boolean
}>()

function levelColor(level: string) {
  if (level === 'ERROR') return 'error'
  if (level === 'WARN') return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-default p-3">
    <p v-if="pending" class="text-sm text-muted">加载中…</p>
    <p v-else-if="!logs.length" class="text-sm text-muted">尚无 Sync Log</p>
    <div
      v-for="log in logs"
      :key="log.id"
      class="flex flex-wrap items-start gap-2 border-b border-default/40 pb-2 text-xs last:border-0 last:pb-0"
    >
      <UBadge :label="log.kind" color="neutral" variant="subtle" size="xs" />
      <UBadge :label="log.level" :color="levelColor(log.level)" variant="subtle" size="xs" />
      <span class="text-muted">{{ log.at.slice(0, 19).replace('T', ' ') }}</span>
      <span class="w-full text-highlighted sm:w-auto">{{ log.message }}</span>
    </div>
  </div>
</template>
