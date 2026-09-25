<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { AdAccountListItem, ChannelAccountOrder } from '~/domain'
import type { SchedulingDemandItemRow } from '~/services'
import {
  accountService,
  alertService,
  demandService,
  mediaService,
  productService,
  teamService
} from '~/services'

useSeoMeta({ title: '需求调度' })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const { userId, member, canAllocateAccounts } = useCurrentUser()

const mediaPlatforms = await mediaService.getMediaPlatforms()
const products = await productService.getProducts()
const teams = await teamService.getTeams()
const members = await teamService.getMembers()

const pending = ref(true)
const allocating = ref(false)
const scheduleRows = ref<SchedulingDemandItemRow[]>([])
const selectedItemId = ref<string | null>(null)
const poolRows = ref<AdAccountListItem[]>([])
const selectedAccountIds = ref<string[]>([])
const poolPending = ref(false)
const memberId = ref<string | undefined>()
const managerId = ref<string | undefined>()
const showLostConfirm = ref(false)

const showOrderModal = ref(false)
const orderShortageRow = ref<SchedulingDemandItemRow | null>(null)

const demandStatusLabel: Record<string, string> = {
  SUBMITTED: '已提交',
  APPROVED: '已批准',
  PARTIALLY_ALLOCATED: '部分分配',
  FULFILLED: '已满足'
}

const mediaName = (id: string) => mediaPlatforms.find(item => item.id === id)?.name ?? id
const productName = (id: string | null | undefined) => {
  if (!id) return '—'
  const product = products.find(item => item.id === id)
  if (!product) return id
  return product.ownershipType === 'EXTERNAL' ? '外接' : '自家'
}
const teamName = (id: string) => teams.find(item => item.id === id)?.name ?? id

const selectedRow = computed(() =>
  scheduleRows.value.find(item => item.itemId === selectedItemId.value) ?? null
)

const teamMemberOptions = computed(() => {
  if (!selectedRow.value) return []
  return members
    .filter(item => item.teamId === selectedRow.value!.teamId)
    .map(item => ({ label: item.name, value: item.id }))
})

const managerOptions = computed(() =>
  members.map(item => ({ label: item.name, value: item.id }))
)

const lostSelected = computed(() =>
  poolRows.value.filter(item =>
    selectedAccountIds.value.includes(item.id) && item.apiAccessStatus === 'LOST'
  )
)

async function loadSchedule() {
  pending.value = true
  try {
    scheduleRows.value = await demandService.getSchedulingDemandItems()
    if (selectedItemId.value && !scheduleRows.value.some(r => r.itemId === selectedItemId.value)) {
      selectedItemId.value = null
      poolRows.value = []
      selectedAccountIds.value = []
    }
  } finally {
    pending.value = false
  }
}

async function loadMatchingPool(row: SchedulingDemandItemRow) {
  poolPending.value = true
  selectedAccountIds.value = []
  try {
    const result = await accountService.getAccountPool({
      mediaIds: [row.mediaId],
      timezone: row.timezone ?? undefined,
      page: 1,
      pageSize: 100
    })
    poolRows.value = result.data
  } finally {
    poolPending.value = false
  }
}

async function selectItem(row: SchedulingDemandItemRow) {
  selectedItemId.value = row.itemId
  memberId.value = undefined
  managerId.value = undefined
  await loadMatchingPool(row)
}

