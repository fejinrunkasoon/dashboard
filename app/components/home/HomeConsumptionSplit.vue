<script setup lang="ts">
import type { DashboardOwnershipSpend } from '~/services'
import { formatCurrency } from '~/utils'

const props = defineProps<{
  ownershipSpend: DashboardOwnershipSpend
}>()

const internalPercent = computed(() => {
  const total = props.ownershipSpend.internalSpend + props.ownershipSpend.externalSpend
  if (total === 0) return 0
  return Math.round((props.ownershipSpend.internalSpend / total) * 100)
})

const externalPercent = computed(() => {
  const total = props.ownershipSpend.internalSpend + props.ownershipSpend.externalSpend
  if (total === 0) return 0
  return 100 - internalPercent.value
})
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-xs text-muted uppercase">
        消耗结构 (自家 / 外接 · 30D Media Spend)
      </p>
    </template>

    <div class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">自家产品</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(ownershipSpend.internalSpend) }}</span>
          </div>
          <div class="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${internalPercent}%` }"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">外接产品</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(ownershipSpend.externalSpend) }}</span>
          </div>
          <div class="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-secondary transition-all"
              :style="{ width: `${externalPercent}%` }"
            />
          </div>
        </div>
      </div>

      <USeparator />

      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <p class="text-2xl font-semibold text-highlighted">
            {{ internalPercent }}%
          </p>
          <p class="text-xs text-muted">
            自家占比
          </p>
        </div>
        <div>
          <p class="text-2xl font-semibold text-highlighted">
            {{ externalPercent }}%
          </p>
          <p class="text-xs text-muted">
            外接占比
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
