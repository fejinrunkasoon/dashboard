<script setup lang="ts">
import type {
  QualityGroupBy,
  QualityPivotQuery,
  QualityPivotResult,
  QualitySpendPeriod
} from '~/services'
import type { AccountAssetStatus } from '~/domain'
import {
  analyticsService,
  channelService,
  mediaService,
  productService,
  teamService
} from '~/services'
import { DEMAND_TIMEZONE_OPTIONS } from '~/domain'
import { formatCurrency } from '~/utils'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

useSeoMeta({ title: '账户分析' })

const route = useRoute()
const router = useRouter()

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
const channels = await channelService.getChannels()
const teams = await teamService.getTeams()
const members = await teamService.getMembers()
const products = await productService.getProducts()

const groupByOptions: { label: string, value: QualityGroupBy }[] = [
  { label: '媒体', value: 'media' },
  { label: '渠道', value: 'channel' },
  { label: '时区', value: 'timezone' },
  { label: '团队', value: 'team' },
  { label: '成员', value: 'member' },
  { label: '账户经理', value: 'manager' },
  { label: '产品', value: 'product' },
  { label: '资产状态', value: 'assetStatus' }
]

const mediaFilterOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(item => ({ label: item.name, value: item.id }))
]

const channelFilterOptions = [
  { label: '全部渠道', value: 'all' },
  ...channels.map(item => ({ label: item.name, value: item.id }))
]

const teamFilterOptions = [
  { label: '全部团队', value: 'all' },
  ...teams.map(item => ({ label: item.name, value: item.id }))
]

const memberFilterOptions = [
  { label: '全部成员', value: 'all' },
  ...members.map(item => ({ label: item.name, value: item.id }))
]

const productFilterOptions = [
  { label: '全部产品', value: 'all' },
  ...products.map(item => ({ label: item.name, value: item.id }))
]

const assetStatusOptions = [
  { label: '全部资产状态', value: 'all' },
  { label: '可用', value: 'AVAILABLE' },
  { label: '已分配', value: 'ASSIGNED' },
  { label: '使用中', value: 'IN_USE' },
  { label: '闲置', value: 'IDLE' },
  { label: '停用', value: 'DISABLED' },
  { label: '归档', value: 'ARCHIVED' }
]

const timezoneOptions = [
  { label: '全部时区', value: 'all' },
  ...DEMAND_TIMEZONE_OPTIONS
]

function asArray(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return String(value).split(',').map(part => part.trim()).filter(Boolean)
}

const GROUP_BYS = new Set<QualityGroupBy>(groupByOptions.map(item => item.value))
const PERIODS = new Set<QualitySpendPeriod>(['TODAY', '7D', '30D', 'CUSTOM'])

const query = computed<QualityPivotQuery>(() => {
  const q = route.query
  const groupBy = typeof q.groupBy === 'string' && GROUP_BYS.has(q.groupBy as QualityGroupBy)
    ? q.groupBy as QualityGroupBy
    : 'channel'
  const spendPeriod = typeof q.spendPeriod === 'string' && PERIODS.has(q.spendPeriod as QualitySpendPeriod)
    ? q.spendPeriod as QualitySpendPeriod
    : '30D'
  const sortBy = typeof q.sortBy === 'string' ? q.sortBy as QualityPivotQuery['sortBy'] : undefined
  const spendFrom = typeof q.spendFrom === 'string' ? q.spendFrom : undefined
  const spendTo = typeof q.spendTo === 'string' ? q.spendTo : undefined

  return {
    groupBy,
    spendPeriod,
    spendRange: spendPeriod === 'CUSTOM' && spendFrom && spendTo
      ? { from: spendFrom, to: spendTo }
      : undefined,
    sortBy,
    sortOrder: q.sortOrder === 'asc' ? 'asc' : 'desc',
    mediaIds: asArray(q.mediaIds).length ? asArray(q.mediaIds) : undefined,
    channelIds: asArray(q.channelIds).length ? asArray(q.channelIds) : undefined,
    teamIds: asArray(q.teamIds).length ? asArray(q.teamIds) : undefined,
    memberIds: asArray(q.memberIds).length ? asArray(q.memberIds) : undefined,
    managerIds: asArray(q.managerIds).length ? asArray(q.managerIds) : undefined,
    productIds: asArray(q.productIds).length ? asArray(q.productIds) : undefined,
    assetStatuses: asArray(q.assetStatuses).length
      ? asArray(q.assetStatuses) as AccountAssetStatus[]
      : undefined,
    timezone: typeof q.timezone === 'string' && q.timezone ? q.timezone : undefined
  }
})

