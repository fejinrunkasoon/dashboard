<script setup lang="ts">
import type { MediaConnectorDefinition, MediaPlatform, PlatformAssetType } from '~/domain'
import type { ConnectorBindingListItem } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  binding?: ConnectorBindingListItem | null
  platforms: MediaPlatform[]
  definitions: MediaConnectorDefinition[]
  assetTypes: PlatformAssetType[]
}>()

const emit = defineEmits<{
  save: [payload: { mediaId: string, implKey: string, assetTypeIds: string[] }]
}>()

const saving = ref(false)
const mediaId = ref<string | undefined>()
const implKey = ref<string | undefined>()
const selectedTypeIds = ref<string[]>([])

const isEdit = computed(() => Boolean(props.binding))

const mediaOptions = computed(() =>
  props.platforms.map(item => ({ label: `${item.name} (${item.code})`, value: item.id }))
)

const implOptions = computed(() =>
  props.definitions.map(item => ({
    label: `${item.displayName}${item.capabilities.length ? '' : ' · 仅配置'}`,
    value: item.implKey
  }))
)

const typeOptions = computed(() => {
  if (!mediaId.value) return []
  return props.assetTypes
    .filter(item => item.mediaId === mediaId.value && item.status === 'ACTIVE')
    .map(item => ({ label: `${item.name} (${item.code})`, value: item.id }))
})

watch(
  () => [open.value, props.binding] as const,
  ([isOpen, binding]) => {
    if (!isOpen) return
    if (binding) {
      mediaId.value = binding.mediaId
      implKey.value = binding.implKey
      selectedTypeIds.value = [...binding.assetTypeIds]
    } else {
      mediaId.value = undefined
      implKey.value = undefined
      selectedTypeIds.value = []
    }
  }
)

watch(mediaId, (next, prev) => {
  if (!open.value || next === prev) return
  if (isEdit.value && props.binding?.mediaId === next) return
  selectedTypeIds.value = []
})

const canSubmit = computed(() => {
  if (!mediaId.value || !implKey.value) return false
  if (!selectedTypeIds.value.length) return false
  return true
})

function toggleType(id: string) {
  if (selectedTypeIds.value.includes(id)) {
    selectedTypeIds.value = selectedTypeIds.value.filter(item => item !== id)
  } else {
    selectedTypeIds.value = [...selectedTypeIds.value, id]
  }
}

function onSubmit() {
  if (!canSubmit.value || !mediaId.value || !implKey.value || saving.value) return
  saving.value = true
  try {
    emit('save', {
      mediaId: mediaId.value,
      implKey: implKey.value,
      assetTypeIds: [...selectedTypeIds.value]
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
              {{ isEdit ? '编辑 Connector 绑定' : '绑定 Connector' }}
            </span>
            <p class="text-xs text-muted">
              媒体须为 ACTIVE。无对应 impl 时请选 generic（仅配置，无发现能力）。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="媒体平台" required>
            <USelectMenu
              v-model="mediaId"
              :items="mediaOptions"
              value-key="value"
              :disabled="isEdit"
              placeholder="选择媒体"
              class="w-full"
            />
          </UFormField>
          <UFormField label="连接器实现" required>
            <USelectMenu
              v-model="implKey"
              :items="implOptions"
              value-key="value"
              placeholder="选择 implKey"
              class="w-full"
            />
          </UFormField>
          <UFormField label="资产类型" required>
            <div v-if="!mediaId" class="text-xs text-muted">请先选择媒体</div>
            <div v-else-if="!typeOptions.length" class="text-xs text-muted">
              该媒体下无 ACTIVE Asset Type，请先到数据字典创建。
            </div>
            <div v-else class="flex flex-col gap-2">
              <label
                v-for="opt in typeOptions"
                :key="opt.value"
                class="flex items-center gap-2 text-sm"
              >
                <UCheckbox
                  :model-value="selectedTypeIds.includes(opt.value)"
                  @update:model-value="toggleType(opt.value)"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="open = false" />
            <UButton
              :label="isEdit ? '保存' : '绑定'"
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
