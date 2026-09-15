<script setup lang="ts">
import type { AdAccount, Team, TeamMember } from '~/types'

const { data: accounts } = await useFetch<AdAccount[]>('/api/accounts')
const { data: teams } = await useFetch<Team[]>('/api/teams')
const { data: members } = await useFetch<TeamMember[]>('/api/members')

const q = ref('')
const selectedMedia = ref('all')
const selectedStatus = ref('all')
const selectedProductType = ref('all')

const selectedAccount = ref<AdAccount | null>(null)
const showTransferModal = ref(false)
const showRecycleModal = ref(false)
const showDetailModal = ref(false)

const transferTargetTeamId = ref<number | null>(null)
const transferTargetMemberId = ref<number | null>(null)
const transferReason = ref('')
const recycleReason = ref('')

const toast = useToast()

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  { label: 'Meta', value: 'Meta' },
  { label: 'Google', value: 'Google' },
  { label: 'TikTok', value: 'TikTok' }
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待分配', value: 'pending' },
  { label: '已分配', value: 'allocated' },
  { label: '使用中', value: 'active' },
  { label: '闲置', value: 'idle' },
  { label: '异常', value: 'abnormal' },
  { label: '封户', value: 'banned' },
  { label: '停用', value: 'disabled' }
]

const productTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '自家', value: 'internal' },
  { label: '外接', value: 'external' }
]

const filteredAccounts = computed(() => {
  let result = accounts.value ?? []
  if (q.value) {
    const regex = new RegExp(q.value, 'i')
    result = result.filter(a =>
      regex.test(a.accountId) || regex.test(a.accountName) ||
      regex.test(a.channelName) || regex.test(a.teamName ?? '') ||
      regex.test(a.memberName ?? '')
    )
  }
  if (selectedMedia.value !== 'all') {
    result = result.filter(a => a.media === selectedMedia.value)
  }
  if (selectedStatus.value !== 'all') {
    result = result.filter(a => a.assetStatus === selectedStatus.value)
  }
  if (selectedProductType.value !== 'all') {
    result = result.filter(a => a.productType === selectedProductType.value)
  }
  return result
})

const targetTeamMembers = computed(() => {
  if (!transferTargetTeamId.value || !members.value) return []
  return members.value.filter(m => m.teamId === transferTargetTeamId.value)
})

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'neutral', allocated: 'info', active: 'success',
    idle: 'warning', abnormal: 'warning', banned: 'error', disabled: 'neutral'
  }
  return map[status] ?? 'neutral'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待分配', allocated: '已分配', active: '使用中',
    idle: '闲置', abnormal: '异常', banned: '封户', disabled: '停用'
  }
  return map[status] ?? status
}

const mediaStatusColor = (status: string) => {
  const map: Record<string, string> = { normal: 'success', restricted: 'warning', banned: 'error' }
  return map[status] ?? 'neutral'
}

const mediaStatusLabel = (status: string) => {
  const map: Record<string, string> = { normal: '正常', restricted: '受限', banned: '封禁' }
  return map[status] ?? status
}

const productTypeLabel = (type: string | null) => {
  if (!type) return '-'
  return type === 'internal' ? '自家' : '外接'
}

const productTypeColor = (type: string | null) => {
  if (!type) return 'neutral'
  return type === 'internal' ? 'primary' : 'secondary'
}

function openDetail(account: AdAccount) {
  selectedAccount.value = account
  showDetailModal.value = true
}

function openTransfer(account: AdAccount) {
  selectedAccount.value = account
  transferTargetTeamId.value = null
  transferTargetMemberId.value = null
  transferReason.value = ''
  showTransferModal.value = true
}

function openRecycle(account: AdAccount) {
  selectedAccount.value = account
  recycleReason.value = ''
  showRecycleModal.value = true
}

function confirmTransfer() {
  if (!selectedAccount.value || !transferTargetTeamId.value) return
  const targetTeam = teams.value?.find(t => t.id === transferTargetTeamId.value)
  const targetMember = members.value?.find(m => m.id === transferTargetMemberId.value)
  if (selectedAccount.value) {
    selectedAccount.value.teamId = transferTargetTeamId.value
    selectedAccount.value.teamName = targetTeam?.name ?? null
    selectedAccount.value.memberId = transferTargetMemberId.value
    selectedAccount.value.memberName = targetMember?.name ?? null
  }
  showTransferModal.value = false
  toast.add({
    title: '转移成功',
    description: `${selectedAccount.value!.accountId} 已转移至 ${targetTeam?.name}${targetMember ? ` / ${targetMember.name}` : ''}`,
    icon: 'i-lucide-check-circle',
    color: 'success'
  })
}