async function runAllocate() {
  if (!selectedItemId.value || !selectedAccountIds.value.length || !memberId.value || !managerId.value || allocating.value) return
  if (!canAllocateAccounts.value || !member.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  allocating.value = true
  try {
    const result = await demandService.allocate({
      demandItemId: selectedItemId.value,
      accountIds: selectedAccountIds.value,
      allocatedBy: member.value.id,
      memberId: memberId.value,
      managerId: managerId.value,
      reason: 'Demand scheduling allocate',
      actorUserId: userId.value
    })
    toast.add({
      title: '需求分配成功',
      description: `${result.assignmentIds.length} 户 → ${result.demand.demandNo}（${result.demand.status}）`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadSchedule()
    const row = scheduleRows.value.find(item => item.itemId === selectedItemId.value)
    if (row) await loadMatchingPool(row)
    else {
      poolRows.value = []
      selectedAccountIds.value = []
    }
  } catch (error) {
    toast.add({
      title: '分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    allocating.value = false
  }
}

async function allocateSelected() {
  if (!selectedItemId.value || !selectedAccountIds.value.length || allocating.value) return
  if (!memberId.value || !managerId.value) {
    toast.add({
      title: '请先选择成员和户管',
      color: 'warning',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  if (lostSelected.value.length) {
    showLostConfirm.value = true
    return
  }
  await runAllocate()
}

async function confirmLostAllocate() {
  showLostConfirm.value = false
  for (const account of lostSelected.value) {
    await alertService.reportCredentialLost(account.id)
  }
  await runAllocate()
}

function openShortageOrder() {
  if (!selectedRow.value || selectedRow.value.shortage <= 0) return
  orderShortageRow.value = selectedRow.value
  showOrderModal.value = true
}

function onOrderCreated(order: ChannelAccountOrder) {
  toast.add({
    title: '渠道订单已创建',
    description: `${order.orderNo} · ${order.status} · 可前往渠道 Orders 跟进交付`,
    icon: 'i-lucide-check',
    color: 'success'
  })
  void router.push(`/channels/${order.channelId}?tab=orders`)
}

function toggleAccount(id: string) {
  const set = new Set(selectedAccountIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedAccountIds.value = [...set]
}

function isSelected(id: string) {
  return selectedAccountIds.value.includes(id)
}

onMounted(async () => {
  await loadSchedule()
  const demandItemId = typeof route.query.demandItemId === 'string'
    ? route.query.demandItemId
    : null
  const openOrder = route.query.openOrder === '1' || route.query.openOrder === 'true'
  if (!demandItemId) return
  const row = scheduleRows.value.find(item => item.itemId === demandItemId)
  if (!row) return
  await selectItem(row)
  if (openOrder && row.shortage > 0) {
    orderShortageRow.value = row
    showOrderModal.value = true
  }
})

const demandColumns: TableColumn<SchedulingDemandItemRow>[] = [
  { accessorKey: 'demandNo', header: '需求号' },
  { id: 'team', header: '团队' },
  { id: 'status', header: '状态' },
  { id: 'media', header: '媒体' },
  { id: 'timezone', header: '时区' },
  { accessorKey: 'requestedQuantity', header: '申请' },
  { accessorKey: 'allocatedQuantity', header: '已分配' },
  { accessorKey: 'remainingQuantity', header: '剩余' },
  { accessorKey: 'poolMatchCount', header: '池匹配' },
  { id: 'shortage', header: '缺口' },
  { id: 'actions', header: '' }
]

const poolColumns: TableColumn<AdAccountListItem>[] = [
  { id: 'select', header: '' },
  { accessorKey: 'externalAccountId', header: '账户ID' },
  { id: 'media', header: '媒体' },
  { accessorKey: 'timezone', header: '时区' },
  { id: 'channel', header: '渠道' },
  { id: 'platformAsset', header: '管理资产' }
]

function demandCell(row: Row<SchedulingDemandItemRow>) {
  return row.original
}
function poolCell(row: Row<AdAccountListItem>) {
  return row.original
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            需求调度 · 分配来源：需求
          </h2>
          <p class="text-xs text-muted mt-1">
            系统按媒体 + 时区计算匹配池；管理员确认后分配。直接分配请在账户池操作。
          </p>
        </div>
        <UButton
          label="刷新"
          icon="i-lucide-refresh-cw"
          size="xs"
          color="neutral"
          variant="soft"
          :loading="pending"
          @click="loadSchedule"
        />
      </div>

      <div v-if="pending && !scheduleRows.length" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载待调度需求…
      </div>

      <div
        v-else-if="!scheduleRows.length"
        class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
      >
        <UIcon name="i-lucide-inbox" class="size-8" />
        <p>当前无待调度需求（已审批 / 部分分配）</p>
      </div>

      <template v-else>
        <div class="rounded-lg border border-default overflow-x-auto">
          <UTable :data="scheduleRows" :columns="demandColumns">
            <template #demandNo-cell="{ row }">
              <div>
                <p class="font-mono text-sm text-highlighted">
                  {{ demandCell(row).demandNo }}
                </p>
                <p class="text-xs text-muted">
                  {{ demandCell(row).priority }}
                </p>
              </div>
            </template>
            <template #team-cell="{ row }">
              {{ teamName(demandCell(row).teamId) }}
            </template>
            <template #status-cell="{ row }">
              <UBadge
                :label="demandStatusLabel[demandCell(row).status] ?? demandCell(row).status"
                variant="subtle"
                size="xs"
              />
            </template>
            <template #media-cell="{ row }">
              <UBadge :label="mediaName(demandCell(row).mediaId)" variant="subtle" color="neutral" size="xs" />
            </template>
            <template #timezone-cell="{ row }">
              <span class="text-xs">{{ demandCell(row).timezone ?? '—' }}</span>
            </template>
            <template #shortage-cell="{ row }">
              <div class="flex items-center gap-1">
                <span :class="demandCell(row).shortage > 0 ? 'text-warning font-medium' : ''">
                  {{ demandCell(row).shortage }}
                </span>
                <UBadge
                  v-if="demandCell(row).shortage > 0"
                  label="预警"
                  variant="subtle"
                  color="warning"
                  size="xs"
                />
              </div>
            </template>
            <template #actions-cell="{ row }">
              <UButton
                :label="selectedItemId === demandCell(row).itemId ? '已选' : '去分配'"
                size="xs"
                :variant="selectedItemId === demandCell(row).itemId ? 'solid' : 'soft'"
                :color="selectedItemId === demandCell(row).itemId ? 'primary' : 'neutral'"
                :disabled="demandCell(row).remainingQuantity <= 0"
                @click="selectItem(demandCell(row))"
              />
            </template>
          </UTable>
        </div>

        <div
          v-if="selectedRow"
          class="rounded-lg border border-default p-4 space-y-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-medium text-highlighted">
                匹配池 · {{ selectedRow.demandNo }}
              </h3>
              <p class="text-xs text-muted mt-0.5">
                {{ mediaName(selectedRow.mediaId) }}
                · {{ selectedRow.timezone ?? '任意时区' }}
                · 产品 {{ productName(selectedRow.productId) }}
                · 剩余 {{ selectedRow.remainingQuantity }}
                · 池匹配 {{ selectedRow.poolMatchCount }}
                · 缺口 {{ selectedRow.shortage }}
              </p>
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <UFormField label="成员" required class="min-w-36">
                <USelectMenu
                  v-model="memberId"
                  :items="teamMemberOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="团队成员"
                />
              </UFormField>
              <UFormField label="户管" required class="min-w-36">
                <USelectMenu
                  v-model="managerId"
                  :items="managerOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="户管"
                />
              </UFormField>
              <UButton
                v-if="selectedRow.shortage > 0"
                label="创建渠道订单"
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-truck"
                @click="openShortageOrder"
              />
              <UButton
                v-if="canAllocateAccounts"
                label="分配"
                size="xs"
                color="primary"
                icon="i-lucide-check-check"
                :loading="allocating"
                :disabled="!selectedAccountIds.length || !memberId || !managerId || selectedAccountIds.length > selectedRow.remainingQuantity"
                @click="allocateSelected"
              />
              <p
                v-else
                class="text-xs text-muted"
              >
                仅管理者 / 管理员可分配
              </p>
            </div>
          </div>

          <div v-if="poolPending" class="flex items-center gap-2 py-8 text-muted text-sm justify-center">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            计算可分配账户…
          </div>
          <div
            v-else-if="!poolRows.length"
            class="text-sm text-muted py-8 text-center"
          >
            无匹配库存。可创建渠道订单补库。
          </div>
          <UTable v-else :data="poolRows" :columns="poolColumns">
            <template #select-cell="{ row }">
              <UCheckbox
                :model-value="isSelected(poolCell(row).id)"
                @update:model-value="toggleAccount(poolCell(row).id)"
              />
            </template>
            <template #externalAccountId-cell="{ row }">
              <span class="font-mono text-sm">{{ poolCell(row).externalAccountId }}</span>
              <UBadge
                v-if="poolCell(row).apiAccessStatus === 'LOST'"
                label="已失效"
                color="warning"
                variant="subtle"
                size="xs"
                class="ms-2"
              />
            </template>
            <template #media-cell="{ row }">
              <UBadge :label="poolCell(row).media.name" variant="subtle" color="neutral" size="xs" />
            </template>
            <template #channel-cell="{ row }">
              {{ poolCell(row).channel.name }}
            </template>
            <template #platformAsset-cell="{ row }">
              <span v-if="poolCell(row).platformAsset" class="font-mono text-xs">
                {{ poolCell(row).platformAsset.typeName }} {{ poolCell(row).platformAsset.externalId }}
              </span>
              <span v-else>—</span>
            </template>
          </UTable>
          <p v-if="selectedAccountIds.length" class="text-xs text-muted">
            已选 {{ selectedAccountIds.length }} 户
            <span v-if="selectedRow && selectedAccountIds.length > selectedRow.remainingQuantity" class="text-error">
              （超过剩余 {{ selectedRow.remainingQuantity }}）
            </span>
          </p>
        </div>
      </template>
    </div>

    <ChannelsCreateChannelOrderModal
      v-model:open="showOrderModal"
      :shortage-row="orderShortageRow"
      @created="onOrderCreated"
    />

    <UModal v-model:open="showLostConfirm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-key-round" class="size-5 text-warning" />
              <span class="font-semibold text-highlighted">须重连 Credential</span>
            </div>
          </template>
          <div class="space-y-3 text-sm">
            <p class="text-muted">
              所选账户中有 {{ lostSelected.length }} 户 API 访问为 LOST。确认后仍会分配，并写入 Credential 预警。
            </p>
            <ul class="font-mono text-xs space-y-1">
              <li v-for="account in lostSelected" :key="account.id">
                {{ account.externalAccountId }}
              </li>
            </ul>
          </div>
          <template #footer>
            <div class="flex items-center gap-2 justify-end">
              <UButton label="取消" color="neutral" variant="ghost" @click="showLostConfirm = false" />
              <UButton
                label="确认并分配"
                color="warning"
                icon="i-lucide-check"
                @click="confirmLostAllocate"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
    </template>
  </UDashboardPanel>
</template>
