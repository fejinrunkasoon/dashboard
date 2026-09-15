<script setup lang="ts">
import type { Channel, Payment } from '~/types'

const { data: channels } = await useFetch<Channel[]>('/api/channels')
const { data: payments } = await useFetch<Payment[]>('/api/payments')

const selectedChannel = ref<Channel | null>(null)
const showPaymentHistory = ref(false)

const channelPayments = computed(() => {
  if (!selectedChannel.value || !payments.value) return []
  return payments.value.filter(p => p.channelId === selectedChannel.value!.id)
})

const paymentStatusColor = (status: string) => {
  const map: Record<string, string> = { pending: 'warning', confirmed: 'success', failed: 'error' }
  return map[status] ?? 'neutral'
}

const paymentStatusLabel = (status: string) => {
  const map: Record<string, string> = { pending: '待确认', confirmed: '已确认', failed: '失败' }
  return map[status] ?? status
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="数据接入"
      description="管理上游渠道数据源接入，查看账户质量、余额和打款记录。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex gap-2 w-fit lg:ms-auto">
        <UButton
          label="新增渠道"
          icon="i-lucide-plus"
          color="neutral"
        />
        <UButton
          label="同步数据"
          icon="i-lucide-refresh-cw"
          color="primary"
          variant="outline"
        />
      </div>
    </UPageCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="channel in channels"
        :key="channel.id"
        :ui="{ body: 'p-4 sm:p-4' }"
        class="cursor-pointer transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': selectedChannel?.id === channel.id }"
        @click="selectedChannel = channel; showPaymentHistory = true"
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-git-branch" class="text-primary size-5" />
              <span class="font-semibold text-highlighted">{{ channel.name }}</span>
            </div>
            <UBadge
              :label="channel.status === 'active' ? '活跃' : '停用'"
              :color="channel.status === 'active' ? 'success' : 'error'"
              variant="subtle"
              size="xs"
            />
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">联系方式</span>
            <span class="text-highlighted">{{ channel.contactInfo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">支持媒体</span>
            <div class="flex gap-1">
              <UBadge
                v-for="media in channel.supportedMedia"
                :key="media"
                :label="media"
                variant="subtle"
                color="neutral"
                size="xs"
              />
            </div>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <span class="text-muted">总账户</span>
            <span class="text-highlighted font-medium">{{ channel.totalAccounts }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">活跃 / 可分配</span>
            <span class="text-highlighted font-medium">{{ channel.activeAccounts }} / {{ channel.availableAccounts }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">封户率</span>
            <span :class="channel.banRate > 10 ? 'text-error font-medium' : 'text-highlighted font-medium'">{{ channel.banRate }}%</span>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <span class="text-muted">累计消耗</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(channel.consumed) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">累计打款</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(channel.totalPayment) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">当前余额</span>
            <span :class="channel.estimatedDays <= 5 ? 'text-warning font-medium' : 'text-highlighted font-medium'">{{ formatCurrency(channel.balance) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">预计可用</span>
            <span :class="channel.estimatedDays <= 5 ? 'text-warning font-medium' : 'text-highlighted font-medium'">{{ channel.estimatedDays }} 天</span>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showPaymentHistory">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-receipt" class="size-5" />
              <span class="font-semibold">{{ selectedChannel?.name }} — 打款记录</span>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="payment in channelPayments"
              :key="payment.id"
              class="flex items-center justify-between py-2 border-b border-default last:border-b-0"
            >
              <div class="text-sm">
                <p class="text-highlighted font-medium">{{ formatCurrency(payment.amount) }}</p>
                <p class="text-muted text-xs">
                  {{ new Date(payment.paymentTime).toLocaleDateString('zh-CN') }} · {{ payment.method }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="paymentStatusLabel(payment.status)"
                  :color="paymentStatusColor(payment.status)"
                  variant="subtle"
                  size="xs"
                />
                <span v-if="payment.receipt" class="text-xs text-muted font-mono">{{ payment.receipt }}</span>
              </div>
            </div>

            <div
              v-if="!channelPayments.length"
              class="text-center text-dimmed py-4"
            >
              暂无打款记录
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>