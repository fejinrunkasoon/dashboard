<script setup lang="ts">
import { differenceInCalendarDays } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import type { DashboardOverviewBundle } from '~/services'
import { dashboardService } from '~/services'
import { MOCK_TODAY, parseDate } from '~/utils/spend-aggregation'

useSeoMeta({ title: '运营总览' })

const { isNotificationsSlideoverOpen } = useDashboard()

const items = [[{
  label: '查看预警',
  icon: 'i-lucide-bell-ring',
  to: '/alerts'
}, {
  label: '账户中心',
  icon: 'i-lucide-wallet',
  to: '/accounts'
}, {
  label: '渠道中心',
  icon: 'i-lucide-git-branch',
  to: '/channels'
}, {
  label: '团队中心',
  icon: 'i-lucide-users',
  to: '/teams'
}], [{
  label: '数据接入',
  icon: 'i-lucide-database',
  to: '/settings'
}, {
  label: '组织与成员',
  icon: 'i-lucide-user-cog',
  to: '/settings/organization'
}, {
  label: '产品与客户',
  icon: 'i-lucide-package',
  to: '/settings/products'
}, {
  label: '规则配置',
  icon: 'i-lucide-sliders-horizontal',
  to: '/settings/rules'
}]] satisfies DropdownMenuItem[][]

/** Anchor picker to MOCK_TODAY so range maps to Domain spend window. */
const mockToday = parseDate(MOCK_TODAY)
const range = shallowRef<Range>({
  start: new Date(mockToday.getTime() - 13 * 86400000),
  end: mockToday
})
const period = ref<Period>('daily')

const trendDays = computed(() => {
  const days = differenceInCalendarDays(range.value.end, range.value.start) + 1
  return Math.max(7, Math.min(30, days))
})

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const bundle = ref<DashboardOverviewBundle | null>(null)

async function loadOverview() {
  pending.value = true
  errorMessage.value = null
  try {
    bundle.value = await dashboardService.getOverview({ trendDays: trendDays.value })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载总览失败'
    bundle.value = null
  } finally {
    pending.value = false
  }
}

watch(trendDays, () => { void loadOverview() }, { immediate: true })
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="运营总览" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="预警通知" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadOverview" />
        </div>

        <div v-else-if="pending && !bundle" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载运营总览…
        </div>

        <template v-else-if="bundle">
          <HomeStats :kpis="bundle.kpis" />
          <HomeChart :spend-trend="bundle.spendTrend" />
          <div class="grid lg:grid-cols-2 gap-4">
            <HomeConsumptionSplit :ownership-spend="bundle.ownershipSpend" />
            <HomeAccountStructure :account-structure="bundle.accountStructure" />
          </div>
          <div class="grid lg:grid-cols-3 gap-4">
            <HomeChannelOverview :channels="bundle.channels" />
            <HomeTeamOverview :teams="bundle.teams" />
            <HomeImportantAlerts :alerts="bundle.alerts" />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
