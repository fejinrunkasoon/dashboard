<script setup lang="ts">
import type { Reconciliation } from '~/types'

const { data: reconciliation } = await useFetch<Reconciliation[]>('/api/reconciliation')

const reconciliationStatusColor = (status: string) => {
  const map: Record<string, string> = { pending: 'warning', confirmed: 'success', disputed: 'error' }
  return map[status] ?? 'neutral'
}

const reconciliationStatusLabel = (status: string) => {
  const map: Record<string, string> = { pending: '待确认', confirmed: '已确认', disputed: '有争议' }
  return map[status] ?? status
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`

const alertThresholds = reactive({
  balanceWarningDays: 5,
  idleAccountDays: 7,
  banRateThreshold: 10,
  consumptionDropPercent: 50,
  reconciliationDiffPercent: 5
})

const autoRules = reactive({
  autoRecycleIdleDays: 30,
  autoTransferOnBan: true,
  autoAlertOnDrop: true,
  autoReconcileMonthly: true
})

const toast = useToast()

function onSave() {
  toast.add({ title: '已保存', description: '规则与阈值配置已更新。', icon: 'i-lucide-check', color: 'success' })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="规则配置"
      description="设置预警阈值和自动化规则，系统将根据配置自动执行相应操作。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton label="保存配置" icon="i-lucide-save" color="neutral" class="w-fit lg:ms-auto" @click="onSave" />
    </UPageCard>

    <UPageCard title="预警阈值" variant="subtle">
      <UFormField name="balanceWarningDays" label="余额预警天数" description="渠道余额低于此天数消耗量时触发预警。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="alertThresholds.balanceWarningDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField name="idleAccountDays" label="闲置账户天数" description="账户超过此天数无消耗则标记为闲置。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="alertThresholds.idleAccountDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField name="banRateThreshold" label="封户率阈值 (%)" description="渠道或团队封户率超过此值时触发预警。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="alertThresholds.banRateThreshold" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField name="consumptionDropPercent" label="消耗骤降比例 (%)" description="账户消耗下降超过此比例时触发预警。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="alertThresholds.consumptionDropPercent" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField name="reconciliationDiffPercent" label="对账差异阈值 (%)" description="渠道账单与系统消耗差异超过此比例时触发预警。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="alertThresholds.reconciliationDiffPercent" type="number" class="w-24" />
      </UFormField>
    </UPageCard>

    <UPageCard title="自动化规则" variant="subtle">
      <UFormField name="autoRecycleIdleDays" label="自动回收闲置账户天数" description="账户闲置超过此天数将自动回收到待分配池。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="autoRules.autoRecycleIdleDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField name="autoTransferOnBan" label="封户自动转移" description="账户被封时自动转移该成员的其他活跃账户。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="autoRules.autoTransferOnBan" />
      </UFormField>
      <USeparator />
      <UFormField name="autoAlertOnDrop" label="消耗骤降自动预警" description="账户消耗骤降时自动生成预警工单。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="autoRules.autoAlertOnDrop" />
      </UFormField>
      <USeparator />
      <UFormField name="autoReconcileMonthly" label="月度自动对账" description="每月自动对比渠道账单与系统消耗数据。" class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="autoRules.autoReconcileMonthly" />
      </UFormField>
    </UPageCard>

    <UPageCard title="对账记录" description="各渠道月度对账情况，差异超过阈值将标红。" variant="naked" class="mb-4" />

    <UPageCard variant="subtle" :ui="{ container: 'p-0 sm:p-0' }">
      <div class="divide-y divide-default">
        <div
          v-for="record in reconciliation"
          :key="record.id"
          class="flex items-center justify-between gap-4 py-3 px-4 sm:px-6"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted">{{ record.channelName }}</p>
            <p class="text-xs text-muted">{{ record.billingPeriod }}</p>
          </div>
          <div class="flex items-center gap-4 text-sm shrink-0">
            <div class="text-right">
              <p class="text-muted text-xs">渠道账单</p>
              <p class="text-highlighted font-medium">{{ formatCurrency(record.channelBill) }}</p>
            </div>
            <div class="text-right">
              <p class="text-muted text-xs">系统消耗</p>
              <p class="text-highlighted font-medium">{{ formatCurrency(record.systemConsumption) }}</p>
            </div>
            <div class="text-right">
              <p class="text-muted text-xs">差异</p>
              <p :class="record.differenceRate > alertThresholds.reconciliationDiffPercent ? 'text-error font-medium' : 'text-highlighted font-medium'">
                {{ formatCurrency(record.difference) }} ({{ record.differenceRate }}%)
              </p>
            </div>
            <UBadge :label="reconciliationStatusLabel(record.status)" :color="reconciliationStatusColor(record.status)" variant="subtle" size="xs" />
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>