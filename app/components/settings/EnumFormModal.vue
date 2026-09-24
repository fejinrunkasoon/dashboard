<script setup lang="ts">
import type { DictionaryEnumKind } from '~/services'
import { DICTIONARY_KIND_LABELS } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  kind: DictionaryEnumKind
}>()

const emit = defineEmits<{
  save: [payload: { kind: DictionaryEnumKind, code: string, label: string }]
}>()

const saving = ref(false)
const code = ref('')
const label = ref('')

watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) return
    code.value = ''
    label.value = ''
  }
)

const canSubmit = computed(() => Boolean(code.value.trim() && label.value.trim()))

async function onSubmit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    emit('save', {
      kind: props.kind,
      code: code.value.trim(),
      label: label.value.trim()
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="space-y-1">
            <span class="font-semibold text-highlighted">新增枚举项</span>
            <p class="text-xs text-muted">
              {{ DICTIONARY_KIND_LABELS[kind] }} · code 同分类下不可重复
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Code" required>
            <UInput v-model="code" placeholder="例如：CUSTOM_REASON" class="font-mono" />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="label" placeholder="显示名称" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="open = false" />
            <UButton
              label="保存"
              :loading="saving"
              :disabled="!canSubmit"
              @click="onSubmit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