async function setQuery(patch: Partial<QualityPivotQuery> & {
  sortBy?: string
  sortOrder?: string
  spendFrom?: string
  spendTo?: string
}) {
  const next = { ...query.value, ...patch }
  const routeQuery: Record<string, string | string[]> = {
    groupBy: next.groupBy,
    spendPeriod: next.spendPeriod ?? '30D'
  }
  if (next.spendPeriod === 'CUSTOM') {
    const from = patch.spendFrom ?? next.spendRange?.from
    const to = patch.spendTo ?? next.spendRange?.to
    if (from) routeQuery.spendFrom = from
    if (to) routeQuery.spendTo = to
  }
  if (next.sortBy) routeQuery.sortBy = next.sortBy
  if (next.sortOrder && next.sortOrder !== 'desc') routeQuery.sortOrder = next.sortOrder
  if (next.mediaIds?.length) routeQuery.mediaIds = next.mediaIds
  if (next.channelIds?.length) routeQuery.channelIds = next.channelIds
  if (next.teamIds?.length) routeQuery.teamIds = next.teamIds
  if (next.memberIds?.length) routeQuery.memberIds = next.memberIds
  if (next.managerIds?.length) routeQuery.managerIds = next.managerIds
  if (next.productIds?.length) routeQuery.productIds = next.productIds
  if (next.assetStatuses?.length) routeQuery.assetStatuses = next.assetStatuses
  if (next.timezone) routeQuery.timezone = next.timezone
  await router.replace({ query: routeQuery })
}

const groupBy = computed({
  get: () => query.value.groupBy,
  set: (value: QualityGroupBy) => { void setQuery({ groupBy: value }) }
})

const spendPeriod = computed({
  get: () => query.value.spendPeriod ?? '30D',
  set: (value: QualitySpendPeriod) => {
    if (value === 'CUSTOM') {
      void setQuery({
        spendPeriod: value,
        spendFrom: query.value.spendRange?.from ?? shiftDate(MOCK_TODAY, -6),
        spendTo: query.value.spendRange?.to ?? MOCK_TODAY
      })
      return
    }
    void setQuery({ spendPeriod: value })
  }
})

const customFrom = computed({
  get: () => query.value.spendRange?.from ?? shiftDate(MOCK_TODAY, -6),
  set: (value: string | undefined) => {
    if (spendPeriod.value !== 'CUSTOM' || !value) return
    void setQuery({
      spendPeriod: 'CUSTOM',
      spendFrom: value,
      spendTo: query.value.spendRange?.to ?? MOCK_TODAY
    })
  }
})

const customTo = computed({
  get: () => query.value.spendRange?.to ?? MOCK_TODAY,
  set: (value: string | undefined) => {
    if (spendPeriod.value !== 'CUSTOM' || !value) return
    void setQuery({
      spendPeriod: 'CUSTOM',
      spendFrom: query.value.spendRange?.from ?? shiftDate(MOCK_TODAY, -6),
      spendTo: value
    })
  }
})

const quickMedia = computed({
  get: () => query.value.mediaIds?.[0] ?? 'all',
  set: (value: string) => {
    void setQuery({ mediaIds: value === 'all' ? undefined : [value] })
  }
})

const quickChannel = computed({
  get: () => query.value.channelIds?.[0] ?? 'all',
  set: (value: string) => {
    void setQuery({ channelIds: value === 'all' ? undefined : [value] })
  }
})

const advancedOpen = ref(false)
const draftTeam = ref('all')
const draftMember = ref('all')
const draftManager = ref('all')
const draftProduct = ref('all')
const draftAssetStatus = ref('all')
const draftTimezone = ref('all')

