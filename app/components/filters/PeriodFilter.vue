<script setup lang="ts">
import type { SpendPeriodPreset } from '~/domain'

const model = defineModel<SpendPeriodPreset>({ default: '7D' })
const customFrom = defineModel<string | undefined>('customFrom')
const customTo = defineModel<string | undefined>('customTo')

withDefaults(defineProps<{
  label?: string
  selectClass?: string
}>(), {
  label: '周期',
  selectClass: 'w-28'
})

const items = [
  { label: '今日', value: 'TODAY' },
  { label: '7天', value: '7D' },
  { label: '30天', value: '30D' },
  { label: '自定义', value: 'CUSTOM' }
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 min-w-0">
    <span v-if="label" class="text-sm text-muted shrink-0">{{ label }}</span>
    <USelect
      v-model="model"
      :items="items"
      value-key="value"
      label-key="label"
      :class="selectClass"
    />
    <template v-if="model === 'CUSTOM'">
      <UInput
        :model-value="customFrom"
        type="date"
        class="w-40"
        @update:model-value="customFrom = String($event ?? '') || undefined"
      />
      <span class="text-muted text-sm">至</span>
      <UInput
        :model-value="customTo"
        type="date"
        class="w-40"
        @update:model-value="customTo = String($event ?? '') || undefined"
      />
    </template>
  </div>
</template>
