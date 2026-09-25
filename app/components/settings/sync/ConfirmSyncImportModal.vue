<script setup lang="ts">
import type { Channel, PlatformAsset } from '~/domain'
import { channelService, mediaService } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  selectedCount: number
  mediaId: string | null
}>()

const emit = defineEmits<{
  confirm: [payload: { sourceChannelId: string | null, platformAssetId: string | null }]
}>()

const channels = ref<Channel[]>([])
const assets = ref<PlatformAsset[]>([])
const sourceChannelId = ref<string | undefined>(undefined)
const platformAssetId = ref<string | undefined>(undefined)
const loading = ref(false)

const channelItems = computed(() =>
  channels.value.map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))
)

/** No empty-string option: Reka/USelectMenu treats "" as "no value" and blocks opening. */
const assetItems = computed(() => {
  const filtered = props.mediaId
    ? assets.value.filter(a => a.mediaId === props.mediaId)
    : assets.value
  return filtered.map(a => ({ label: `${a.name ?? a.externalId} (${a.externalId})`, value: a.id }))
})

watch(open, async (value) => {
  if (!value) return
  sourceChannelId.value = undefined
  platformAssetId.value = undefined
  loading.value = true
  try {
    const [ch, pa] = await Promise.all([
      channelService.getChannels(),
      mediaService.getPlatformAssets()
    ])
    channels.value = ch
    assets.value = pa
  } finally {
    loading.value = false
  }
})

function onConfirm() {
  emit('confirm', {
    sourceChannelId: sourceChannelId.value || null,
    platformAssetId: platformAssetId.value || null
  })
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <span class="font-semibold">确认导入（{{ selectedCount }}）</span>
        </template>

        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            title="入库 ≠ 分配"
            description="确认后账户进入可用池，不会自动分配到需求 / 团队。"
          />

          <p v-if="loading" class="text-sm text-muted">加载选项…</p>
          <template v-else>
            <UFormField label="来源渠道（可选）">
              <USelectMenu
                v-model="sourceChannelId"
                :items="channelItems"
                value-key="value"
                placeholder="不指定"
                :clear="true"
                class="w-full"
              />
            </UFormField>
            <UFormField label="平台资产（可选）">
              <USelectMenu
                v-model="platformAssetId"
                :items="assetItems"
                value-key="value"
                placeholder="不指定"
                :clear="true"
                class="w-full"
              />
            </UFormField>
          </template>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="open = false" />
            <UButton
              label="确认导入"
              color="primary"
              :disabled="selectedCount < 1 || loading"
              @click="onConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
