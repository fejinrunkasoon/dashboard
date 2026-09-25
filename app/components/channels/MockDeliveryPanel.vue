<script setup lang="ts">
import type {
  ChannelAccountOrder,
  DeliveryParseDraft,
  DeliveryValidationResult
} from '~/domain'
import { MOCK_DELIVERY_REPLY_SAMPLE } from '~/domain'
import { demandService } from '~/services'

const props = defineProps<{
  order: ChannelAccountOrder
}>()

const emit = defineEmits<{
  updated: [order: ChannelAccountOrder]
  delivered: [payload: { orderId: string; accountIds: string[]; count: number }]
}>()

const toast = useToast()
const { member } = useCurrentUser()
const loading = ref(false)
const confirming = ref(false)
const rawText = ref('')
const draft = ref<DeliveryParseDraft | null>(null)
const validation = ref<DeliveryValidationResult | null>(null)

const remaining = computed(() =>
  Math.max(0, props.order.requestedQuantity - props.order.deliveredQuantity)
)

const canReply = computed(() => {
  const s = props.order.status
  return s === 'PROCESSING'
    || s === 'PARTIAL_DELIVERED'
    || s === 'PARSING_EXCEPTION'
    || s === 'QUANTITY_EXCEPTION'
})

const canConfirmDraft = computed(() =>
  Boolean(draft.value && validation.value?.ok && canReply.value)
)

async function loadDraft() {
  draft.value = await demandService.getDeliveryDraft(props.order.id)
  if (draft.value) {
    rawText.value = draft.value.rawText
    // Re-validate silently for display (draft may predate status change)
    validation.value = null
  }
}

watch(
  () => [props.order.id, props.order.status] as const,
  () => {
    void loadDraft()
  },
  { immediate: true }
)

function fillSample() {
  const sample = MOCK_DELIVERY_REPLY_SAMPLE
    .replace(/下户ID：827/, `下户ID：${props.order.externalOrderNo}`)
    .replace(/账户数：7/, `账户数：${props.order.requestedQuantity}`)
    .replace(
      /已下户：4/,
      `已下户：${Math.min(4, Math.max(1, remaining.value))}`
    )
  // Keep only as many account lines as remaining (or 1) for a clean happy path
  const lines = sample.split('\n')
  const keep = Math.min(4, Math.max(1, remaining.value))
  const head = lines.slice(0, 6)
  const accounts = [
    'Alpha Ads (act_sim_100001)',
    'Beta Ads (act_sim_100002)',
    'Gamma Ads (act_sim_100003)',
    'Delta Ads (act_sim_100004)'
  ].slice(0, keep)
  rawText.value = [
    ...head.slice(0, 5),
    `已下户：${keep}`,
    '',
    ...accounts,
    '',
    'BM：',
    '123456',
    '555000111'
  ].join('\n')
}

function fillMismatchSample() {
  rawText.value = `开户申请 - 部分完成
下户ID：${props.order.externalOrderNo}
平台：Facebook
账户数：7
已下户：7

OnlyOne (act_sim_mismatch_1)

BM：
bm_x`
}

async function submitReply() {
  if (loading.value || !rawText.value.trim()) return
  loading.value = true
  try {
    const result = await demandService.submitMockDeliveryReply(
      props.order.id,
      rawText.value,
      props.order.inquiryMessageId
    )
    draft.value = result.draft
    validation.value = result.validation
    emit('updated', result.order)
    if (result.validation.ok) {
      toast.add({
        title: '回复已解析',
        description: `草稿 ${result.draft?.accountIds.length ?? 0} 户 · 置信度 ${Math.round((result.draft?.confidence ?? 0) * 100)}%`,
        icon: 'i-lucide-check',
        color: 'success'
      })
    } else {
      toast.add({
        title: result.order.status,
        description: result.validation.errors.map(e => e.message).join('；'),
        color: 'warning',
        icon: 'i-lucide-alert-triangle'
      })
    }
  } catch (error) {
    toast.add({
      title: '回复提交失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}

async function confirmDraft() {
  if (!canConfirmDraft.value || confirming.value) return
  confirming.value = true
  try {
    const result = await demandService.confirmDeliveryFromDraft(
      props.order.id,
      member.value?.id ?? null
    )
    draft.value = null
    validation.value = null
    emit('updated', result.order)
    emit('delivered', {
      orderId: result.order.id,
      accountIds: result.accountIds,
      count: result.accountIds.length
    })
  } catch (error) {
    toast.add({
      title: '确认入库失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div class="rounded-md border border-default bg-elevated/40 p-3 space-y-3">
    <div class="flex items-start justify-between gap-2 flex-wrap">
      <div>
        <p class="text-xs font-medium text-highlighted">
          模拟 Reply 交付
        </p>
        <p class="text-[11px] text-muted mt-0.5">
          必须 Reply 原询单 {{ order.inquiryMessageId || '—' }} · 剩余 {{ remaining }} 户 · AI 只出草稿
        </p>
      </div>
      <div class="flex gap-1">
        <UButton
          label="填入样例"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="!canReply"
          @click="fillSample"
        />
        <UButton
          label="数量不符样例"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="!canReply"
          @click="fillMismatchSample"
        />
      </div>
    </div>

    <UTextarea
      v-model="rawText"
      :rows="8"
      :disabled="!canReply"
      class="font-mono text-xs"
      placeholder="供应商回复原文…"
    />

    <div class="flex flex-wrap gap-1.5">
      <UButton
        label="提交回复 → 解析"
        size="xs"
        color="primary"
        variant="soft"
        :loading="loading"
        :disabled="!canReply || !rawText.trim()"
        @click="submitReply"
      />
      <UButton
        label="人工确认入库"
        size="xs"
        color="primary"
        :loading="confirming"
        :disabled="!canConfirmDraft"
        @click="confirmDraft"
      />
    </div>

    <div v-if="draft" class="space-y-2 text-xs">
      <p class="font-medium text-highlighted">
        Parser 草稿 · 置信度 {{ Math.round(draft.confidence * 100) }}%
      </p>
      <p class="text-muted">
        下户ID：{{ draft.externalOrderNo || '—' }}
        · 声称：{{ draft.claimedQuantity ?? '—' }}
        · 解析：{{ draft.accountIds.length }}
        · BM：{{ draft.bmIds.length }}
      </p>
      <ul class="list-disc pl-4 space-y-0.5 font-mono">
        <li v-for="(row, i) in draft.accountIds" :key="i">
          {{ row.externalAccountId }}
          <span v-if="row.name" class="text-muted"> · {{ row.name }}</span>
        </li>
      </ul>
    </div>

    <div v-if="validation" class="space-y-1 text-xs">
      <p v-if="validation.ok" class="text-success">
        Validator 通过{{ validation.warnings.length ? '（含警告）' : '' }}
      </p>
      <p v-else class="text-error">
        Validator 未通过 → {{ validation.exceptionStatus }}
      </p>
      <p
        v-for="(issue, i) in validation.errors"
        :key="`e-${i}`"
        class="text-error"
      >
        · {{ issue.message }}
      </p>
      <p
        v-for="(issue, i) in validation.warnings"
        :key="`w-${i}`"
        class="text-warning"
      >
        · {{ issue.message }}
      </p>
    </div>
  </div>
</template>
