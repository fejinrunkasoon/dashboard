<script setup lang="ts">
import type { AccountSpendDaily, AccountSpendMetrics, AdAccountListItem } from '~/domain'
import { accountService, accountSpendService } from '~/services'
import { formatCurrency } from '~/utils'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'
import type { SpendPeriodPreset } from '~/domain'

const props = defineProps<{
  account: AdAccountListItem
  dailyRows: AccountSpendDaily[]
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const { member } = useCurrentUser()
const toast = useToast()
const period = ref<SpendPeriodPreset>('7D')
const customFrom = ref(shiftDate(MOCK_TODAY, -6))
const customTo = ref(MOCK_TODAY)
const metrics = ref<AccountSpendMetrics | null>(null)
const customSpend = ref<number | null>(null)
const pending = ref(false)
const draftLimit = ref<number | null>(null)
const savingLimit = ref(false)

const recentDaily = computed(() =>
  [...props.dailyRows]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
)

watch(
  () => props.account.spendLimit,
  (v) => { draftLimit.value = v },
  { immediate: true }
)

async function refresh() {
  pending.value = true
  try {
    metrics.value = await accountSpendService.getAccountSpendMetrics(props.account.id)
    if (period.value === 'CUSTOM') {
      const window = await accountSpendService.getAccountSpend(props.account.id, {
        from: customFrom.value,
        to: customTo.value
      })
      customSpend.value = window?.spend ?? 0
    } else {
      customSpend.value = null
    }
  } finally {
    pending.value = false
  }
}

watch(
  () => [props.account.id, period.value, customFrom.value, customTo.value] as const,
  () => { void refresh() },
  { immediate: true }
)

const selectedSpend = computed(() => {
  if (!metrics.value) return null
  if (period.value === 'TODAY') return metrics.value.todaySpend
  if (period.value === '30D') return metrics.value.spend30d
  if (period.value === 'CUSTOM') return customSpend.value
  return metrics.value.spend7d
})

async function saveSpendLimit() {
  if (!member.value?.id || savingLimit.value) return
  savingLimit.value = true
  try {
    await accountService.changeSpendLimit({
      accountId: props.account.id,
      spendLimit: draftLimit.value != null && draftLimit.value > 0 ? draftLimit.value : null,
      createdBy: member.value.id
    })
    toast.add({ title: 'Spend Limit 已更新', icon: 'i-lucide-check', color: 'success' })
    emit('refreshed')
    await refresh()
  } catch (error) {
    toast.add({
      title: '更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    savingLimit.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-muted">
      「已花费 / Lifetime」仅为媒体消耗，不含服务费。有效可消耗 = min(账户额度剩余, 渠道标签共享池剩余)。
    </p>

    <FiltersPeriodFilter
      v-model="period"
      v-model:custom-from="customFrom"
      v-model:custom-to="customTo"
      label="周期"
    />

    <div v-if="pending" class="text-sm text-muted py-4">
      加载消耗…
    </div>
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          选定周期
        </p>
        <p class="font-mono">
          {{ selectedSpend == null ? '—' : formatCurrency(selectedSpend) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          Lifetime
        </p>
        <p class="font-mono">
          {{ formatCurrency(account.amountSpent) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          账户额度剩余
        </p>
        <p class="font-mono">
          {{ account.remainingLimit == null ? '—' : formatCurrency(account.remainingLimit) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          共享池剩余
        </p>
        <p class="font-mono">
          {{ account.poolRemaining == null ? '—' : formatCurrency(account.poolRemaining) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted mb-1">
          有效可消耗
        </p>
        <p class="font-mono text-highlighted">
          {{ account.effectiveRemaining == null ? '—' : formatCurrency(account.effectiveRemaining) }}
        </p>
      </div>
    </div>

    <div class="rounded-lg border border-default p-3 space-y-2">
      <p class="text-xs font-medium text-highlighted">
        设置最高额度（Spend Limit）
      </p>
      <div class="flex flex-wrap items-end gap-2">
        <UFormField label="金额" class="min-w-40">
          <UInput
            v-model.number="draftLimit"
            type="number"
            :min="0"
            step="100"
            placeholder="空=不限"
          />
        </UFormField>
        <UButton
          label="保存额度"
          size="sm"
          color="primary"
          :loading="savingLimit"
          :disabled="!member"
          @click="saveSpendLimit"
        />
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium mb-2">
        最近 14 日 Daily Spend
      </h3>
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 font-medium">
                日期
              </th>
              <th class="px-3 py-2 font-medium">
                消耗
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in recentDaily"
              :key="row.date"
              class="border-t border-default"
            >
              <td class="px-3 py-2 font-mono text-xs">
                {{ row.date }}
              </td>
              <td class="px-3 py-2 font-mono text-xs">
                {{ formatCurrency(row.spend) }}
              </td>
            </tr>
            <tr v-if="!recentDaily.length">
              <td colspan="2" class="px-3 py-6 text-center text-muted">
                无日消耗数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
