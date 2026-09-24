<script setup lang="ts">
import type { AdAccountListItem } from '~/domain'
import { formatCurrency } from '~/utils'

const props = defineProps<{
  account: AdAccountListItem
  usageDays: number | null
}>()

const emit = defineEmits<{
  assign: []
  transfer: []
  recycle: []
  disable: []
  changeProduct: []
  changeManager: []
}>()

const assetStatusLabel: Record<string, string> = {
  AVAILABLE: '可用',
  ASSIGNED: '已分配',
  IN_USE: '使用中',
  IDLE: '闲置',
  DISABLED: '停用',
  ARCHIVED: '归档'
}

const mediaStatusLabel: Record<string, string> = {
  ACTIVE: '正常',
  RESTRICTED: '受限',
  DISABLED: '停用',
  BANNED: '封禁',
  UNKNOWN: '未知'
}

const isDisabled = computed(() => props.account.assetStatus === 'DISABLED')
const isAssigned = computed(() => props.account.team != null || props.account.member != null)
const isPoolEligible = computed(() =>
  props.account.assetStatus === 'AVAILABLE'
  && props.account.mediaStatus === 'ACTIVE'
  && props.account.team == null
)

function productLabel(account: AdAccountListItem): string {
  if (!account.product) return '—'
  if (account.product.ownershipType === 'EXTERNAL' && account.customer) {
    return `${account.product.name} · 外接 · ${account.customer.name}`
  }
  if (account.product.ownershipType === 'EXTERNAL') {
    return `${account.product.name} · 外接`
  }
  return `${account.product.name} · 自家`
}

function moneyOrDash(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatCurrency(value)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-xl font-semibold font-mono text-highlighted">
            {{ account.externalAccountId }}
          </h1>
          <UBadge :label="account.media.name" variant="subtle" color="neutral" size="xs" />
          <UBadge
            :label="assetStatusLabel[account.assetStatus] ?? account.assetStatus"
            variant="subtle"
            size="xs"
          />
          <UBadge
            :label="mediaStatusLabel[account.mediaStatus] ?? account.mediaStatus"
            variant="subtle"
            size="xs"
          />
        </div>
        <p class="text-sm text-muted">
          {{ account.accountName ?? '—' }}
        </p>
        <p v-if="account.note" class="text-sm text-warning flex items-start gap-1.5">
          <UIcon name="i-lucide-sticky-note" class="size-4 mt-0.5 shrink-0" />
          <span>{{ account.note }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap justify-end">
        <UButton
          v-if="isPoolEligible"
          label="分配"
          icon="i-lucide-user-plus"
          color="primary"
          variant="soft"
          size="sm"
          @click="emit('assign')"
        />
        <UButton
          label="转移"
          icon="i-lucide-arrow-right-left"
          color="info"
          variant="soft"
          size="sm"
          :disabled="isDisabled || !isAssigned"
          @click="emit('transfer')"
        />
        <UButton
          label="回收"
          icon="i-lucide-rotate-ccw"
          color="warning"
          variant="soft"
          size="sm"
          :disabled="isDisabled || !isAssigned"
          @click="emit('recycle')"
        />
        <UButton
          label="更换产品"
          icon="i-lucide-package"
          color="neutral"
          variant="soft"
          size="sm"
          :disabled="isDisabled"
          @click="emit('changeProduct')"
        />
        <UButton
          label="更换户管"
          icon="i-lucide-user-cog"
          color="neutral"
          variant="soft"
          size="sm"
          :disabled="isDisabled"
          @click="emit('changeManager')"
        />
        <UButton
          label="停用"
          icon="i-lucide-ban"
          color="error"
          variant="soft"
          size="sm"
          :disabled="isDisabled"
          @click="emit('disable')"
        />
      </div>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          渠道
        </p>
        <p class="text-highlighted">
          {{ account.channel.name }}
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          管理资产
        </p>
        <p class="text-highlighted font-mono text-xs">
          <template v-if="account.platformAsset">
            {{ account.platformAsset.typeName }} {{ account.platformAsset.externalId }}
          </template>
          <template v-else>—</template>
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          时区
        </p>
        <p class="text-highlighted">
          {{ account.timezone ?? '—' }}
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          API Access
        </p>
        <p class="text-highlighted">
          {{ account.apiAccessStatus }}
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          团队 / 成员
        </p>
        <p class="text-highlighted">
          {{ account.team?.name ?? '未分配' }}
          <span v-if="account.member"> / {{ account.member.name }}</span>
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          户管
        </p>
        <p class="text-highlighted">
          {{ account.manager?.name ?? '—' }}
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          产品
        </p>
        <p class="text-highlighted">
          {{ productLabel(account) }}
        </p>
      </div>
      <div class="rounded-lg bg-elevated/50 p-3">
        <p class="text-xs text-muted mb-1">
          费率政策
        </p>
        <p class="text-highlighted">
          {{ account.serviceFeePolicy?.name ?? '—' }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Today
        </p>
        <p class="font-mono text-sm">
          {{ formatCurrency(account.todaySpend) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          7D
        </p>
        <p class="font-mono text-sm">
          {{ formatCurrency(account.spend7d) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          30D
        </p>
        <p class="font-mono text-sm">
          {{ formatCurrency(account.spend30d) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Lifetime
        </p>
        <p class="font-mono text-sm">
          {{ formatCurrency(account.amountSpent) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Usage Days
        </p>
        <p class="font-mono text-sm">
          {{ usageDays == null ? '—' : `${usageDays} 天` }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Spend Limit
        </p>
        <p class="font-mono text-sm">
          {{ moneyOrDash(account.spendLimit) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Remaining
        </p>
        <p class="font-mono text-sm">
          {{ moneyOrDash(account.remainingLimit) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          有效可消耗
        </p>
        <p class="font-mono text-sm">
          {{ moneyOrDash(account.effectiveRemaining) }}
        </p>
      </div>
    </div>
  </div>
</template>
