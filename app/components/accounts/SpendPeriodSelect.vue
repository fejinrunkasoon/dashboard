<script setup lang="ts">
import type { SpendPeriodPreset } from '~/domain'

export type SpendPeriod = SpendPeriodPreset

const model = defineModel<SpendPeriod>({ default: '7D' })
const customFrom = defineModel<string | undefined>('customFrom')
const customTo = defineModel<string | undefined>('customTo')

const emit = defineEmits<{
  change: [period: SpendPeriod]
}>()

watch(model, (value) => {
  emit('change', value)
})
</script>

<template>
  <FiltersPeriodFilter
    v-model="model"
    v-model:custom-from="customFrom"
    v-model:custom-to="customTo"
    label="周期消耗"
  />
</template>
