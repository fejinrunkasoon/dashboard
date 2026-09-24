<script setup lang="ts">
import { eachDayOfInterval } from 'date-fns'
import type { Period, Range } from '~/types'

const model = defineModel<Period>({ required: true })

const props = defineProps<{
  range: Range
}>()

const days = computed(() => eachDayOfInterval(props.range))

const periodLabels: Record<Period, string> = {
  daily: '按日',
  weekly: '按周',
  monthly: '按月'
}

const periods = computed<Period[]>(() => {
  // Short windows: only daily is meaningful.
  if (days.value.length <= 8) {
    return ['daily']
  }

  return ['daily', 'weekly', 'monthly']
})

watch(periods, () => {
  if (!periods.value.includes(model.value)) {
    model.value = periods.value[0]!
  }
})

const displayItems = computed(() =>
  periods.value.map(p => ({ label: periodLabels[p], value: p }))
)
</script>

<template>
  <USelect
    v-model="model"
    :items="displayItems"
    value-key="value"
    label-key="label"
    variant="ghost"
    class="data-[state=open]:bg-elevated"
    :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
  />
</template>