<script setup lang="ts">
import type { Channel, MediaPlatform } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  channel?: Channel | null
  mediaPlatforms: MediaPlatform[]
}>()

const emit = defineEmits<{
  save: [payload: {
    code: string
    name: string
    supportedMediaIds: string[]
    contactName?: string | null
    telegramReference?: string | null
    note?: string | null
  }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const supportedMediaIds = ref<string[]>([])
const contactName = ref('')
const telegramReference = ref('')
const note = ref('')

const isEdit = computed(() => Boolean(props.channel))

const mediaItems = computed(() =>
  props.mediaPlatforms
    .filter(m => m.status === 'ACTIVE' || props.channel?.supportedMediaIds.includes(m.id))
    .map(m => ({ label: `${m.name} (${m.code})`, value: m.id }))
)

watch(
  () => [open.value, props.channel] as const,
  ([isOpen, channel]) => {
    if (!isOpen) return
    if (channel) {
      code.value = channel.code
      name.value = channel.name
      supportedMediaIds.value = [...channel.supportedMediaIds]
      contactName.value = channel.contactName ?? ''
      telegramReference.value = channel.telegramReference ?? ''
      note.value = channel.note ?? ''
    } else {
      code.value = ''
      name.value = ''
      supportedMediaIds.value = []
      contactName.value = ''
      telegramReference.value = ''
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
      supportedMediaIds: [...supportedMediaIds.value],
      contactName: contactName.value.trim() || null,
      telegramReference: telegramReference.value.trim() || null,
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
              {{ isEdit ? '编辑渠道' : '新增渠道' }}
            </span>
            <p class="text-xs text-muted">
              编制主数据。订单、财务与用量请在渠道中心查看。code 创建后不可改。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="编码" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：DELTA"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="渠道名称" />
          </UFormField>
          <UFormField label="支持媒体">
            <USelectMenu
              v-model="supportedMediaIds"
              :items="mediaItems"
              multiple
              value-key="value"
              placeholder="选择媒体平台"
              class="w-full"
            />
          </UFormField>
          <UFormField label="联系人">
            <UInput v-model="contactName" placeholder="可选" />
          </UFormField>
          <UFormField label="Telegram">
            <UInput v-model="telegramReference" placeholder="例如：@ops_channel" class="font-mono" />
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
