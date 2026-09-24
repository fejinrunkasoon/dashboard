<script setup lang="ts">
import type { Channel, MediaPlatform, PlatformAsset, PlatformAssetType } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  asset?: PlatformAsset | null
  mediaPlatforms: MediaPlatform[]
  assetTypes: PlatformAssetType[]
  channels: Channel[]
}>()

const emit = defineEmits<{
  save: [payload: {
    mediaId: string
    typeId: string
    externalId: string
    name?: string | null
    sourceChannelId?: string | null
    note?: string | null
  }]
}>()

const saving = ref(false)
const mediaId = ref<string | undefined>(undefined)
const typeId = ref<string | undefined>(undefined)
const externalId = ref('')
const name = ref('')
const sourceChannelId = ref<string | undefined>(undefined)
const note = ref('')

const isEdit = computed(() => Boolean(props.asset))

const mediaItems = computed(() =>
  props.mediaPlatforms
    .filter(m => m.status === 'ACTIVE' || m.id === props.asset?.mediaId)
    .map(m => ({ label: `${m.name} (${m.code})`, value: m.id }))
)

const typeItems = computed(() => {
  if (!mediaId.value) return []
  return props.assetTypes
    .filter(t =>
      t.mediaId === mediaId.value
      && (t.status === 'ACTIVE' || t.id === props.asset?.typeId)
    )
    .map(t => ({ label: `${t.name} (${t.code})`, value: t.id }))
})

const channelItems = computed(() => [
  { label: '不关联渠道', value: '' },
  ...props.channels
    .filter(c => c.status === 'ACTIVE' || c.id === props.asset?.sourceChannelId)
    .map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))
])

watch(
  () => [open.value, props.asset] as const,
  ([isOpen, asset]) => {
    if (!isOpen) return
    if (asset) {
      mediaId.value = asset.mediaId
      typeId.value = asset.typeId
      externalId.value = asset.externalId
      name.value = asset.name ?? ''
      sourceChannelId.value = asset.sourceChannelId ?? ''
      note.value = asset.note ?? ''
    } else {
      mediaId.value = props.mediaPlatforms.find(m => m.status === 'ACTIVE')?.id
      typeId.value = undefined
      externalId.value = ''
      name.value = ''
      sourceChannelId.value = ''
      note.value = ''
    }
  }
)

watch(mediaId, (next, prev) => {
  if (!open.value || isEdit.value) return
  if (next !== prev) typeId.value = undefined
})

const canSubmit = computed(() => {
  if (!mediaId.value || !typeId.value) return false
  if (!isEdit.value && !externalId.value.trim()) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value || saving.value || !mediaId.value || !typeId.value) return
  saving.value = true
  try {
    emit('save', {
      mediaId: mediaId.value,
      typeId: typeId.value,
      externalId: externalId.value.trim(),
      name: name.value.trim() || null,
      sourceChannelId: sourceChannelId.value || null,
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
              {{ isEdit ? '编辑媒体资产' : '登记媒体资产' }}
            </span>
            <p class="text-xs text-muted">
              登记 BM / MCC / BC / Org 等实例。媒体、类型与 External ID 创建后不可改。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="媒体" required>
            <USelect
              v-model="mediaId"
              :items="mediaItems"
              :disabled="isEdit"
              placeholder="选择媒体"
              class="w-full"
            />
          </UFormField>
          <UFormField label="资产类型" required>
            <USelect
              v-model="typeId"
              :items="typeItems"
              :disabled="isEdit || !mediaId"
              placeholder="选择类型"
              class="w-full"
            />
          </UFormField>
          <UFormField label="External ID" required>
            <UInput
              v-model="externalId"
              :disabled="isEdit"
              placeholder="平台侧 ID"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称">
            <UInput v-model="name" placeholder="可选显示名" />
          </UFormField>
          <UFormField label="来源渠道">
            <USelect
              v-model="sourceChannelId"
              :items="channelItems"
              placeholder="可选"
              class="w-full"
            />
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
