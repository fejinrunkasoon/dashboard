<script setup lang="ts">
import type { ChannelAccountOrder, PlatformAsset } from '~/domain'
import { DEMAND_TIMEZONE_OPTIONS } from '~/domain'
import { demandService, mediaService, productService } from '~/services'

interface DeliveryRow {
  externalAccountId: string
  name: string
  timezone: string | undefined
  platformAssetId: string | undefined
  productId: string | undefined
  spendLimit: number | null
}

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  order: ChannelAccountOrder | null
}>()

const emit = defineEmits<{
  delivered: [payload: { orderId: string; accountIds: string[]; count: number }]
}>()

const toast = useToast()
const { member } = useCurrentUser()
const saving = ref(false)
const rows = ref<DeliveryRow[]>([])
const assets = ref<PlatformAsset[]>([])
const productOptions = ref<{ label: string; value: string }[]>([])
const defaultProductId = ref<string | undefined>()

const remaining = computed(() => {
  if (!props.order) return 0
  return Math.max(0, props.order.requestedQuantity - props.order.deliveredQuantity)
})

/** No empty-string option: Reka/USelectMenu treats "" as "no value" and blocks opening. */
const assetOptions = computed(() =>
  assets.value.map(item => ({
    label: `${item.name ?? item.externalId} (${item.externalId})`,
    value: item.id
  }))
)

const timezoneOptions = DEMAND_TIMEZONE_OPTIONS

const overflowCount = computed(() => Math.max(0, rows.value.length - remaining.value))

const canSubmit = computed(() => {
  if (!props.order || !rows.value.length) return false
  return rows.value.every(row => row.externalAccountId.trim().length > 0)
})

function emptyRow(): DeliveryRow {
  return {
    externalAccountId: '',
    name: '',
    timezone: props.order?.timezone ?? undefined,
    platformAssetId: undefined,
    productId: defaultProductId.value,
    spendLimit: null
  }
}

async function loadAssets() {
  if (!props.order) {
    assets.value = []
    return
  }
  assets.value = await mediaService.getPlatformAssets({
    channelIds: [props.order.channelId],
    mediaIds: [props.order.mediaId]
  })
}

async function loadProducts() {
  const products = await productService.getProducts()
  productOptions.value = products.map(item => ({
    label: `${item.name} · ${item.ownershipType === 'EXTERNAL' ? '外接' : '自家'}`,
    value: item.id
  }))
  defaultProductId.value = undefined
  if (!props.order?.relatedDemandItemId) return
  const page = await demandService.getDemands({ page: 1, pageSize: 200 })
  for (const d of page.data) {
    const items = await demandService.getDemandItems(d.id)
    const hit = items.find(item => item.id === props.order!.relatedDemandItemId)
    if (hit?.productId) {
      defaultProductId.value = hit.productId
      break
    }
  }
}

watch(
  () => [open.value, props.order?.id] as const,
  async ([isOpen]) => {
    if (!isOpen || !props.order) return
    await Promise.all([loadAssets(), loadProducts()])
    rows.value = [emptyRow()]
  }
)

function addRow() {
  rows.value.push(emptyRow())
}

function removeRow(index: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(index, 1)
}

async function submit() {
  if (!canSubmit.value || saving.value || !props.order) return
  saving.value = true
  try {
    const result = await demandService.confirmChannelAccountDelivery({
      orderId: props.order.id,
      actorMemberId: member.value?.id ?? null,
      accounts: rows.value.map(row => ({
        externalAccountId: row.externalAccountId.trim(),
        name: row.name.trim() || null,
        timezone: row.timezone?.trim() || null,
        platformAssetId: row.platformAssetId || null,
        productId: row.productId || null,
        spendLimit: row.spendLimit != null && row.spendLimit > 0 ? row.spendLimit : null
      }))
    })
    open.value = false
    emit('delivered', {
      orderId: result.order.id,
      accountIds: result.accountIds,
      count: result.accountIds.length
    })
  } catch (error) {
    toast.add({
      title: '交付确认失败',
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
            <UIcon name="i-lucide-package-check" class="size-5 text-primary" />
            <div>
              <p class="font-semibold text-highlighted">
                确认交付入库
              </p>
              <p v-if="order" class="text-xs text-muted">
                {{ order.orderNo }} · 本单还可计入 {{ remaining }} 户。超出部分仍以 AVAILABLE 入池，不计入本 Demand。
              </p>
              <p v-if="member" class="text-[11px] text-muted mt-0.5">
                户管将记为操作人：{{ member.name }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div
            v-for="(row, index) in rows"
            :key="index"
            class="rounded-md border border-default p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-highlighted">
                账户 {{ index + 1 }}
              </p>
              <UButton
                v-if="rows.length > 1"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="removeRow(index)"
              />
            </div>
            <UFormField label="External Account ID" required>
              <UInput
                v-model="row.externalAccountId"
                placeholder="如 act_123456"
                class="font-mono"
              />
            </UFormField>
            <UFormField label="Name">
              <UInput v-model="row.name" placeholder="可选名称" />
            </UFormField>
            <UFormField label="Timezone">
              <USelectMenu
                v-model="row.timezone"
                :items="timezoneOptions"
                value-key="value"
                label-key="label"
                placeholder="默认用订单时区"
                :clear="true"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Product" description="默认来自 Demand，可改">
              <USelectMenu
                v-model="row.productId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
                :clear="true"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Spend Limit" description="账户最高额度，空=不限（仍受渠道共享池约束）">
              <UInput
                v-model.number="row.spendLimit"
                type="number"
                :min="0"
                step="100"
                placeholder="可选"
              />
            </UFormField>
            <UFormField label="Platform Asset">
              <USelectMenu
                v-model="row.platformAssetId"
                :items="assetOptions"
                value-key="value"
                label-key="label"
                placeholder="可选绑定"
                :clear="true"
                class="w-full"
              />
              <p v-if="!assetOptions.length" class="mt-1 text-xs text-muted">
                当前渠道 + 媒体下暂无 Platform Asset，可在设置中创建后绑定。
              </p>
            </UFormField>
          </div>

          <p v-if="overflowCount > 0" class="text-xs text-warning">
            其中 {{ overflowCount }} 户超出申请量，入库后不计入 deliveredQuantity。
          </p>

          <UButton
            label="再加一户"
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="sm"
            @click="addRow"
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
              label="确认入库"
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
