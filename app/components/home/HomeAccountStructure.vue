<script setup lang="ts">
import type { AccountStructure } from '~/types'

const { data } = await useFetch<{ accountStructure: AccountStructure }>('/api/overview')

const structure = computed(() => data.value?.accountStructure)

const total = computed(() => {
  if (!structure.value) return 0
  const s = structure.value
  return s.pending + s.allocated + s.active + s.idle + s.abnormal + s.banned + s.disabled
})

const items = computed(() => {
  if (!structure.value || total.value === 0) return []
  const s = structure.value
  const t = total.value
  return [
    { label: '待分配', value: s.pending, color: 'bg-neutral-400', percent: Math.round((s.pending / t) * 100) },
    { label: '已分配', value: s.allocated, color: 'bg-blue-400', percent: Math.round((s.allocated / t) * 100) },
    { label: '使用中', value: s.active, color: 'bg-green-500', percent: Math.round((s.active / t) * 100) },
    { label: '闲置', value: s.idle, color: 'bg-yellow-400', percent: Math.round((s.idle / t) * 100) },
    { label: '异常', value: s.abnormal, color: 'bg-orange-400', percent: Math.round((s.abnormal / t) * 100) },
    { label: '封户', value: s.banned, color: 'bg-red-500', percent: Math.round((s.banned / t) * 100) },
    { label: '停用', value: s.disabled, color: 'bg-gray-400', percent: Math.round((s.disabled / t) * 100) }
  ]
})
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-xs text-muted uppercase">
        账户资源结构
      </p>
    </template>

    <div v-if="structure" class="space-y-4">
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
        <div
          v-for="item in items"
          :key="item.label"
          class="text-center"
        >
          <div class="flex items-center justify-center gap-1.5 mb-0.5">
            <span :class="item.color" class="inline-block size-2 rounded-full shrink-0" />
            <span class="text-xs text-muted">{{ item.label }}</span>
          </div>
          <p class="text-lg font-semibold text-highlighted">{{ item.value }}</p>
          <p class="text-xs text-dimmed">{{ item.percent }}%</p>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-dimmed py-8">
      加载中...
    </div>
  </UCard>
</template>