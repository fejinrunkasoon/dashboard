<script setup lang="ts">
export interface QuickFilterOption {
  label: string
  value: string
}

const model = defineModel<string>({ default: 'all' })

withDefaults(defineProps<{
  label?: string
  options: QuickFilterOption[]
}>(), {
  label: ''
})
</script>

<template>
  <div class="flex items-center gap-2 min-w-0">
    <span v-if="label" class="text-sm text-muted shrink-0">{{ label }}</span>
    <USelect
      v-model="model"
      :items="options"
      value-key="value"
      label-key="label"
      class="w-40"
    />
  </div>
</template>
