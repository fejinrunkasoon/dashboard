<script setup lang="ts">
import type { ChannelAccountOrder } from '~/domain'
import { DEMAND_TIMEZONE_OPTIONS } from '~/domain'
import type { CreateChannelAccountOrderInput, SchedulingDemandItemRow } from '~/services'
import { channelService, demandService, mediaService } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** Prefill from scheduling Shortage row */
  shortageRow?: SchedulingDemandItemRow | null
  /** When creating from channel detail (no demand) */
  lockedChannelId?: string | null
  defaultMediaId?: string | null
}>()

const emit = defineEmits<{
  created: [order: ChannelAccountOrder]
}>()

const toast = useToast()
const saving = ref(false)

const channels = await channelService.getChannels()
const mediaPlatforms = ref(await mediaService.getMediaPlatforms({ status: 'ACTIVE' }))
const mediaNameMap = ref(
  Object.fromEntries(
    (await mediaService.getMediaPlatforms()).map(item => [item.id, item.name])
  ) as Record<string, string>
)

interface DemandItemOption {
  label: string
  value: string
  mediaId: string
  timezone: string | null
  /** Remaining demand qty (requested − allocated), used to prefill Quantity. */
  quantity: number
}

const channelId = ref<string | undefined>()
const mediaId = ref<string | undefined>()
const quantity = ref(1)
const timezone = ref<string | undefined>()
const timezoneOptions = DEMAND_TIMEZONE_OPTIONS
const externalOrderNo = ref('')
const demandItemId = ref<string | undefined>()
const asDraft = ref(false)
const demandItemOptions = ref<DemandItemOption[]>([])

const mediaName = (id: string) => mediaNameMap.value[id] ?? id

const selectedDemandOption = computed(() =>
  demandItemOptions.value.find(item => item.value === demandItemId.value) ?? null
)

const quantityDescription = computed(() => {
  if (props.shortageRow) return `默认 Shortage，最多 ${props.shortageRow.shortage}`
  if (selectedDemandOption.value) {
    return `已按 Demand 剩余量填入 ${selectedDemandOption.value.quantity}，可按询价量调整`
  }
  return undefined
})

const channelOptions = computed(() => {
  const media = mediaId.value
  return channels
    .filter(item => item.status === 'ACTIVE')
    .filter(item => !media || item.supportedMediaIds.includes(media))
    .map(item => ({
      label: `${item.name} (${item.code})`,
      value: item.id
    }))
})

const mediaOptions = computed(() => {
  if (props.lockedChannelId) {
    const channel = channels.find(item => item.id === props.lockedChannelId)
    const allowed = new Set(channel?.supportedMediaIds ?? [])
    return mediaPlatforms.value
      .filter(item => allowed.has(item.id))
      .map(item => ({ label: item.name, value: item.id }))
  }
  return mediaPlatforms.value.map(item => ({ label: item.name, value: item.id }))
})

const isShortageMode = computed(() => Boolean(props.shortageRow))

const filteredDemandOptions = computed(() => {
  const media = mediaId.value
  return demandItemOptions.value.filter(item => !media || item.mediaId === media)
})

const canSubmit = computed(() => {
  if (!channelId.value || !mediaId.value) return false
  if (!externalOrderNo.value.trim()) return false
  if (!demandItemId.value) return false
  if (!Number.isFinite(quantity.value) || quantity.value < 1) return false
  if (isShortageMode.value && props.shortageRow) {
    if (quantity.value > props.shortageRow.shortage) return false
  }
  return true
})

async function reloadMediaOptions() {
  const [active, all] = await Promise.all([
    mediaService.getMediaPlatforms({ status: 'ACTIVE' }),
    mediaService.getMediaPlatforms()
  ])
  mediaPlatforms.value = active
  mediaNameMap.value = Object.fromEntries(all.map(item => [item.id, item.name]))
}

function itemTimezone(requirements: Record<string, unknown>): string | null {
  const tz = requirements?.timezone
  return typeof tz === 'string' && tz.trim() ? tz.trim() : null
}

/** Bind Media / Quantity / Timezone from the selected Demand Item (TG 询价约束). */
function applyDemandConstraints(id: string | undefined) {
  if (!id || isShortageMode.value) return
  const option = demandItemOptions.value.find(item => item.value === id)
  if (!option) return
  if (mediaId.value !== option.mediaId) mediaId.value = option.mediaId
  quantity.value = option.quantity
  timezone.value = option.timezone ?? undefined
}

async function loadDemandItems() {
  const [page, allocations] = await Promise.all([
    demandService.getDemands({
      statuses: ['SUBMITTED', 'APPROVED', 'PARTIALLY_ALLOCATED'],
      page: 1,
      pageSize: 200
    }),
    demandService.getDemandAllocations()
  ])
  const allocatedByItem = new Map<string, number>()
  for (const row of allocations) {
    allocatedByItem.set(row.demandItemId, (allocatedByItem.get(row.demandItemId) ?? 0) + 1)
  }

  const options: DemandItemOption[] = []
  for (const demand of page.data) {
    const items = await demandService.getDemandItems(demand.id)
    for (const item of items) {
      const allocated = allocatedByItem.get(item.id) ?? 0
      const remaining = Math.max(0, item.requestedQuantity - allocated)
      options.push({
        label: `${demand.demandNo} · ${mediaName(item.mediaId)} · ${item.id}`,
        value: item.id,
        mediaId: item.mediaId,
        timezone: itemTimezone(item.requirements),
        quantity: Math.max(1, remaining || item.requestedQuantity)
      })
    }
  }
  demandItemOptions.value = options
  applyDemandConstraints(demandItemId.value)
}