function confirmRecycle() {
  if (!selectedAccount.value) return
  if (selectedAccount.value) {
    selectedAccount.value.teamId = null
    selectedAccount.value.teamName = null
    selectedAccount.value.memberId = null
    selectedAccount.value.memberName = null
    selectedAccount.value.assetStatus = 'pending'
    selectedAccount.value.isAllocated = false
  }
  showRecycleModal.value = false
  toast.add({
    title: '回收成功',
    description: `${selectedAccount.value!.accountId} 已回收至待分配池`,
    icon: 'i-lucide-rotate-ccw',
    color: 'success'
  })
}

const columns = [{
  accessorKey: 'accountId',
  header: '账户ID'
}, {
  accessorKey: 'media',
  header: '媒体'
}, {
  accessorKey: 'channelName',
  header: '渠道'
}, {
  accessorKey: 'teamName',
  header: '团队'
}, {
  accessorKey: 'memberName',
  header: '成员'
}, {
  accessorKey: 'productName',
  header: '产品'
}, {
  accessorKey: 'productType',
  header: '类型'
}, {
  accessorKey: 'assetStatus',
  header: '资产状态'
}, {
  accessorKey: 'mediaStatus',
  header: '媒体状态'
}, {
  accessorKey: 'consumed',
  header: '消耗'
}, {
  id: 'actions',
  header: '操作'
}]
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UInput
            v-model="q"
            icon="i-lucide-search"
            placeholder="搜索账户..."
            class="w-40 lg:w-56"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-4 space-y-4">
      <div class="flex flex-wrap gap-3">
        <USelectMenu
          v-model="selectedMedia"
          :items="mediaOptions"
          value-key="value"
          label-key="label"
          class="w-32"
        />
        <USelectMenu
          v-model="selectedStatus"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          class="w-32"
        />
        <USelectMenu
          v-model="selectedProductType"
          :items="productTypeOptions"
          value-key="value"
          label-key="label"
          class="w-32"
        />
        <UBadge
          :label="`${filteredAccounts.length} 个账户`"
          variant="subtle"
          color="neutral"
        />
      </div>

      <UTable
        :data="filteredAccounts"
        :columns="columns"
      >
        <template #accountId-cell="{ row }">
          <UButton
            :label="row.accountId"
            variant="ghost"
            color="neutral"
            class="font-mono text-sm -px-2 -py-1"
            @click="openDetail(row)"
          />
        </template>

        <template #media-cell="{ row }">
          <UBadge :label="row.media" variant="subtle" color="neutral" size="xs" />
        </template>

        <template #teamName-cell="{ row }">
          <span>{{ row.teamName ?? '-' }}</span>
        </template>

        <template #memberName-cell="{ row }">
          <span>{{ row.memberName ?? '-' }}</span>
        </template>

        <template #productName-cell="{ row }">
          <span>{{ row.productName ?? '-' }}</span>
        </template>

        <template #productType-cell="{ row }">
          <UBadge
            v-if="row.productType"
            :label="productTypeLabel(row.productType)"
            :color="productTypeColor(row.productType)"
            variant="subtle"
            size="xs"
          />
          <span v-else>-</span>
        </template>

        <template #assetStatus-cell="{ row }">
          <UBadge
            :label="statusLabel(row.assetStatus)"
            :color="statusColor(row.assetStatus)"
            variant="subtle"
            size="xs"
          />
        </template>

        <template #mediaStatus-cell="{ row }">
          <UBadge
            :label="mediaStatusLabel(row.mediaStatus)"
            :color="mediaStatusColor(row.mediaStatus)"
            variant="subtle"
            size="xs"
          />
        </template>

        <template #consumed-cell="{ row }">
          <span class="font-mono">${{ row.consumed.toLocaleString() }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              v-if="row.isAllocated"
              label="转移"
              icon="i-lucide-arrow-right-left"
              color="info"
              variant="ghost"
              size="xs"
              @click="openTransfer(row)"
            />
            <UButton
              v-if="row.isAllocated"
              label="回收"
              icon="i-lucide-rotate-ccw"
              color="warning"
              variant="ghost"
              size="xs"
              @click="openRecycle(row)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <UModal v-model:open="showDetailModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-wallet" class="size-5 text-primary" />
              <div>
                <p class="font-semibold text-highlighted">{{ selectedAccount.accountId }}</p>
                <p class="text-xs text-muted">{{ selectedAccount.accountName }}</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs text-muted uppercase mb-1">媒体</p>
              <UBadge :label="selectedAccount.media" variant="subtle" color="neutral" size="xs" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">渠道</p>
              <p class="text-highlighted">{{ selectedAccount.channelName }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">团队</p>
              <p class="text-highlighted">{{ selectedAccount.teamName ?? '未分配' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">成员</p>
              <p class="text-highlighted">{{ selectedAccount.memberName ?? '未分配' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">产品</p>
              <p class="text-highlighted">{{ selectedAccount.productName ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">产品类型</p>
              <UBadge
                v-if="selectedAccount.productType"
                :label="productTypeLabel(selectedAccount.productType)"
                :color="productTypeColor(selectedAccount.productType)"
                variant="subtle"
                size="xs"
              />
              <span v-else>-</span>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">资产状态</p>
              <UBadge :label="statusLabel(selectedAccount.assetStatus)" :color="statusColor(selectedAccount.assetStatus)" variant="subtle" size="xs" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">媒体状态</p>
              <UBadge :label="mediaStatusLabel(selectedAccount.mediaStatus)" :color="mediaStatusColor(selectedAccount.mediaStatus)" variant="subtle" size="xs" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">消耗</p>
              <p class="text-highlighted font-mono">${{ selectedAccount.consumed.toLocaleString() }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">使用天数</p>
              <p class="text-highlighted">{{ selectedAccount.usageDays }} 天</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">入库日期</p>
              <p class="text-highlighted">{{ new Date(selectedAccount.entryDate).toLocaleDateString('zh-CN') }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">最近消耗</p>
              <p class="text-highlighted">{{ selectedAccount.lastConsumedAt ? new Date(selectedAccount.lastConsumedAt).toLocaleDateString('zh-CN') : '无' }}</p>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton
                v-if="selectedAccount.isAllocated"
                label="转移"
                icon="i-lucide-arrow-right-left"
                color="info"
                variant="soft"
                @click="showDetailModal = false; openTransfer(selectedAccount!)"
              />
              <UButton
                v-if="selectedAccount.isAllocated"
                label="回收"
                icon="i-lucide-rotate-ccw"
                color="warning"
                variant="soft"
                @click="showDetailModal = false; openRecycle(selectedAccount!)"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showTransferModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-arrow-right-left" class="size-5 text-info" />
              <span class="font-semibold text-highlighted">转移账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.accountId }}</span>
              <span class="text-muted"> ({{ selectedAccount.accountName }})</span>
            </div>

            <div class="text-sm">
              <span class="text-muted">当前: </span>
              <span class="text-highlighted">{{ selectedAccount.teamName ?? '未分配' }}</span>
              <span v-if="selectedAccount.memberName" class="text-muted"> / {{ selectedAccount.memberName }}</span>
            </div>

            <USeparator />

            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="transferTargetTeamId"
                :items="teams?.map(t => ({ label: t.name, value: t.id })) ?? []"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>

            <UFormField label="目标成员" description="可选，不选则仅分配到团队。">
              <USelectMenu
                v-model="transferTargetMemberId"
                :items="targetTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!transferTargetTeamId"
              />
            </UFormField>

            <UFormField label="转移原因" required>
              <UTextarea
                v-model="transferReason"
                placeholder="请说明转移原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showTransferModal = false" />
              <UButton
                label="确认转移"
                icon="i-lucide-arrow-right-left"
                color="info"
                :disabled="!transferTargetTeamId || !transferReason.trim()"
                @click="confirmTransfer"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showRecycleModal">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-rotate-ccw" class="size-5 text-warning" />
              <span class="font-semibold text-highlighted">回收账户</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-lg bg-elevated p-3 text-sm">
              <p class="text-warning font-medium mb-1">确认回收此账户？</p>
              <p class="text-muted">回收后账户将回到待分配池，当前团队和成员绑定将被解除。</p>
            </div>

            <div class="text-sm">
              <span class="text-muted">账户: </span>
              <span class="font-mono text-highlighted">{{ selectedAccount.accountId }}</span>
              <span class="text-muted"> ({{ selectedAccount.accountName }})</span>
            </div>

            <div class="text-sm">
              <span class="text-muted">当前: </span>
              <span class="text-highlighted">{{ selectedAccount.teamName ?? '未分配' }}</span>
              <span v-if="selectedAccount.memberName" class="text-muted"> / {{ selectedAccount.memberName }}</span>
            </div>

            <UFormField label="回收原因" required>
              <UTextarea
                v-model="recycleReason"
                placeholder="请说明回收原因..."
                :rows="2"
                autoresize
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showRecycleModal = false" />
              <UButton
                label="确认回收"
                icon="i-lucide-rotate-ccw"
                color="warning"
                :disabled="!recycleReason.trim()"
                @click="confirmRecycle"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </UDashboardPanel>
</template>