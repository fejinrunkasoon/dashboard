<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = [[{
  label: '数据接入',
  icon: 'i-lucide-database',
  to: '/settings',
  exact: true
}, {
  label: '产品与客户',
  icon: 'i-lucide-package',
  to: '/settings/products'
}, {
  label: '组织与成员',
  icon: 'i-lucide-users',
  to: '/settings/organization'
}, {
  label: '用户与权限',
  icon: 'i-lucide-shield',
  to: '/settings/permissions'
}, {
  label: '规则配置',
  icon: 'i-lucide-sliders-horizontal',
  to: '/settings/rules'
}, {
  label: '数据字典',
  icon: 'i-lucide-book-open',
  to: '/settings/dictionary'
}], [{
  label: '操作日志',
  icon: 'i-lucide-file-text',
  to: '/settings/logs/operations'
}, {
  label: '同步日志',
  icon: 'i-lucide-refresh-cw',
  to: '/settings/logs/sync'
}]] satisfies NavigationMenuItem[][]
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="系统管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links[0]" highlight class="-mx-1 flex-1" />
        <UNavigationMenu :items="links[1]" highlight class="-mx-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-5xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>