watch(advancedOpen, (open) => {
  if (!open) return
  draftTeam.value = query.value.teamIds?.[0] ?? 'all'
  draftMember.value = query.value.memberIds?.[0] ?? 'all'
  draftManager.value = query.value.managerIds?.[0] ?? 'all'
  draftProduct.value = query.value.productIds?.[0] ?? 'all'
  draftAssetStatus.value = query.value.assetStatuses?.[0] ?? 'all'
  draftTimezone.value = query.value.timezone ?? 'all'
})

function oneOrNone(value: string) {
  return value === 'all' ? undefined : [value]
}

function applyAdvanced() {
  void setQuery({
    teamIds: oneOrNone(draftTeam.value),
    memberIds: oneOrNone(draftMember.value),
    managerIds: oneOrNone(draftManager.value),
    productIds: oneOrNone(draftProduct.value),
    assetStatuses: draftAssetStatus.value === 'all'
      ? undefined
      : [draftAssetStatus.value as AccountAssetStatus],
    timezone: draftTimezone.value === 'all' ? undefined : draftTimezone.value
  })
}

function resetAdvanced() {
  draftTeam.value = 'all'
  draftMember.value = 'all'
  draftManager.value = 'all'
  draftProduct.value = 'all'
  draftAssetStatus.value = 'all'
  draftTimezone.value = 'all'
  void setQuery({
    teamIds: undefined,
    memberIds: undefined,
    managerIds: undefined,
    productIds: undefined,
    assetStatuses: undefined,
    timezone: undefined
  })
}

const filterChips = computed(() => {
  const chips: { key: string, label: string }[] = []
  const q = query.value
  if (q.mediaIds?.length) chips.push({ key: 'mediaIds', label: `媒体: ${q.mediaIds.length}` })
  if (q.channelIds?.length) chips.push({ key: 'channelIds', label: `渠道: ${q.channelIds.length}` })
  if (q.teamIds?.length) chips.push({ key: 'teamIds', label: `团队: ${q.teamIds.length}` })
  if (q.memberIds?.length) chips.push({ key: 'memberIds', label: `成员: ${q.memberIds.length}` })
  if (q.managerIds?.length) chips.push({ key: 'managerIds', label: `户管: ${q.managerIds.length}` })
  if (q.productIds?.length) chips.push({ key: 'productIds', label: `产品: ${q.productIds.length}` })
  if (q.assetStatuses?.length) chips.push({ key: 'assetStatuses', label: `资产状态: ${q.assetStatuses.join(',')}` })
  if (q.timezone) chips.push({ key: 'timezone', label: `时区: ${q.timezone}` })
  return chips
})

function removeAnalyticsFilter(key: string) {
  void setQuery({ [key]: undefined } as Partial<QualityPivotQuery>)
}

function clearAnalyticsFilters() {
  void setQuery({
    mediaIds: undefined,
    channelIds: undefined,
    teamIds: undefined,
    memberIds: undefined,
    managerIds: undefined,
    productIds: undefined,
    assetStatuses: undefined,
    timezone: undefined
  })
}

const dimensionHeader = computed(() =>
  groupByOptions.find(item => item.value === query.value.groupBy)?.label ?? 'Dimension'
)

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const result = ref<QualityPivotResult | null>(null)

async function load() {
  pending.value = true
  errorMessage.value = null
  try {
    result.value = await analyticsService.getQualityPivot({ ...query.value })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败'
    result.value = null
  } finally {
    pending.value = false
  }
}

watch(
  () => query.value,
  () => { void load() },
  { immediate: true, deep: true }
)

function applyPreset(kind: 'channel-ban' | 'media-spend') {
  if (kind === 'channel-ban') {
    void setQuery({ groupBy: 'channel', sortBy: 'banRate', sortOrder: 'desc' })
  } else {
    void setQuery({ groupBy: 'media', sortBy: 'spend', sortOrder: 'desc' })
  }
}

