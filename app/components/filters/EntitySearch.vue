<script setup lang="ts">
const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  placeholder?: string
}>(), {
  placeholder: '搜索账户 ID / 名称 / BM·MCC ID'
})

const emit = defineEmits<{
  search: [value: string]
}>()

function onUpdate(value: string) {
  model.value = value
  emit('search', value)
}
</script>

<template>
  <UInput
    :model-value="model"
    icon="i-lucide-search"
    :placeholder="placeholder"
    class="w-full max-w-sm"
    @update:model-value="onUpdate(String($event ?? ''))"
  />
</template>
