<script setup lang="ts">
import type { MediaPlatform } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  platform?: MediaPlatform | null
}>()

const emit = defineEmits<{
  save: [payload: { code: string, name: string, logoUrl?: string | null }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const logoUrl = ref('')

const isEdit = computed(() => Boolean(props.platform))

watch(
  () => [open.value, props.platform] as const,
  ([isOpen, platform]) => {
    if (!isOpen) return
    if (platform) {
      code.value = platform.code
      name.value = platform.name
      logoUrl.value = platform.logoUrl ?? ''
    } else {
      code.value = ''
      name.value = ''
      logoUrl.value = ''
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
      logoUrl: logoUrl.value.trim() || null
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
              {{ isEdit ? '编辑媒体平台' : '新增媒体平台' }}
            </span>
            <p class="text-xs text-muted">
              code 创建后不可改。不接真实 Media API；logoUrl 为可选字符串。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="编码" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：X_ADS"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="例如：X Ads" />
          </UFormField>
          <UFormField label="Logo 地址">
            <UInput v-model="logoUrl" placeholder="可选 https://…" />
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
