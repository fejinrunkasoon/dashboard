<script setup lang="ts">
import type { ChannelAccountOrder, ChannelOrderRejectReason, MockTelegramInquiry } from '~/domain'
import { CHANNEL_ORDER_REJECT_REASON_OPTIONS } from '~/domain'
import { demandService } from '~/services'

const props = defineProps<{
  order: ChannelAccountOrder
  mediaName?: string
}>()

const emit = defineEmits<{
  updated: [order: ChannelAccountOrder]
}>()

const toast = useToast()
const loading = ref(false)
const showReject = ref(false)
const rejectReason = ref<ChannelOrderRejectReason | null>(null)
const inquiry = ref<MockTelegramInquiry | null>(null)

const rejectItems = CHANNEL_ORDER_REJECT_REASON_OPTIONS.map(item => ({
  label: item.label,
  value: item.value
}))

async function loadInquiry() {
  inquiry.value = await demandService.getMockInquiry(props.order.id)
}

watch(
  () => [props.order.id, props.order.status, props.order.inquiryMessageId] as const,
  () => {
    void loadInquiry()
  },
  { immediate: true }
)

const buttonLocked = computed(() => {
  const state = inquiry.value?.buttonState
  return state === 'ACCEPTED' || state === 'REJECTED' || state === 'TIMEOUT'
})

const acceptedLabel = computed(() => {
  if (!props.order.acceptedAt) return '已接单'
  const t = props.order.acceptedAt.slice(11, 16)
  return `已接单 · ${t}`
})

async function run(
  action: () => Promise<ChannelAccountOrder>,
  okTitle: string
) {
  if (loading.value) return
  loading.value = true
  try {
    const order = await action()
    toast.add({
      title: okTitle,
      description: `${order.orderNo} → ${order.status}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    emit('updated', order)
    await loadInquiry()
  } catch (error) {
    toast.add({
      title: '操作失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}

function onAccept() {
  void run(
    () => demandService.acceptMockInquiry(props.order.id),
    '已确认接单'
  )
}

function onTimeout() {
  void run(
    () => demandService.timeoutMockInquiry(props.order.id),
    '询单已超时'
  )
}

function openReject() {
  rejectReason.value = null
  showReject.value = true
}

async function confirmReject() {
  if (!rejectReason.value) {
    toast.add({
      title: '请选择拒绝原因',
      color: 'warning',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  showReject.value = false
  await run(
    () => demandService.rejectMockInquiry(props.order.id, rejectReason.value!),
    '已拒绝接单'
  )
}
</script>

<template>
  <div class="rounded-md border border-default bg-elevated/40 p-3 space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-xs font-medium text-highlighted">
          模拟询单卡片
        </p>
        <p class="text-[11px] text-muted mt-0.5">
          Message {{ order.inquiryMessageId || '—' }} · 无真实 Bot
        </p>
      </div>
      <UBadge
        v-if="inquiry"
        :label="inquiry.buttonState"
        size="xs"
        variant="subtle"
      />
    </div>

    <div class="text-xs space-y-1 text-muted">
      <p>
        <span class="text-highlighted">订单：</span>{{ order.orderNo }}
      </p>
      <p>
        <span class="text-highlighted">平台：</span>{{ mediaName || order.mediaId }}
      </p>
      <p>
        <span class="text-highlighted">数量：</span>{{ order.requestedQuantity }}
      </p>
      <p>
        <span class="text-highlighted">时区：</span>{{ order.timezone || '—' }}
      </p>
      <p v-if="order.rejectReason">
        <span class="text-highlighted">拒因：</span>{{ order.rejectReason }}
      </p>
    </div>

    <div v-if="order.status === 'PENDING_CONFIRM' && !buttonLocked" class="flex flex-wrap gap-1.5">
      <UButton
        label="确认接单"
        size="xs"
        color="primary"
        :loading="loading"
        @click="onAccept"
      />
      <UButton
        label="拒绝接单"
        size="xs"
        color="neutral"
        variant="soft"
        :disabled="loading"
        @click="openReject"
      />
      <UButton
        label="模拟超时"
        size="xs"
        color="warning"
        variant="ghost"
        :disabled="loading"
        @click="onTimeout"
      />
    </div>
    <div v-else-if="inquiry?.buttonState === 'ACCEPTED'" class="text-xs text-success">
      ✅ {{ acceptedLabel }}
    </div>
    <div v-else-if="inquiry?.buttonState === 'REJECTED'" class="text-xs text-error">
      已拒绝接单
    </div>
    <div v-else-if="inquiry?.buttonState === 'TIMEOUT'" class="text-xs text-warning">
      询单超时（TIMEOUT）
    </div>
  </div>

  <UModal v-model:open="showReject">
    <template #content>
      <UCard>
        <template #header>
          <p class="font-semibold text-highlighted">
            选择拒绝原因
          </p>
        </template>
        <UFormField label="原因" required>
          <USelectMenu
            v-model="rejectReason"
            :items="rejectItems"
            value-key="value"
            label-key="label"
            placeholder="请选择"
          />
        </UFormField>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="取消"
              color="neutral"
              variant="ghost"
              @click="showReject = false"
            />
            <UButton
              label="确认拒绝"
              color="error"
              :loading="loading"
              @click="confirmReject"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
