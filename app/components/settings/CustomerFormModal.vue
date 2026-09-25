<script setup lang="ts">
import type { Customer } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  customer?: Customer | null
}>()

const emit = defineEmits<{
  save: [payload: { code: string, name: string, note?: string | null }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const note = ref('')

const isEdit = computed(() => Boolean(props.customer))

watch(
  () => [open.value, props.customer] as const,
  ([isOpen, customer]) => {
    if (!isOpen) return
    if (customer) {
      code.value = customer.code
      name.value = customer.name
      note.value = customer.note ?? ''
    } else {
      code.value = ''
      name.value = ''
      note.value = ''
    }
  }
)

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (!isEdit.value && !code.value.trim()) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    emit('save', {
      code: code.value.trim(),
      name: name.value.trim(),
      note: note.value.trim() || null
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
            <span class="font-semibold text-highlighted">
              {{ isEdit ? '编辑客户' : '新增客户' }}
            </span>
            <p class="text-xs text-muted">
              外接客户主数据。停用后不可再关联新产品；历史绑定保留。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="编码" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：BETA"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="客户名称" />
          </UFormField>
          <UFormField label="备注">
            <UTextarea v-model="note" :rows="2" placeholder="可选" />
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
