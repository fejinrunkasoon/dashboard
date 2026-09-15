<script setup lang="ts">
import type { Alert, AlertStatus } from '~/types'

const { data: alerts } = await useFetch<Alert[]>('/api/alerts')

const selectedCategory = ref('all')
const selectedStatus = ref('all')
const selectedAlert = ref<Alert | null>(null)
const showDetailModal = ref(false)
const handleResult = ref('')
const toast = useToast()

const categories = [
  { label: '全部', value: 'all' },
  { label: '账户', value: 'account' },
  { label: '团队', value: 'team' },
  { label: '渠道', value: 'channel' },
  { label: '对账', value: 'reconciliation' },
  { label: '系统', value: 'system' }
]

const statuses = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '已认领', value: 'claimed' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已忽略', value: 'ignored' }
]

const filteredAlerts = computed(() => {
  let result = alerts.value ?? []
  if (selectedCategory.value !== 'all') {
    result = result.filter(a => a.category === selectedCategory.value)
  }
  if (selectedStatus.value !== 'all') {
    result = result.filter(a => a.status === selectedStatus.value)
  }
  return result
})

const pendingCount = computed(() =>
  (alerts.value ?? []).filter(a => a.status === 'pending' || a.status === 'claimed' || a.status === 'processing').length
)

const priorityColor = (priority: string) => {
  if (priority === 'urgent') return 'error'
  if (priority === 'warning') return 'warning'
  return 'info'
}

const priorityLabel = (priority: string) => {
  if (priority === 'urgent') return '紧急'
  if (priority === 'warning') return '警告'
  return '提示'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    processing: '处理中',
    resolved: '已解决',
    ignored: '已忽略'
  }
  return map[status] ?? status
}

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'error',
    claimed: 'warning',
    processing: 'info',
    resolved: 'success',
    ignored: 'neutral'
  }
  return map[status] ?? 'neutral'
}

const categoryLabel = (category: string) => {
  const map: Record<string, string> = {
    account: '账户',
    team: '团队',
    channel: '渠道',
    reconciliation: '对账',
    system: '系统'
  }
  return map[category] ?? category
}

const categoryIcon = (category: string) => {
  const map: Record<string, string> = {
    account: 'i-lucide-wallet',
    team: 'i-lucide-users',
    channel: 'i-lucide-git-branch',
    reconciliation: 'i-lucide-receipt',
    system: 'i-lucide-server'
  }
  return map[category] ?? 'i-lucide-info'
}

function openDetail(alert: Alert) {
  selectedAlert.value = alert
  handleResult.value = alert.handleResult ?? ''
  showDetailModal.value = true
}

function claimAlert(alert: Alert) {
  if (alert) {
    alert.status = 'claimed'
    alert.handlerName = '管理员'
    toast.add({ title: '已认领', description: `预警 #${alert.id} 已认领处理`, icon: 'i-lucide-check', color: 'success' })
  }
}

function startProcessing(alert: Alert) {
  if (alert) {
    alert.status = 'processing'
    toast.add({ title: '开始处理', description: `预警 #${alert.id} 已标记为处理中`, icon: 'i-lucide-loader', color: 'info' })
  }
}

function resolveAlert(alert: Alert) {
  if (alert) {
    alert.status = 'resolved'
    alert.handleResult = handleResult.value
    alert.handledAt = new Date().toISOString()
    showDetailModal.value = false
    toast.add({ title: '已解决', description: `预警 #${alert.id} 已标记为已解决`, icon: 'i-lucide-check-circle', color: 'success' })
  }
}

function ignoreAlert(alert: Alert) {
  if (alert) {
    alert.status = 'ignored'
    alert.handledAt = new Date().toISOString()
    showDetailModal.value = false
    toast.add({ title: '已忽略', description: `预警 #${alert.id} 已标记为已忽略`, icon: 'i-lucide-x', color: 'neutral' })
  }
}

const nextAction = (alert: Alert): { label: string, icon: string, color: string } | null => {
  if (alert.status === 'pending') return { label: '认领', icon: 'i-lucide-hand', color: 'warning' }
  if (alert.status === 'claimed') return { label: '开始处理', icon: 'i-lucide-play', color: 'info' }
  if (alert.status === 'processing') return { label: '标记解决', icon: 'i-lucide-check-circle', color: 'success' }
  return null
}

