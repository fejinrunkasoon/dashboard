<script setup lang="ts">
useSeoMeta({ title: '同步运维' })

const route = useRoute()

const {
  jobs,
  logs,
  platforms,
  selectedMediaId,
  selectedJobId,
  pending,
  errorMessage,
  refresh,
  selectJob,
  setMediaFilter
} = useMediaSync()

await refresh()

async function applyJobFromQuery() {
  const jobId = typeof route.query.jobId === 'string' ? route.query.jobId : null
  if (!jobId) return
  if (selectedJobId.value === jobId) return
  await selectJob(jobId)
}

await applyJobFromQuery()

watch(() => route.query.jobId, () => {
  void applyJobFromQuery()
})

const mediaFilterItems = computed(() => [
  { label: '全部媒体', value: null as string | null },
  ...platforms.value.map(p => ({ label: p.name, value: p.id as string | null }))
])

function statusColor(status: string) {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'RUNNING') return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="同步运维"
      description="运维视角：按 Connection 记录的 Discovery Job / 日志。业务授权与账户导入请使用「账户中心 → 平台连接」。"
      variant="naked"
      orientation="horizontal"
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="进户入口已迁移"
      description="不再通过 Credential 发现账户。发现与去重导入只在平台连接完成。"
    >
      <template #description>
        <div class="mt-2 flex flex-wrap gap-2">
          <UButton
            label="去平台连接"
            size="xs"
            color="primary"
            to="/accounts/connections"
          />
          <UButton
            label="媒体平台开通"
            size="xs"
            color="neutral"
            variant="soft"
            to="/settings"
          />
        </div>
      </template>
    </UAlert>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      :title="errorMessage"
    />

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="媒体筛选">
        <USelectMenu
          :model-value="selectedMediaId"
          :items="mediaFilterItems"
          value-key="value"
          class="w-48"
          @update:model-value="(v: string | null) => setMediaFilter(v)"
        />
      </UFormField>
      <UButton
        label="刷新"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <div class="rounded-lg border border-default overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-elevated/50 text-left text-muted">
          <tr>
            <th class="px-3 py-2 font-medium">Job</th>
            <th class="px-3 py-2 font-medium">Connection</th>
            <th class="px-3 py-2 font-medium">媒体 / impl</th>
            <th class="px-3 py-2 font-medium">状态</th>
            <th class="px-3 py-2 font-medium">统计</th>
            <th class="px-3 py-2 font-medium">时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!jobs.length">
            <td colspan="6" class="px-3 py-8 text-center text-muted">
              暂无 Job。在平台连接执行发现后会出现在这里。
            </td>
          </tr>
          <tr
            v-for="job in jobs"
            :key="job.id"
            class="border-t border-default cursor-pointer hover:bg-elevated/40"
            :class="{ 'bg-elevated/60': selectedJobId === job.id }"
            @click="selectJob(job.id)"
          >
            <td class="px-3 py-2 font-mono text-xs">{{ job.id }}</td>
            <td class="px-3 py-2 font-mono text-xs">{{ job.connectionId || '—' }}</td>
            <td class="px-3 py-2">{{ job.implKey }}</td>
            <td class="px-3 py-2">
              <UBadge :color="statusColor(job.status)" variant="subtle" size="sm">
                {{ job.status }}
              </UBadge>
            </td>
            <td class="px-3 py-2 text-xs text-muted">
              {{ job.stats.discovered }} 发现 /
              {{ job.stats.newCount }} 新 /
              {{ job.stats.alreadyInFfj }} 已在库
            </td>
            <td class="px-3 py-2 text-xs text-muted">{{ job.startedAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-lg border border-default p-4 space-y-2">
      <h3 class="text-sm font-semibold text-highlighted">
        日志
        <span v-if="selectedJobId" class="font-normal text-muted">· {{ selectedJobId }}</span>
      </h3>
      <ul v-if="logs.length" class="space-y-1.5 max-h-64 overflow-auto">
        <li
          v-for="log in logs"
          :key="log.id"
          class="text-xs font-mono text-muted"
        >
          <span class="text-highlighted">[{{ log.level }}]</span>
          {{ log.kind }} — {{ log.message }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted">
        选择上方 Job 查看日志，或尚无记录。
      </p>
    </div>
  </div>
</template>
