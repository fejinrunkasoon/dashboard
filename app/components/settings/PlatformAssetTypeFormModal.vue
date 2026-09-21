<script setup lang="ts">
import type { MediaPlatform, PlatformAssetType } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  platform: MediaPlatform | null
  assetType?: PlatformAssetType | null
}>()

const emit = defineEmits<{
  save: [payload: { mediaId: string, code: string, name: string }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')

const isEdit = computed(() => Boolean(props.assetType))

watch(
  () => [open.value, props.assetType, props.platform] as const,
  ([isOpen, assetType]) => {
    if (!isOpen) return
    if (assetType) {
      code.value = assetType.code
      name.value = assetType.name
    } else {
      code.value = ''
      name.value = ''
    }
  }
)

const canSubmit = computed(() => {
  if (!props.platform) return false
  if (!name.value.trim()) return false
  if (!isEdit.value && !code.value.trim()) return false
  return true
})

function onSubmit() {
  if (!canSubmit.value || !props.platform || saving.value) return
  saving.value = true
  try {
    emit('save', {
      mediaId: props.platform.id,
      code: code.value.trim(),
      name: name.value.trim()
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
              {{ isEdit ? '编辑 Asset Type' : '新增 Asset Type' }}
            </span>
            <p class="text-xs text-muted">
              归属媒体：{{ platform?.name ?? '—' }}。code 与 mediaId 创建后不可改。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Code" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：AD_ACCOUNT_GROUP"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="例如：Ad Account Group" />
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
