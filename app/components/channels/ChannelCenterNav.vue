<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = [{
  label: '概览',
  icon: 'i-lucide-list',
  to: '/channels',
  exact: true
}, {
  label: '渠道分析',
  icon: 'i-lucide-chart-line',
  to: '/channels/analytics'
}, {
  label: '订单工作台',
  icon: 'i-lucide-clipboard-list',
  to: '/channels/orders'
}] satisfies NavigationMenuItem[]
</script>

<template>
  <UNavigationMenu
    :items="items"
    highlight
    class="-mx-1 flex-1"
  />
</template>
