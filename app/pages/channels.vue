<script setup lang="ts">
import type { Channel } from '~/types'

const { data: channels } = await useFetch<Channel[]>('/api/channels')

const q = ref('')
const selectedChannel = ref<Channel | null>(null)
const showRechargeModal = ref(false)
const rechargeAmount = ref<number | null>(null)
const rechargeMethod = ref('bank')
const toast = useToast()

const filteredChannels = computed(() => {
  if (!q.value) return channels.value ?? []
  const regex = new RegExp(q.value, 'i')
  return (channels.value ?? []).filter(c =>
    regex.test(c.name) || regex.test(c.contactInfo) ||
    c.supportedMedia.some(m => regex.test(m))
  )
})

function openRecharge(channel: Channel) {
  selectedChannel.value = channel
  rechargeAmount.value = null
  rechargeMethod.value = 'bank'
  showRechargeModal.value = true
}

function confirmRecharge() {
  if (!selectedChannel.value || !rechargeAmount.value || rechargeAmount.value <= 0) return
  const amount = rechargeAmount.value
  selectedChannel.value.balance += amount
  selectedChannel.value.totalPayment += amount
  selectedChannel.value.estimatedDays = Math.round(selectedChannel.value.balance / (selectedChannel.value.consumed / 30))
  showRechargeModal.value = false
  toast.add({
    title: '充值成功',
    description: `${selectedChannel.value.name} 已充值 $${amount.toLocaleString()}`,
    icon: 'i-lucide-check-circle',
    color: 'success'
  })
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="渠道中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UInput
            v-model="q"
            icon="i-lucide-search"
            placeholder="搜索渠道..."
            class="w-40 lg:w-56"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-4">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="channel in filteredChannels"
          :key="channel.id"
          :ui="{ body: 'p-4 sm:p-4' }"
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
              <span class="text-muted">总账户</span>
              <span class="text-highlighted font-medium">{{ channel.totalAccounts }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">活跃账户</span>
              <span class="text-highlighted font-medium">{{ channel.activeAccounts }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">可分配</span>
              <span class="text-highlighted font-medium">{{ channel.availableAccounts }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">封户率</span>
              <span :class="channel.banRate > 10 ? 'text-error font-medium' : 'text-highlighted font-medium'">{{ channel.banRate }}%</span>
            </div>
            <USeparator />
            <div class="flex justify-between">
              <span class="text-muted">余额</span>
              <span class="text-highlighted font-medium">${{ channel.balance.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">预计可用天数</span>
              <span :class="channel.estimatedDays <= 5 ? 'text-warning font-medium' : 'text-highlighted font-medium'">{{ channel.estimatedDays }} 天</span>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-1">
                <UBadge
                  v-for="media in channel.supportedMedia"
                  :key="media"
                  :label="media"
                  variant="subtle"
                  color="neutral"
                  size="xs"
                />
              </div>
              <UButton
                label="充值"
                icon="i-lucide-plus-circle"
                color="success"
                variant="soft"
                size="xs"
                @click="openRecharge(channel)"
              />
            </div>
          </template>
        </UCard>
      </div>

      <div v-if="!filteredChannels.length" class="text-center text-dimmed py-8">
        暂无匹配的渠道
      </div>
    </div>

    <UModal v-model:open="showRechargeModal">
      <template #content>
        <UCard v-if="selectedChannel">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-plus-circle" class="size-5 text-success" />
              <span class="font-semibold text-highlighted">渠道充值</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">渠道: </span>
              <span class="text-highlighted font-medium">{{ selectedChannel.name }}</span>
            </div>

            <div class="text-sm">
              <span class="text-muted">当前余额: </span>
              <span class="text-highlighted font-medium font-mono">${{ selectedChannel.balance.toLocaleString() }}</span>
            </div>

            <USeparator />

            <UFormField label="充值金额" required>
              <UInput
                v-model="rechargeAmount"
                type="number"
                placeholder="输入充值金额"
                icon="i-lucide-dollar-sign"
              />
            </UFormField>

            <UFormField label="充值方式">
              <URadioGroup
                v-model="rechargeMethod"
                :items="[
                  { label: '银行转账', value: 'bank' },
                  { label: '线上支付', value: 'online' },
                  { label: '信用额度', value: 'credit' }
                ]"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showRechargeModal = false" />
              <UButton
                label="确认充值"
                icon="i-lucide-check-circle"
                color="success"
                :disabled="!rechargeAmount || rechargeAmount <= 0"
                @click="confirmRecharge"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </UDashboardPanel>
</template>