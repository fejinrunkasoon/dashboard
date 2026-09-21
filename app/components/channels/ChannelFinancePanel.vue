<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AccountMonthlySettlement,
  ChannelMonthlySettlementSummary,
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
}>()

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
