<script setup lang="ts">
useSeoMeta({ title: '规则配置' })

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
  toast.add({
    title: '已保存',
    description: '规则与阈值配置已更新（Mock）。',
    icon: 'i-lucide-check',
    color: 'success'
  })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="规则配置"
      description="设置预警阈值和自动化规则。对账业务记录在渠道中心处理，本页只保留差异阈值与自动对账开关。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <UButton
        label="保存配置"
        icon="i-lucide-save"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="onSave"
      />
    </UPageCard>

    <UPageCard title="预警阈值" variant="subtle">
      <UFormField
        name="balanceWarningDays"
        label="余额预警天数"
        description="渠道余额低于此天数消耗量时触发预警。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="alertThresholds.balanceWarningDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField
        name="idleAccountDays"
        label="闲置账户天数"
        description="账户超过此天数无消耗则标记为闲置。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="alertThresholds.idleAccountDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField
        name="banRateThreshold"
        label="封户率阈值 (%)"
        description="渠道或团队封户率超过此值时触发预警。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="alertThresholds.banRateThreshold" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField
        name="consumptionDropPercent"
        label="消耗骤降比例 (%)"
        description="账户消耗下降超过此比例时触发预警。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="alertThresholds.consumptionDropPercent" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField
        name="reconciliationDiffPercent"
        label="对账差异阈值 (%)"
        description="渠道账单与系统消耗差异超过此比例时触发预警。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="alertThresholds.reconciliationDiffPercent" type="number" class="w-24" />
      </UFormField>
    </UPageCard>

    <UPageCard title="自动化规则" variant="subtle">
      <UFormField
        name="autoRecycleIdleDays"
        label="自动回收闲置账户天数"
        description="账户闲置超过此天数将自动回收到待分配池。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="autoRules.autoRecycleIdleDays" type="number" class="w-24" />
      </UFormField>
      <USeparator />
      <UFormField
        name="autoTransferOnBan"
        label="封户自动转移"
        description="账户被封时自动转移该成员的其他活跃账户。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch v-model="autoRules.autoTransferOnBan" />
      </UFormField>
      <USeparator />
      <UFormField
        name="autoAlertOnDrop"
        label="消耗骤降自动预警"
        description="账户消耗骤降时自动生成预警工单。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch v-model="autoRules.autoAlertOnDrop" />
      </UFormField>
      <USeparator />
      <UFormField
        name="autoReconcileMonthly"
        label="月度自动对账"
        description="每月自动对比渠道账单与系统消耗并生成差异预警；对账明细在渠道中心。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch v-model="autoRules.autoReconcileMonthly" />
      </UFormField>
    </UPageCard>
  </div>
</template>
