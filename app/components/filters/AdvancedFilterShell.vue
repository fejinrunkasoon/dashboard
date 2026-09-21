<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  apply: []
  reset: []
}>()

function apply() {
  emit('apply')
  open.value = false
}

function reset() {
  emit('reset')
}
</script>

<template>
  <USlideover v-model:open="open" title="高级筛选">
    <template #body>
      <div class="flex flex-col gap-4 p-1">
        <slot />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="重置" @click="reset" />
        <UButton label="应用" @click="apply" />
      </div>
    </template>
  </USlideover>
</template>
