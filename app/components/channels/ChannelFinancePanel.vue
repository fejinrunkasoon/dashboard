<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AccountMonthlySettlement,
  ChannelBalanceThreshold,
  ChannelMonthlySettlementSummary,
  ChannelOwnershipFundSummary,
  ChannelPaymentAddress,
  ChannelPrepayment,
  ChannelRefund,
  ProductOwnership,
  ServiceFeePolicy,
  ServiceFeeTier
} from '~/domain'
import { formatCurrency } from '~/utils'

const props = defineProps<{
  settlementYear: number
  settlementMonth: number
  settlementSummary: ChannelMonthlySettlementSummary | null
  settlementRows: AccountMonthlySettlement[]
  paymentAddresses: ChannelPaymentAddress[]
  prepayments: ChannelPrepayment[]
  refunds: ChannelRefund[]
  policies: ServiceFeePolicy[]
  tiersByPolicyId: Record<string, ServiceFeeTier[]>
  policyCodeById: Record<string, string>
  canPay: boolean
  fundSummaries: ChannelOwnershipFundSummary[]
  balanceThreshold: ChannelBalanceThreshold | null
}>()

const emit = defineEmits<{
  pay: []
  'add-address': []
  'edit-address': [ChannelPaymentAddress]
  'approve-address': [ChannelPaymentAddress]
  'reject-address': [ChannelPaymentAddress]
  'disable-address': [ChannelPaymentAddress]
  'add-policy': []
  'edit-policy': [ServiceFeePolicy]
  'disable-policy': [ServiceFeePolicy]
  'add-refund': []
  'confirm-refund': [ChannelRefund]
  'reject-refund': [ChannelRefund]
  'save-threshold': [Partial<ChannelBalanceThreshold>]
}>()

const draftAbs = ref<number | null>(null)
const draftDays = ref<number | null>(null)
const draftLookback = ref(7)
const draftMonitorInternal = ref(true)
const draftMonitorExternal = ref(false)
const draftSeverity = ref<'WARNING' | 'URGENT'>('WARNING')

watch(
  () => props.balanceThreshold,
  (t) => {
    if (!t) return
    draftAbs.value = t.absoluteBalanceBelow
    draftDays.value = t.daysOfRunwayBelow
    draftLookback.value = t.runwayLookbackDays
    draftMonitorInternal.value = t.enabledTags.includes('INTERNAL')
    draftMonitorExternal.value = t.enabledTags.includes('EXTERNAL')
    draftSeverity.value = t.severity
  },
  { immediate: true }
)

function saveThreshold() {
  const enabledTags: ProductOwnership[] = []
  if (draftMonitorInternal.value) enabledTags.push('INTERNAL')
  if (draftMonitorExternal.value) enabledTags.push('EXTERNAL')
  emit('save-threshold', {
    absoluteBalanceBelow: draftAbs.value != null && draftAbs.value >= 0 ? draftAbs.value : null,
    daysOfRunwayBelow: draftDays.value != null && draftDays.value >= 0 ? draftDays.value : null,
    runwayLookbackDays: Math.max(1, draftLookback.value || 7),
    enabledTags,
    severity: draftSeverity.value
  })
}

function fundFor(ownership: ProductOwnership) {
  return props.fundSummaries.find(item => item.ownership === ownership) ?? null
}

function maskAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function addressLabel(id: string): string {
  const row = props.paymentAddresses.find(item => item.id === id)
  if (!row) return id
  return `${row.label ?? row.type} · ${maskAddress(row.addressPayload)}`
}

function ownershipLabel(value: ProductOwnership): string {
  return value === 'INTERNAL' ? '自家' : '外接'
}

function tierLabel(tierId: string | null | undefined): string {
  if (!tierId) return '—'
  for (const tiers of Object.values(props.tiersByPolicyId)) {
    const tier = tiers.find(item => item.id === tierId)
    if (tier) {
      const max = tier.maxSpend == null ? '∞' : formatCurrency(tier.maxSpend)
      return `${formatCurrency(tier.minSpend)}–${max}`
    }
  }
  return tierId
}

