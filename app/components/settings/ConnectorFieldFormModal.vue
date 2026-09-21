<script setup lang="ts">
import type { MediaFieldDefinition, MediaFieldOption, MediaFieldType, MediaFieldUsage } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  mediaId: string | null
  usage: MediaFieldUsage
  field?: MediaFieldDefinition | null
}>()

const emit = defineEmits<{
  save: [payload: {
    mediaId: string
    usage: MediaFieldUsage
    key: string
    label: string
    fieldType: MediaFieldType
    required: boolean
    options?: MediaFieldOption[]
    sourceKey?: string | null
  }]
}>()

const saving = ref(false)
const key = ref('')
const label = ref('')
const fieldType = ref<MediaFieldType>('text')
const required = ref(false)
const sourceKey = ref('')
const optionsText = ref('')

const isEdit = computed(() => Boolean(props.field))

const typeOptions = [
  { label: 'text', value: 'text' },
  { label: 'select', value: 'select' }
]

watch(
  () => [open.value, props.field, props.usage] as const,
  ([isOpen, field]) => {
    if (!isOpen) return
    if (field) {
      key.value = field.key
      label.value = field.label
      fieldType.value = field.fieldType
      required.value = field.required
      sourceKey.value = field.sourceKey ?? ''
      optionsText.value = (field.options ?? []).map(o => `${o.value}|${o.label}`).join('\n')
    } else {
      key.value = ''
      label.value = ''
      fieldType.value = 'text'
      required.value = false
      sourceKey.value = ''
      optionsText.value = ''
    }
  }
)

function parseOptions(): MediaFieldOption[] | undefined {
  if (fieldType.value !== 'select') return undefined
  const lines = optionsText.value.split('\n').map(line => line.trim()).filter(Boolean)
  return lines.map((line) => {
    const [value, ...rest] = line.split('|')
    const optLabel = rest.join('|').trim() || value!.trim()
    return { value: value!.trim(), label: optLabel }
  })
}

const canSubmit = computed(() => {
  if (!props.mediaId) return false
  if (!label.value.trim()) return false
  if (!isEdit.value && !key.value.trim()) return false
  if (fieldType.value === 'select') {
    const opts = parseOptions()
    if (!opts?.length) return false
  }
  return true
})

function onSubmit() {
  if (!canSubmit.value || !props.mediaId || saving.value) return
  saving.value = true
  try {
    emit('save', {
      mediaId: props.mediaId,
      usage: props.usage,
      key: key.value.trim(),
      label: label.value.trim(),
      fieldType: fieldType.value,
      required: required.value,
      options: parseOptions(),
      sourceKey: props.usage === 'ACCOUNT_MAP' ? (sourceKey.value.trim() || null) : null
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
              {{ isEdit ? '编辑字段' : '新增字段' }}
              · {{ usage === 'DEMAND' ? '申请单' : '账户映射' }}
            </span>
            <p class="text-xs text-muted">
              key 创建后不可改。Timezone 是公共字段，不在此配置。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Key" required>
            <UInput
              v-model="key"
              :disabled="isEdit"
              placeholder="例如：preferredBmHint"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="标签" required>
            <UInput v-model="label" placeholder="显示名称" />
          </UFormField>
          <UFormField label="类型" required>
            <USelectMenu
              v-model="fieldType"
              :items="typeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UCheckbox v-model="required" label="必填" />
          <UFormField
            v-if="fieldType === 'select'"
            label="选项"
            hint="每行一条：value|label"
            required
          >
            <UTextarea v-model="optionsText" :rows="4" placeholder="opt_a|Option A" />
          </UFormField>
          <UFormField
            v-if="usage === 'ACCOUNT_MAP'"
            label="Source Key"
            hint="媒体侧字段名（仅配置，不拉取）"
          >
            <UInput v-model="sourceKey" class="font-mono" placeholder="例如：name" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="open = false" />
            <UButton
              :label="isEdit ? '保存' : '创建'"
              color="primary"
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
