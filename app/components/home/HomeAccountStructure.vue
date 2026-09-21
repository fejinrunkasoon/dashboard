<script setup lang="ts">
import type { DashboardAccountStructure } from '~/services'

const props = defineProps<{
  accountStructure: DashboardAccountStructure
}>()

const buckets = computed(() => {
  const s = props.accountStructure
  return [
    { label: '可用', value: s.available, color: 'bg-neutral-400', to: '/accounts?assetStatuses=AVAILABLE' },
    { label: '已分配', value: s.assigned, color: 'bg-blue-400', to: '/accounts?assetStatuses=ASSIGNED' },
    { label: '使用中', value: s.inUse, color: 'bg-green-500', to: '/accounts?assetStatuses=IN_USE' },
    { label: '闲置', value: s.idle, color: 'bg-yellow-400', to: '/accounts?assetStatuses=IDLE' },
    { label: '停用', value: s.disabled, color: 'bg-gray-400', to: '/accounts?assetStatuses=DISABLED' },
    { label: '归档', value: s.archived, color: 'bg-slate-500', to: '/accounts?assetStatuses=ARCHIVED' },
    { label: '封禁', value: s.mediaBanned, color: 'bg-red-500', to: '/accounts?mediaStatuses=BANNED' }
  ]
})

const total = computed(() =>
  buckets.value.reduce((sum, item) => sum + item.value, 0)
)

const items = computed(() => {
  const t = total.value
  if (t === 0) return buckets.value.map(item => ({ ...item, percent: 0 }))
  return buckets.value.map(item => ({
    ...item,
    percent: Math.round((item.value / t) * 100)
  }))
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted uppercase">
          账户资源结构
        </p>
        <UButton
          to="/accounts"
          label="全部账户"
          size="xs"
          color="neutral"
          variant="ghost"
        />
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex h-4 rounded-full overflow-hidden">
        <div
          v-for="item in items"
          :key="item.label"
          :class="item.color"
          class="transition-all"
          :style="{ width: `${item.percent}%` }"
        />
      </div>

      <div class="grid grid-cols-4 gap-2">
        <NuxtLink
          v-for="item in items"
          :key="item.label"
          :to="item.to"
          class="text-center rounded-md p-1 hover:bg-elevated/50 transition-colors"
        >
          <div class="flex items-center justify-center gap-1.5 mb-0.5">
            <span :class="item.color" class="inline-block size-2 rounded-full shrink-0" />
            <span class="text-xs text-muted">{{ item.label }}</span>
          </div>
          <p class="text-lg font-semibold text-highlighted">
            {{ item.value }}
          </p>
          <p class="text-xs text-dimmed">
            {{ item.percent }}%
          </p>
        </NuxtLink>
      </div>
    </div>
  </UCard>
</template>