function resetFromProps() {
  asDraft.value = false
  externalOrderNo.value = ''
  if (props.shortageRow) {
    mediaId.value = props.shortageRow.mediaId
    quantity.value = Math.max(1, props.shortageRow.shortage)
    timezone.value = props.shortageRow.timezone ?? undefined
    demandItemId.value = props.shortageRow.itemId
    channelId.value = channelOptions.value[0]?.value
    return
  }
  channelId.value = props.lockedChannelId ?? undefined
  mediaId.value = props.defaultMediaId ?? mediaOptions.value[0]?.value
  quantity.value = 1
  timezone.value = undefined
  demandItemId.value = undefined
}

watch(
  () => [open.value, props.shortageRow?.itemId, props.lockedChannelId] as const,
  async ([isOpen]) => {
    if (!isOpen) return
    await reloadMediaOptions()
    resetFromProps()
    void loadDemandItems()
  }
)

watch(demandItemId, id => applyDemandConstraints(id))

watch(mediaId, () => {
  if (!props.lockedChannelId) {
    if (!channelId.value) {
      channelId.value = channelOptions.value[0]?.value
    } else if (!channelOptions.value.some(item => item.value === channelId.value)) {
      channelId.value = channelOptions.value[0]?.value
    }
  }
  if (
    demandItemId.value
    && !isShortageMode.value
    && !filteredDemandOptions.value.some(item => item.value === demandItemId.value)
  ) {
    demandItemId.value = undefined
  }
})

async function submit() {
  if (!canSubmit.value || saving.value || !channelId.value || !mediaId.value || !demandItemId.value) return
  saving.value = true
  try {
    const requirements: Record<string, unknown> = {}
    if (timezone.value?.trim()) requirements.timezone = timezone.value.trim()

    const input: CreateChannelAccountOrderInput = {
      channelId: channelId.value,
      mediaId: mediaId.value,
      requestedQuantity: Math.floor(quantity.value),
      timezone: timezone.value?.trim() || null,
      requirements,
      externalOrderNo: externalOrderNo.value.trim(),
      relatedDemandItemId: demandItemId.value,
      asDraft: asDraft.value
    }
    const order = await demandService.createChannelAccountOrder(input)
    open.value = false
    emit('created', order)
  } catch (error) {
    toast.add({
      title: '建单失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
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
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-truck" class="size-5 text-primary" />
            <div>
              <p class="font-semibold text-highlighted">
                创建 Channel Order
              </p>
              <p class="text-xs text-muted">
                池不足后补库。入库后仍需回到调度 Allocate，不会自动分配。
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div
            v-if="shortageRow"
            class="rounded-md border border-default bg-elevated/50 px-3 py-2 text-xs text-muted space-y-1"
          >
            <p>
              Demand
              <span class="text-highlighted font-medium">{{ shortageRow.demandNo }}</span>
              · Shortage {{ shortageRow.shortage }}
            </p>
            <p>
              {{ mediaName(shortageRow.mediaId) }}
              · {{ shortageRow.timezone ?? '任意时区' }}
            </p>
          </div>

          <UFormField label="Channel" required>
            <USelectMenu
              v-model="channelId"
              :items="channelOptions"
              value-key="value"
              label-key="label"
              placeholder="选择支持该媒体的渠道"
              :disabled="Boolean(lockedChannelId)"
            />
          </UFormField>

          <UFormField label="Media" required>
            <USelectMenu
              v-model="mediaId"
              :items="mediaOptions"
              value-key="value"
              label-key="label"
              placeholder="选择媒体"
              :disabled="isShortageMode"
            />
          </UFormField>

          <UFormField label="外部单号" required description="渠道侧单号，必填">
            <UInput
              v-model="externalOrderNo"
              placeholder="如 TG-827"
              class="font-mono"
            />
          </UFormField>

          <UFormField label="关联 Demand Item" required description="无 Demand 不能建单">
            <USelectMenu
              v-model="demandItemId"
              :items="filteredDemandOptions"
              value-key="value"
              label-key="label"
              placeholder="选择未完成需求明细"
              :disabled="isShortageMode"
            />
          </UFormField>

          <UFormField
            label="Quantity"
            required
            :description="quantityDescription"
          >
            <UInput
              v-model.number="quantity"
              type="number"
              :min="1"
              :max="shortageRow?.shortage"
              step="1"
            />
          </UFormField>

          <UFormField
            label="Timezone"
            :description="selectedDemandOption?.timezone
              ? `来自 Demand：${selectedDemandOption.timezone}`
              : undefined"
          >
            <USelectMenu
              v-model="timezone"
              :items="timezoneOptions"
              value-key="value"
              label-key="label"
              placeholder="选择 Timezone"
              :clear="true"
              :disabled="isShortageMode || Boolean(selectedDemandOption?.timezone)"
            />
          </UFormField>

          <UCheckbox
            v-model="asDraft"
            label="保存为草稿（DRAFT）"
          />
        </div>

        <template #footer>
          <div class="flex items-center gap-2 justify-end">
            <UButton
              label="取消"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="open = false"
            />
            <UButton
              :label="asDraft ? '保存草稿' : '创建订单'"
              color="primary"
              icon="i-lucide-check"
              :loading="saving"
              :disabled="!canSubmit"
              @click="submit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
