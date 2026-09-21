<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Account Center secondary tabs — same pattern as 系统管理 (settings.vue):
 * UDashboardToolbar + UNavigationMenu highlight.
 */
const items = [{
  label: '全部账户',
  icon: 'i-lucide-list',
  to: '/accounts',
  exact: true
}, {
  label: '账户池',
  icon: 'i-lucide-layers',
  to: '/accounts/pool'
}, {
  label: '需求调度',
  icon: 'i-lucide-git-compare',
  to: '/accounts/scheduling'
}, {
  label: '媒体资产',
  icon: 'i-lucide-boxes',
  to: '/accounts/assets'
}, {
  label: '数据导入',
  icon: 'i-lucide-file-up',
  to: '/accounts/import'
}, {
  label: '账户分析',
  icon: 'i-lucide-chart-column',
  to: '/accounts/analytics'
}] satisfies NavigationMenuItem[]
</script>

<template>
  <UNavigationMenu
    :items="items"
    highlight
    class="-mx-1 flex-1"
  />
</template>
