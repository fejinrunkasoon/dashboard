<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = [{
  label: '概览',
  icon: 'i-lucide-list',
  to: '/teams',
  exact: true
}, {
  label: '团队分析',
  icon: 'i-lucide-chart-area',
  to: '/teams/analytics'
}, {
  label: '需求',
  icon: 'i-lucide-clipboard-list',
  to: '/teams/demands'
}] satisfies NavigationMenuItem[]
</script>

<template>
  <UNavigationMenu
    :items="items"
    highlight
    class="-mx-1 flex-1"
  />
</template>
