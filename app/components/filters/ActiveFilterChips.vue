<script setup lang="ts">
export interface FilterChip {
  key: string
  label: string
}

defineProps<{
  chips: FilterChip[]
}>()

const emit = defineEmits<{
  remove: [key: string]
  clear: []
}>()
</script>

<template>
  <div v-if="chips.length" class="flex flex-wrap items-center gap-2">
    <UBadge
      v-for="chip in chips"
      :key="chip.key"
      color="neutral"
      variant="subtle"
      class="gap-1 pe-1"
    >
      <span>{{ chip.label }}</span>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="link"
        size="xs"
        class="p-0"
        @click="emit('remove', chip.key)"
      />
    </UBadge>
    <UButton
      label="清除筛选"
      color="neutral"
      variant="ghost"
      size="xs"
      @click="emit('clear')"
    />
  </div>
</template>