const addressColumns: TableColumn<ChannelPaymentAddress>[] = [
  { accessorKey: 'type', header: 'Type' },
  { id: 'label', header: 'Label' },
  { id: 'payload', header: 'Address' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' }
]

const payColumns: TableColumn<ChannelPrepayment>[] = [
  { accessorKey: 'paymentNo', header: 'No' },
  { id: 'address', header: 'Address' },
  { id: 'ownership', header: '归属' },
  { id: 'amount', header: 'Amount' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: '录入' }
]

const refundColumns: TableColumn<ChannelRefund>[] = [
  { accessorKey: 'refundNo', header: 'No' },
  { id: 'amount', header: 'Amount' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'requestedAt', header: 'Requested' },
  { id: 'actions', header: '' }
]

const settlementColumns: TableColumn<AccountMonthlySettlement>[] = [
  { accessorKey: 'accountId', header: 'Account' },
  { id: 'policy', header: 'Policy' },
  { id: 'mediaSpend', header: 'Media Spend' },
  { id: 'tier', header: 'Tier' },
  { id: 'rate', header: 'Rate' },
  { id: 'fee', header: 'Service Fee' }
]

const policyColumns: TableColumn<ServiceFeePolicy>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'tiers', header: 'Tiers' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-3">
      <h3 class="text-sm font-medium text-highlighted">
        标签共享池（打款 − 退款分摊 − 结算消耗）
      </h3>
      <p class="text-xs text-muted">
        按自家/外接标签汇总渠道打款；账户按当前产品归属消耗对应池。有效可消耗 = min(账户额度剩余, 池剩余)。
      </p>
      <div class="grid sm:grid-cols-2 gap-3">
        <div
          v-for="tag in (['INTERNAL', 'EXTERNAL'] as const)"
          :key="tag"
          class="rounded-lg border border-default p-3 space-y-2"
        >
          <p class="text-xs font-medium text-highlighted">
            {{ ownershipLabel(tag) }}池
          </p>
          <template v-if="fundFor(tag)">
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p class="text-muted">打款</p>
                <p class="font-mono">{{ formatCurrency(fundFor(tag)!.prepaid) }}</p>
              </div>
              <div>
                <p class="text-muted">结算消耗</p>
                <p class="font-mono">{{ formatCurrency(fundFor(tag)!.settlementCost) }}</p>
              </div>
              <div>
                <p class="text-muted">退款分摊</p>
                <p class="font-mono">{{ formatCurrency(fundFor(tag)!.refunded) }}</p>
              </div>
              <div>
                <p class="text-muted">剩余可消耗</p>
                <p class="font-mono text-highlighted">{{ formatCurrency(fundFor(tag)!.remaining) }}</p>
              </div>
            </div>
            <p v-if="fundFor(tag)!.runwayDays != null" class="text-[11px] text-muted">
              预计可用约 {{ fundFor(tag)!.runwayDays!.toFixed(1) }} 天
            </p>
          </template>
          <p v-else class="text-xs text-muted">
            —
          </p>
        </div>
      </div>
    </section>

    <section class="space-y-3 rounded-lg border border-default p-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 class="text-sm font-medium text-highlighted">
            余额健康阈值
          </h3>
          <p class="text-xs text-muted">
            跌破金额或预计可用天数时生成 CHANNEL_BALANCE_LOW 预警
          </p>
        </div>
        <UButton
          label="保存阈值"
          size="xs"
          color="primary"
          @click="saveThreshold"
        />
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <UFormField label="金额阈值">
          <UInput v-model.number="draftAbs" type="number" :min="0" placeholder="如 1000" />
        </UFormField>
        <UFormField label="天数阈值">
          <UInput v-model.number="draftDays" type="number" :min="0" placeholder="如 5" />
        </UFormField>
        <UFormField label="日均回看天数">
          <UInput v-model.number="draftLookback" type="number" :min="1" />
        </UFormField>
        <UFormField label="严重级别">
          <USelect
            v-model="draftSeverity"
            :items="[
              { label: 'WARNING', value: 'WARNING' },
              { label: 'URGENT', value: 'URGENT' }
            ]"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="flex flex-wrap gap-4 text-sm">
        <UCheckbox v-model="draftMonitorInternal" label="监控自家池" />
        <UCheckbox v-model="draftMonitorExternal" label="监控外接池" />
      </div>
    </section>

    <USeparator />

    <section class="space-y-3">
      <h3 class="text-sm font-medium text-highlighted">
        月度结算（{{ settlementYear }}-{{ String(settlementMonth).padStart(2, '0') }}）
      </h3>
      <p class="text-xs text-muted">
        settlementCost = Media Spend + Service Fee。与账户「已花费」无关。
      </p>
      <div
        v-if="settlementSummary"
        class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
      >
        <div class="rounded-lg bg-elevated/50 p-3">
          <p class="text-xs text-muted">Accounts</p>
          <p class="font-medium">{{ settlementSummary.accountCount }}</p>
        </div>
        <div class="rounded-lg bg-elevated/50 p-3">
          <p class="text-xs text-muted">Media Spend</p>
          <p class="font-medium">{{ formatCurrency(settlementSummary.mediaSpend) }}</p>
        </div>
        <div class="rounded-lg bg-elevated/50 p-3">
          <p class="text-xs text-muted">Service Fee</p>
          <p class="font-medium">{{ formatCurrency(settlementSummary.serviceFee) }}</p>
        </div>
        <div class="rounded-lg bg-elevated/50 p-3">
          <p class="text-xs text-muted">Settlement Cost</p>
          <p class="font-medium">{{ formatCurrency(settlementSummary.settlementCost) }}</p>
        </div>
      </div>
      <p v-else class="text-sm text-muted">
        本月暂无结算数据
      </p>
      <UTable
        v-if="settlementRows.length"
        :data="settlementRows"
        :columns="settlementColumns"
      >
        <template #policy-cell="{ row }">
          {{ policyCodeById[row.original.serviceFeePolicyId] ?? row.original.serviceFeePolicyId }}
        </template>
        <template #mediaSpend-cell="{ row }">
          {{ formatCurrency(row.original.mediaSpend) }}
        </template>
        <template #tier-cell="{ row }">
          {{ tierLabel(row.original.matchedTierId) }}
        </template>
        <template #rate-cell="{ row }">
          {{ (row.original.appliedRate * 100).toFixed(2) }}%
        </template>
        <template #fee-cell="{ row }">
          {{ formatCurrency(row.original.serviceFee) }}
        </template>
      </UTable>
    </section>

    <USeparator />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-medium text-highlighted">服务费政策</h3>
          <p class="text-xs text-muted">NON_PROGRESSIVE_TIER；停用后不可再绑新账户</p>
        </div>
        <UButton
          label="新建政策"
          icon="i-lucide-plus"
          size="sm"
          color="primary"
          @click="emit('add-policy')"
        />
      </div>
      <UTable v-if="policies.length" :data="policies" :columns="policyColumns">
        <template #status-cell="{ row }">
          <UBadge :label="row.original.status" variant="subtle" size="xs" />
        </template>
        <template #tiers-cell="{ row }">
          <div class="space-y-0.5 text-xs font-mono">
            <p
              v-for="tier in (tiersByPolicyId[row.original.id] ?? [])"
              :key="tier.id"
            >
              {{ formatCurrency(tier.minSpend) }}–{{ tier.maxSpend == null ? '∞' : formatCurrency(tier.maxSpend) }}
              @ {{ (tier.rate * 100).toFixed(2) }}%
            </p>
          </div>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              v-if="row.original.status === 'ACTIVE'"
              label="编辑"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('edit-policy', row.original)"
            />
            <UButton
              v-if="row.original.status === 'ACTIVE'"
              label="停用"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('disable-policy', row.original)"
            />
          </div>
        </template>
      </UTable>
      <p v-else class="text-sm text-muted py-4 text-center">暂无服务费政策</p>
    </section>

    <USeparator />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-medium text-highlighted">打款地址</h3>
          <p class="text-xs text-muted">提交后待团队负责人审核；仅 ACTIVE 可用于登记打款</p>
        </div>
        <UButton
          label="新增地址"
          icon="i-lucide-plus"
          size="sm"
          color="primary"
          @click="emit('add-address')"
        />
      </div>
      <UTable :data="paymentAddresses" :columns="addressColumns">
        <template #label-cell="{ row }">
          {{ row.original.label ?? '—' }}
        </template>
        <template #payload-cell="{ row }">
          <span class="font-mono text-xs">{{ maskAddress(row.original.addressPayload) }}</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge :label="row.original.status" variant="subtle" size="xs" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1 flex-wrap">
            <UButton
              v-if="row.original.status !== 'DISABLED'"
              label="编辑"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('edit-address', row.original)"
            />
            <UButton
              v-if="row.original.status === 'PENDING_APPROVAL'"
              label="通过"
              size="xs"
              color="success"
              variant="ghost"
              @click="emit('approve-address', row.original)"
            />
            <UButton
              v-if="row.original.status === 'PENDING_APPROVAL'"
              label="驳回"
              size="xs"
              color="error"
              variant="ghost"
              @click="emit('reject-address', row.original)"
            />
            <UButton
              v-if="row.original.status === 'ACTIVE'"
              label="停用"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('disable-address', row.original)"
            />
          </div>
        </template>
      </UTable>
    </section>

    <USeparator />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-medium text-highlighted">打款明细</h3>
        <UButton
          label="登记打款"
          icon="i-lucide-banknote"
          size="sm"
          color="primary"
          :disabled="!canPay"
          @click="emit('pay')"
        />
      </div>
      <UTable v-if="prepayments.length" :data="prepayments" :columns="payColumns">
        <template #address-cell="{ row }">
          {{ addressLabel(row.original.paymentAddressId) }}
        </template>
        <template #ownership-cell="{ row }">
          {{ ownershipLabel(row.original.productOwnership) }}
        </template>
        <template #amount-cell="{ row }">
          {{ formatCurrency(row.original.amount) }}
        </template>
      </UTable>
      <p v-else class="text-sm text-muted py-4 text-center">暂无打款记录</p>
    </section>

    <USeparator />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-medium text-highlighted">退款明细</h3>
          <p class="text-xs text-muted">登记后确认；不回写余额、不改结算</p>
        </div>
        <UButton
          label="登记退款"
          icon="i-lucide-undo-2"
          size="sm"
          color="primary"
          @click="emit('add-refund')"
        />
      </div>
      <UTable v-if="refunds.length" :data="refunds" :columns="refundColumns">
        <template #amount-cell="{ row }">
          {{ formatCurrency(row.original.amount) }}
        </template>
        <template #actions-cell="{ row }">
          <div v-if="row.original.status === 'PENDING'" class="flex justify-end gap-1">
            <UButton
              label="确认"
              size="xs"
              color="success"
              variant="ghost"
              @click="emit('confirm-refund', row.original)"
            />
            <UButton
              label="驳回"
              size="xs"
              color="error"
              variant="ghost"
              @click="emit('reject-refund', row.original)"
            />
          </div>
        </template>
      </UTable>
      <p v-else class="text-sm text-muted py-4 text-center">暂无退款记录</p>
    </section>
  </div>
</template>