function executeNextAction(alert: Alert) {
  if (alert.status === 'pending') claimAlert(alert)
  else if (alert.status === 'claimed') startProcessing(alert)
  else if (alert.status === 'processing') openDetail(alert)
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="预警与待办" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            v-if="pendingCount > 0"
            :label="`${pendingCount} 待处理`"
            color="error"
            variant="subtle"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-4 space-y-4">
      <div class="flex flex-wrap gap-3">
        <USelectMenu
          v-model="selectedCategory"
          :items="categories"
          value-key="value"
          label-key="label"
          placeholder="分类筛选"
          class="w-36"
        />
        <USelectMenu
          v-model="selectedStatus"
          :items="statuses"
          value-key="value"
          label-key="label"
          placeholder="状态筛选"
          class="w-36"
        />
      </div>

      <div class="space-y-3">
        <UCard
          v-for="alert in filteredAlerts"
          :key="alert.id"
          :ui="{ body: 'p-4 sm:p-4' }"
          class="cursor-pointer hover:shadow-sm transition-shadow"
          @click="openDetail(alert)"
        >
          <div class="flex items-start gap-3">
            <div class="shrink-0 mt-0.5">
              <UIcon :name="categoryIcon(alert.category)" class="size-5" :class="`text-${priorityColor(alert.priority)}`" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="font-medium text-highlighted text-sm">{{ alert.title }}</span>
                <UBadge
                  :label="priorityLabel(alert.priority)"
                  :color="priorityColor(alert.priority)"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  :label="categoryLabel(alert.category)"
                  variant="subtle"
                  color="neutral"
                  size="xs"
                />
                <UBadge
                  :label="statusLabel(alert.status)"
                  :color="statusColor(alert.status)"
                  variant="subtle"
                  size="xs"
                />
              </div>
              <p class="text-dimmed text-sm mb-2">{{ alert.description }}</p>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 text-xs text-muted">
                  <span>{{ new Date(alert.triggeredAt).toLocaleString('zh-CN') }}</span>
                  <span v-if="alert.handlerName">处理人: {{ alert.handlerName }}</span>
                </div>

                <div v-if="nextAction(alert)" class="flex items-center gap-2">
                  <UButton
                    :label="nextAction(alert)!.label"
                    :icon="nextAction(alert)!.icon"
                    :color="nextAction(alert)!.color as any"
                    variant="soft"
                    size="xs"
                    @click.stop="executeNextAction(alert)"
                  />
                  <UButton
                    v-if="alert.status === 'pending'"
                    label="忽略"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click.stop="ignoreAlert(alert)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div
          v-if="!filteredAlerts.length"
          class="text-center text-dimmed py-8"
        >
          暂无匹配的预警记录
        </div>
      </div>
    </div>

    <UModal v-model:open="showDetailModal">
      <template #content>
        <UCard v-if="selectedAlert">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon :name="categoryIcon(selectedAlert.category)" class="size-5" :class="`text-${priorityColor(selectedAlert.priority)}`" />
              <div>
                <p class="font-semibold text-highlighted">{{ selectedAlert.title }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge :label="priorityLabel(selectedAlert.priority)" :color="priorityColor(selectedAlert.priority)" variant="subtle" size="xs" />
                  <UBadge :label="categoryLabel(selectedAlert.category)" variant="subtle" color="neutral" size="xs" />
                  <UBadge :label="statusLabel(selectedAlert.status)" :color="statusColor(selectedAlert.status)" variant="subtle" size="xs" />
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-xs text-muted uppercase mb-1">预警描述</p>
              <p class="text-sm text-highlighted">{{ selectedAlert.description }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs text-muted uppercase mb-1">关联对象</p>
                <p class="text-highlighted">{{ selectedAlert.relatedName }}</p>
              </div>
              <div>
                <p class="text-xs text-muted uppercase mb-1">触发时间</p>
                <p class="text-highlighted">{{ new Date(selectedAlert.triggeredAt).toLocaleString('zh-CN') }}</p>
              </div>
              <div v-if="selectedAlert.handlerName">
                <p class="text-xs text-muted uppercase mb-1">处理人</p>
                <p class="text-highlighted">{{ selectedAlert.handlerName }}</p>
              </div>
              <div v-if="selectedAlert.handledAt">
                <p class="text-xs text-muted uppercase mb-1">处理时间</p>
                <p class="text-highlighted">{{ new Date(selectedAlert.handledAt).toLocaleString('zh-CN') }}</p>
              </div>
            </div>

            <USeparator />

            <div v-if="selectedAlert.status === 'processing' || selectedAlert.status === 'resolved'">
              <p class="text-xs text-muted uppercase mb-2">处理结果</p>
              <UTextarea
                v-if="selectedAlert.status === 'processing'"
                v-model="handleResult"
                placeholder="请填写处理结果和采取的措施..."
                :rows="3"
                autoresize
              />
              <p v-else class="text-sm text-highlighted">{{ selectedAlert.handleResult || '未填写' }}</p>
            </div>

            <div v-if="selectedAlert.status !== 'resolved' && selectedAlert.status !== 'ignored'" class="flex items-center gap-2 justify-end">
              <UButton
                v-if="selectedAlert.status === 'pending'"
                label="认领"
                icon="i-lucide-hand"
                color="warning"
                variant="soft"
                @click="claimAlert(selectedAlert!)"
              />
              <UButton
                v-if="selectedAlert.status === 'claimed'"
                label="开始处理"
                icon="i-lucide-play"
                color="info"
                variant="soft"
                @click="startProcessing(selectedAlert!)"
              />
              <UButton
                v-if="selectedAlert.status === 'processing'"
                label="标记已解决"
                icon="i-lucide-check-circle"
                color="success"
                variant="soft"
                :disabled="!handleResult.trim()"
                @click="resolveAlert(selectedAlert!)"
              />
              <UButton
                label="忽略"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="ignoreAlert(selectedAlert!)"
              />
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </UDashboardPanel>
</template>