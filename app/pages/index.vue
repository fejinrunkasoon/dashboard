<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'

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
  label: '渠道管理',
  icon: 'i-lucide-settings-2',
  to: '/settings'
}, {
  label: '团队管理',
  icon: 'i-lucide-user-cog',
  to: '/settings/members'
}, {
  label: '产品管理',
  icon: 'i-lucide-package',
  to: '/settings/notifications'
}, {
  label: '系统配置',
  icon: 'i-lucide-sliders-horizontal',
  to: '/settings/security'
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
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
      <HomeStats :period="period" :range="range" />
      <HomeChart :period="period" :range="range" />
      <div class="grid lg:grid-cols-2 gap-4">
        <HomeConsumptionSplit />
        <HomeAccountStructure />
      </div>
    </template>
  </UDashboardPanel>
</template>