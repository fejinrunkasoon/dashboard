<script setup lang="ts">
import type { SyncJob } from '~/domain'

defineProps<{
  jobs: SyncJob[]
  pending?: boolean
}>()

function statusColor(status: string) {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'RUNNING') return 'info'
  return 'neutral'
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <table class="w-full min-w-[520px] text-left text-sm">
      <thead class="border-b border-default bg-elevated/50 text-xs text-muted">
        <tr>
          <th class="px-3 py-2 font-medium">Job</th>
          <th class="px-3 py-2 font-medium">状态</th>
          <th class="px-3 py-2 font-medium">发现</th>
          <th class="px-3 py-2 font-medium">NEW</th>
          <th class="px-3 py-2 font-medium">缺失</th>
          <th class="px-3 py-2 font-medium">开始</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pending">
          <td colspan="6" class="px-3 py-4 text-center text-muted">加载中…</td>
        </tr>
        <tr v-else-if="!jobs.length">
          <td colspan="6" class="px-3 py-4 text-center text-muted">尚无 Sync Job</td>
        </tr>
        <tr
          v-for="job in jobs"
          :key="job.id"
          class="border-b border-default/60 last:border-0"
        >
          <td class="px-3 py-2 font-mono text-xs">{{ job.id }}</td>
          <td class="px-3 py-2">
            <UBadge :label="job.status" :color="statusColor(job.status)" variant="subtle" size="xs" />
          </td>
          <td class="px-3 py-2">{{ job.stats.discovered }}</td>
          <td class="px-3 py-2">{{ job.stats.newCount }}</td>
          <td class="px-3 py-2">{{ job.stats.missingInMedia }}</td>
          <td class="px-3 py-2 text-xs text-muted">{{ job.startedAt.slice(0, 19).replace('T', ' ') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
