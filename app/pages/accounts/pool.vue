<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type {
  AccountDemand,
  AccountDemandItem,
  AccountPoolStats,
  AdAccountListItem
} from '~/domain'
import { DEMAND_TIMEZONE_OPTIONS } from '~/domain'
import { MEDIA_STATUS_LABEL, API_ACCESS_STATUS_LABEL, labelOf } from '~/utils/labels'
import {
  accountService,
  channelService,
  demandService,
  mediaService,
  productService,
  teamService
} from '~/services'

useSeoMeta({ title: '账户池' })

const toast = useToast()

const { userId, member, canAllocateAccounts } = useCurrentUser()

const { query, activeChips, setFilters, clearFilters, removeFilter } = useAccountFilters({
  page: 1,
  pageSize: 20
})

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
const channels = await channelService.getChannels()
const teams = await teamService.getTeams()
const members = await teamService.getMembers()
const products = await productService.getProducts()

const mediaFilterOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
]

const timezoneOptions = [
  { label: '全部时区', value: 'all' },
  ...DEMAND_TIMEZONE_OPTIONS
]

const keyword = computed({
  get: () => query.value.keyword ?? '',
  set: (value: string) => { void setFilters({ keyword: value || undefined }) }
})

const quickMedia = computed({
  get: () => query.value.mediaIds?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ mediaIds: value === 'all' ? undefined : [value] })
  }
})

const quickTimezone = computed({
  get: () => query.value.timezone ?? 'all',
  set: (value: string) => {
    void setFilters({ timezone: value === 'all' ? undefined : value })
  }
})

const quickChannel = computed({
  get: () => query.value.channelIds?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({ channelIds: value === 'all' ? undefined : [value] })
  }
})

const apiOptions = [
  { label: '全部 API', value: 'all' },
  { label: '可访问', value: 'ACCESSIBLE' },
  { label: '已失效', value: 'LOST' },
  { label: '未知', value: 'UNKNOWN' }
]

const mediaStatusOptions = [
  { label: '全部媒体状态', value: 'all' },
  { label: '正常', value: 'ACTIVE' },
  { label: '受限', value: 'RESTRICTED' },
  { label: '停用', value: 'DISABLED' },
  { label: '封禁', value: 'BANNED' },
  { label: '未知', value: 'UNKNOWN' }
]

const quickApi = computed({
  get: () => query.value.apiAccessStatuses?.[0] ?? 'all',
  set: (value: string) => {
    void setFilters({
      apiAccessStatuses: value === 'all' ? undefined : [value as 'ACCESSIBLE' | 'LOST' | 'UNKNOWN']
    })
  }
})

const advancedOpen = ref(false)
const draftMediaStatus = ref('all')

watch(advancedOpen, (open) => {
  if (open) draftMediaStatus.value = query.value.mediaStatuses?.[0] ?? 'all'
})

function applyAdvanced() {
  void setFilters({
    mediaStatuses: draftMediaStatus.value === 'all'
      ? undefined
      : [draftMediaStatus.value as 'ACTIVE' | 'RESTRICTED' | 'DISABLED' | 'BANNED' | 'UNKNOWN']
  })
}

function resetAdvanced() {
  draftMediaStatus.value = 'all'
  void setFilters({ mediaStatuses: undefined })
}

const channelFilterOptions = [
  { label: '全部渠道', value: 'all' },
  ...channels.map(item => ({ label: item.name, value: item.id }))
]

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const rows = ref<AdAccountListItem[]>([])
const poolStats = ref<AccountPoolStats | null>(null)
const total = ref(0)

async function loadPool() {
  pending.value = true
  errorMessage.value = null
  try {
    const listQuery = { ...query.value }
    const [list, stats] = await Promise.all([
      accountService.getAccountPool(listQuery),
      accountService.getAccountPoolStats(listQuery)
    ])
    rows.value = list.data
    total.value = list.pagination.total
    poolStats.value = stats
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载账户池失败'
    rows.value = []
    poolStats.value = null
  } finally {
    pending.value = false
  }
}