const exportColumns = [
  { key: 'label', header: '维度' },
  { key: 'accountCount', header: '账户' },
  { key: 'activeValidCount', header: '有效活跃' },
  { key: 'inUseCount', header: '使用中' },
  { key: 'idleCount', header: '闲置' },
  { key: 'bannedCount', header: '封禁' },
  { key: 'banRate', header: '封禁率' },
  { key: 'usageRate', header: '使用率' },
  { key: 'spend', header: '消耗' }
]

async function getExportRows() {
  const pivot = result.value ?? await analyticsService.getQualityPivot({ ...query.value })
  return pivot.rows.map(row => ({
    label: row.label,
    accountCount: row.accountCount,
    activeValidCount: row.activeValidCount,
    inUseCount: row.inUseCount,
    idleCount: row.idleCount,
    bannedCount: row.bannedCount,
    banRate: row.banRate,
    usageRate: row.usageRate,
    spend: row.spend
  }))
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户分析" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            v-if="result"
            :label="`账户 ${result.meta.totalAccounts}`"
            variant="subtle"
            color="primary"
          />
          <UBadge
            v-if="result"
            :label="`消耗 ${formatCurrency(result.meta.totalSpend)}`"
            variant="subtle"
            color="neutral"
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
          <FiltersQuickFilter v-model="groupBy" label="行维度" :options="groupByOptions" />
          <FiltersPeriodFilter
            v-model="spendPeriod"
            v-model:custom-from="customFrom"
            v-model:custom-to="customTo"
            label="周期"
          />
          <FiltersQuickFilter v-model="quickMedia" label="媒体" :options="mediaFilterOptions" />
          <FiltersQuickFilter v-model="quickChannel" label="渠道" :options="channelFilterOptions" />
          <FiltersExportFilteredButton
            filename-prefix="account-analytics"
            :columns="exportColumns"
            :get-rows="getExportRows"
          />
        </div>

        <FiltersActiveFilterChips
          :chips="filterChips"
          @remove="removeAnalyticsFilter"
          @clear="clearAnalyticsFilters"
        />

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted">预置视图</span>
          <UButton
            label="按渠道封禁率"
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyPreset('channel-ban')"
          />
          <UButton
            label="按媒体消耗"
            size="xs"
            color="neutral"
            variant="soft"
            @click="applyPreset('media-spend')"
          />
        </div>

        <p class="text-xs text-muted">
          质量透视：账户为事实粒度；消耗仅为媒体消耗（不含服务费）。图表与表格随筛选同步；点击图表或「查看账户」下钻账户列表。
        </p>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="load" />
        </div>

        <template v-else>
          <div class="grid gap-4 lg:grid-cols-2">
            <AnalyticsQualityBanRateChart
              :rows="result?.rows ?? []"
              :group-by="query.groupBy"
              :dimension-header="dimensionHeader"
              :pending="pending"
            />
            <AnalyticsQualitySpendDistributionChart
              :rows="result?.rows ?? []"
              :group-by="query.groupBy"
              :dimension-header="dimensionHeader"
              :pending="pending"
            />
          </div>

          <AnalyticsQualityAccountStructureChart
            :rows="result?.rows ?? []"
            :group-by="query.groupBy"
            :dimension-header="dimensionHeader"
            :pending="pending"
          />

          <AnalyticsQualityPivotTable
            :rows="result?.rows ?? []"
            :group-by="query.groupBy"
            :pending="pending"
            :dimension-header="dimensionHeader"
          />
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <FiltersAdvancedFilterShell
    v-model:open="advancedOpen"
    @apply="applyAdvanced"
    @reset="resetAdvanced"
  >
    <UFormField label="团队">
      <USelect v-model="draftTeam" :items="teamFilterOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
    <UFormField label="成员">
      <USelect v-model="draftMember" :items="memberFilterOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
    <UFormField label="户管">
      <USelect v-model="draftManager" :items="memberFilterOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
    <UFormField label="产品">
      <USelect v-model="draftProduct" :items="productFilterOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
    <UFormField label="资产状态">
      <USelect v-model="draftAssetStatus" :items="assetStatusOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
    <UFormField label="时区">
      <USelect v-model="draftTimezone" :items="timezoneOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
  </FiltersAdvancedFilterShell>
</template>