watch(
  () => query.value,
  () => { void loadPool() },
  { immediate: true, deep: true }
)

const page = computed({
  get: () => query.value.page ?? 1,
  set: (value: number) => { void setFilters({ page: value }, { resetPage: false }) }
})

const mediaName = (mediaId: string) =>
  mediaPlatforms.find(item => item.id === mediaId)?.name ?? mediaId

const selectedAccount = ref<AdAccountListItem | null>(null)
const showDirectAssign = ref(false)
const showDemandAssign = ref(false)
const transferTargetTeamId = ref<string | undefined>()
const transferTargetMemberId = ref<string | undefined>()
const assignManagerId = ref<string | undefined>()
const assignProductId = ref<string | undefined>()
const assignReason = ref('')

const openDemands = ref<AccountDemand[]>([])
const demandItems = ref<AccountDemandItem[]>([])
const selectedDemandId = ref<string | undefined>()
const selectedDemandItemId = ref<string | undefined>()

const targetTeamMembers = computed(() => {
  if (!transferTargetTeamId.value) return []
  return members.filter(item => item.teamId === transferTargetTeamId.value)
})

const managerOptions = computed(() =>
  members.map(item => ({ label: item.name, value: item.id }))
)

const productOptions = computed(() =>
  products.map(item => ({
    label: item.ownershipType === 'EXTERNAL' ? `${item.name} · 外接` : `${item.name} · 自家`,
    value: item.id
  }))
)

const canConfirmDirectAssign = computed(() =>
  Boolean(
    transferTargetTeamId.value
    && transferTargetMemberId.value
    && assignManagerId.value
    && assignProductId.value
    && assignReason.value.trim()
  )
)

watch(transferTargetTeamId, () => {
  transferTargetMemberId.value = undefined
})

const selectedDemandItems = computed(() => {
  if (!selectedDemandId.value) return []
  return demandItems.value.filter(item => item.demandId === selectedDemandId.value)
})

function openDetail(account: AdAccountListItem) {
  void navigateTo(`/accounts/${account.id}`)
}

async function openDirectAssign(account: AdAccountListItem) {
  if (!canAllocateAccounts.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'warning',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  selectedAccount.value = account
  transferTargetTeamId.value = undefined
  transferTargetMemberId.value = undefined
  assignManagerId.value = undefined
  assignProductId.value = undefined
  assignReason.value = ''
  showDirectAssign.value = true
}

async function openDemandAssign(account: AdAccountListItem) {
  if (!canAllocateAccounts.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'warning',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  selectedAccount.value = account
  selectedDemandId.value = undefined
  selectedDemandItemId.value = undefined
  assignReason.value = ''
  const result = await demandService.getDemands({
    statuses: ['SUBMITTED', 'APPROVED', 'PARTIALLY_ALLOCATED'],
    page: 1,
    pageSize: 50
  })
  const itemLists = await Promise.all(
    result.data.map(demand => demandService.getDemandItems(demand.id))
  )
  const flat = itemLists.flat()
  const matchingItems = flat.filter((item) => {
    if (item.mediaId !== account.media.id) return false
    const tz = item.requirements?.timezone
    if (typeof tz === 'string' && tz && account.timezone && tz !== account.timezone) return false
    return true
  })
  demandItems.value = matchingItems
  const demandIds = new Set(matchingItems.map(item => item.demandId))
  openDemands.value = result.data.filter(item => demandIds.has(item.id))
  showDemandAssign.value = true
}

async function confirmDirectAssign() {
  if (
    !selectedAccount.value
    || !transferTargetTeamId.value
    || !transferTargetMemberId.value
    || !assignManagerId.value
    || !assignProductId.value
    || !assignReason.value.trim()
  ) return
  if (!canAllocateAccounts.value || !member.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  const account = selectedAccount.value
  const team = teams.find(item => item.id === transferTargetTeamId.value)
  const targetMember = members.find(item => item.id === transferTargetMemberId.value)
  try {
    await accountService.assignDirect({
      accountIds: [account.id],
      teamId: transferTargetTeamId.value,
      memberId: transferTargetMemberId.value,
      managerId: assignManagerId.value,
      productId: assignProductId.value,
      reason: assignReason.value.trim(),
      createdBy: member.value.id,
      actorUserId: userId.value
    })
    showDirectAssign.value = false
    toast.add({
      title: '直接分配成功',
      description: `${account.externalAccountId} → ${team?.name ?? ''}${targetMember ? ` / ${targetMember.name}` : ''}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadPool()
  } catch (error) {
    toast.add({
      title: '直接分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmDemandAssign() {
  if (!selectedAccount.value || !selectedDemandItemId.value || !assignReason.value.trim()) return
  if (!canAllocateAccounts.value || !member.value) {
    toast.add({
      title: '无分配权限',
      description: '仅 PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER 可分配账户',
      color: 'error',
      icon: 'i-lucide-shield-alert'
    })
    return
  }
  const account = selectedAccount.value
  const demand = openDemands.value.find(item => item.id === selectedDemandId.value)
  if (!demand) return
  const teamMembers = members.filter(item => item.teamId === demand.teamId)
  const team = teams.find(item => item.id === demand.teamId)
  const defaultMemberId = team?.leaderMemberId ?? teamMembers[0]?.id
  const defaultManagerId = team?.leaderMemberId ?? teamMembers[0]?.id
  if (!defaultMemberId || !defaultManagerId) {
    toast.add({
      title: '需求分配失败',
      description: '目标团队没有可用成员/负责人',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  try {
    const result = await demandService.allocate({
      demandItemId: selectedDemandItemId.value,
      accountIds: [account.id],
      allocatedBy: member.value.id,
      memberId: defaultMemberId,
      managerId: defaultManagerId,
      reason: assignReason.value.trim(),
      actorUserId: userId.value
    })
    showDemandAssign.value = false
    toast.add({
      title: '需求分配成功',
      description: `${account.externalAccountId} → ${demand.demandNo ?? result.demand.demandNo}（${result.demand.status}）`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await loadPool()
  } catch (error) {
    toast.add({
      title: '需求分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

const columns: TableColumn<AdAccountListItem>[] = [{
  accessorKey: 'externalAccountId',
  header: '账户ID'
}, {
  accessorKey: 'media',
  header: '媒体'
}, {
  accessorKey: 'channel',
  header: '渠道'
}, {
  id: 'platformAsset',
  header: '管理资产'
}, {
  accessorKey: 'timezone',
  header: '时区'
}, {
  accessorKey: 'mediaStatus',
  header: '媒体状态'
}, {
  accessorKey: 'apiAccessStatus',
  header: 'API 状态'
}, {
  id: 'receivedAt',
  header: '入库'
}, {
  id: 'actions',
  header: '操作'
}]

function cellAccount(row: Row<AdAccountListItem>): AdAccountListItem {
  return row.original
}

const exportColumns = [
  { key: 'externalAccountId', header: '账户ID' },
  { key: 'accountName', header: '名称' },
  { key: 'media', header: '媒体' },
  { key: 'channel', header: '渠道' },
  { key: 'timezone', header: '时区' },
  { key: 'mediaStatus', header: '媒体状态' },
  { key: 'apiAccessStatus', header: 'API 状态' },
  { key: 'receivedAt', header: '入库' }
]

async function getExportRows() {
  const list = await accountService.getAccountPool({
    ...query.value,
    page: 1,
    pageSize: 5000
  })
  return list.data.map(item => ({
    externalAccountId: item.externalAccountId,
    accountName: item.accountName ?? '',
    media: item.media?.name ?? '',
    channel: item.channel?.name ?? '',
    timezone: item.timezone ?? '',
    mediaStatus: item.mediaStatus,
    apiAccessStatus: item.apiAccessStatus,
    receivedAt: item.receivedAt ?? ''
  }))
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <FiltersEntitySearch
            v-model="keyword"
            placeholder="搜索账户 ID / 名称 / BM·MCC ID"
            class="w-48 lg:w-64"
          />
          <UButton
            icon="i-lucide-sliders-horizontal"
            color="neutral"
            variant="ghost"
            label="高级筛选"
            @click="advancedOpen = true"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <FiltersQuickFilter v-model="quickMedia" label="媒体" :options="mediaFilterOptions" />
        <FiltersQuickFilter v-model="quickChannel" label="渠道" :options="channelFilterOptions" />
        <FiltersQuickFilter v-model="quickTimezone" label="时区" :options="timezoneOptions" />
        <FiltersQuickFilter v-model="quickApi" label="API" :options="apiOptions" />
        <UBadge
          v-if="poolStats"
          :label="`池内 ${poolStats.total}`"
          variant="subtle"
          color="primary"
        />
        <UBadge
          v-for="(count, mediaId) in poolStats?.byMedia ?? {}"
          :key="mediaId"
          :label="`${mediaName(String(mediaId))} ${count}`"
          variant="subtle"
          color="neutral"
        />
        <FiltersExportFilteredButton
          filename-prefix="account-pool"
          :columns="exportColumns"
          :get-rows="getExportRows"
        />
      </div>

      <FiltersActiveFilterChips
        :chips="activeChips"
        @remove="removeFilter"
        @clear="clearFilters"
      />

      <p class="text-xs text-muted">
        账户池是动态视图：状态为可用、无当前分配、媒体状态正常。非手工维护的池列表。
      </p>

      <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {{ errorMessage }}
        <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadPool" />
      </div>

      <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载账户池…
      </div>

      <div
        v-else-if="!rows.length"
        class="flex flex-col items-center justify-center gap-2 py-16 text-muted text-sm"
      >
        <UIcon name="i-lucide-inbox" class="size-8" />
        <p>当前无可用库存</p>
        <p class="text-xs">
          库存不足时可在后续阶段创建渠道下户单。
        </p>
        <UButton
          v-if="activeChips.length"
          size="xs"
          variant="soft"
          label="清除筛选"
          @click="clearFilters"
        />
      </div>

      <template v-else>
        <UTable :data="rows" :columns="columns">
          <template #externalAccountId-cell="{ row }">
            <div class="min-w-36">
              <NuxtLink
                :to="`/accounts/${cellAccount(row).id}`"
                class="font-mono text-sm text-highlighted hover:text-primary hover:underline transition-colors"
              >
                {{ cellAccount(row).externalAccountId }}
              </NuxtLink>
              <p class="text-xs text-muted truncate">
                {{ cellAccount(row).accountName ?? '—' }}
              </p>
            </div>
          </template>

          <template #media-cell="{ row }">
            <UBadge :label="cellAccount(row).media.name" variant="subtle" color="neutral" size="xs" />
          </template>

          <template #channel-cell="{ row }">
            <NuxtLink
              :to="`/channels/${cellAccount(row).channel.id}`"
              class="text-highlighted hover:text-primary hover:underline transition-colors"
            >
              {{ cellAccount(row).channel.name }}
            </NuxtLink>
          </template>

          <template #platformAsset-cell="{ row }">
            <span v-if="cellAccount(row).platformAsset" class="font-mono text-xs">
              {{ cellAccount(row).platformAsset!.typeName }}
              {{ cellAccount(row).platformAsset!.externalId }}
            </span>
            <span v-else>—</span>
          </template>

          <template #timezone-cell="{ row }">
            <span class="text-xs">{{ cellAccount(row).timezone ?? '—' }}</span>
          </template>

          <template #mediaStatus-cell="{ row }">
            <UBadge :label="labelOf(MEDIA_STATUS_LABEL, cellAccount(row).mediaStatus)" variant="subtle" color="success" size="xs" />
          </template>

          <template #apiAccessStatus-cell="{ row }">
            <span class="text-xs">{{ labelOf(API_ACCESS_STATUS_LABEL, cellAccount(row).apiAccessStatus) }}</span>
          </template>

          <template #receivedAt-cell="{ row }">
            <span class="text-xs">{{ cellAccount(row).receivedAt ?? '—' }}</span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1 flex-wrap">
              <UButton
                v-if="canAllocateAccounts"
                label="直接分配"
                icon="i-lucide-user-plus"
                color="info"
                variant="ghost"
                size="xs"
                @click="openDirectAssign(cellAccount(row))"
              />
              <UButton
                v-if="canAllocateAccounts"
                label="分配给需求"
                icon="i-lucide-link"
                color="primary"
                variant="ghost"
                size="xs"
                @click="openDemandAssign(cellAccount(row))"
              />
              <UButton
                label="详情"
                icon="i-lucide-eye"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="openDetail(cellAccount(row))"
              />
            </div>
          </template>
        </UTable>

        <div class="flex justify-end">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="query.pageSize ?? 20"
            :sibling-count="1"
          />
        </div>
      </template>
    </div>

    <UModal v-model:open="showDirectAssign">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <span class="font-semibold">直接分配</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted rounded-lg bg-elevated p-3">
              分配来源：直接分配 — 写入团队/成员/户管/产品分配记录，不创建需求。
            </p>
            <div class="text-sm font-mono">
              {{ selectedAccount.externalAccountId }}
            </div>
            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="transferTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择团队"
              />
            </UFormField>
            <UFormField label="目标成员" required>
              <USelectMenu
                v-model="transferTargetMemberId"
                :items="targetTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择成员"
                :disabled="!transferTargetTeamId"
              />
            </UFormField>
            <UFormField label="户管" required>
              <USelectMenu
                v-model="assignManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>
            <UFormField label="产品" required>
              <USelectMenu
                v-model="assignProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>
            <UFormField label="原因" required>
              <UTextarea v-model="assignReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showDirectAssign = false" />
              <UButton
                label="确认分配"
                color="info"
                :disabled="!canConfirmDirectAssign"
                @click="confirmDirectAssign"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showDemandAssign">
      <template #content>
        <UCard v-if="selectedAccount">
          <template #header>
            <span class="font-semibold">分配给需求</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted rounded-lg bg-elevated p-3">
              分配来源：需求 — 写入需求分配与分配记录。也可在「需求调度」工作台操作。
            </p>
            <div class="text-sm font-mono">
              {{ selectedAccount.externalAccountId }} · {{ selectedAccount.media.name }}
            </div>
            <UFormField label="需求" required>
              <USelectMenu
                v-model="selectedDemandId"
                :items="openDemands.map(d => ({ label: `${d.demandNo}`, value: d.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择开放需求（已匹配媒体/时区）"
                @update:model-value="selectedDemandItemId = undefined"
              />
            </UFormField>
            <UFormField label="需求明细" required>
              <USelectMenu
                v-model="selectedDemandItemId"
                :items="selectedDemandItems.map(i => ({
                  label: `${i.id} · media ${i.mediaId} · qty ${i.approvedQuantity}`,
                  value: i.id
                }))"
                value-key="value"
                label-key="label"
                placeholder="选择需求行"
                :disabled="!selectedDemandId"
              />
            </UFormField>
            <UFormField label="原因" required>
              <UTextarea v-model="assignReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showDemandAssign = false" />
              <UButton
                label="确认挂接"
                color="primary"
                :disabled="!selectedDemandItemId || !assignReason.trim()"
                @click="confirmDemandAssign"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
    </template>
  </UDashboardPanel>

  <FiltersAdvancedFilterShell
    v-model:open="advancedOpen"
    @apply="applyAdvanced"
    @reset="resetAdvanced"
  >
    <UFormField label="媒体状态">
      <USelect
        v-model="draftMediaStatus"
        :items="mediaStatusOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
