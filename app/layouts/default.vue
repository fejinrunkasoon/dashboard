<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { alertService } from '~/services'

const route = useRoute()

const open = ref(false)

const close = () => { open.value = false }

const openAlertCount = ref(0)

try {
  openAlertCount.value = await alertService.getOpenCount()
} catch {
  openAlertCount.value = 0
}

const links = computed(() => [[{
  label: '运营总览',
  icon: 'i-lucide-layout-dashboard',
  to: '/',
  onSelect: close
}, {
  label: '渠道中心',
  icon: 'i-lucide-git-branch',
  to: '/channels',
  onSelect: close
}, {
  label: '账户中心',
  icon: 'i-lucide-wallet',
  to: '/accounts',
  onSelect: close
}, {
  label: '团队中心',
  icon: 'i-lucide-users',
  to: '/teams',
  onSelect: close
}, {
  label: '预警与待办',
  icon: 'i-lucide-bell-ring',
  to: '/alerts',
  badge: openAlertCount.value > 0 ? String(openAlertCount.value) : undefined,
  onSelect: close
}, {
  label: '系统管理',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger' as const,
  children: [{
    label: '数据接入',
    to: '/settings',
    exact: true,
    onSelect: close
  }, {
    label: '媒体同步',
    to: '/settings/sync',
    onSelect: close
  }, {
    label: '产品与客户',
    to: '/settings/products',
    onSelect: close
  }, {
    label: '组织与成员',
    to: '/settings/organization',
    onSelect: close
  }, {
    label: '用户与权限',
    to: '/settings/permissions',
    onSelect: close
  }, {
    label: '规则配置',
    to: '/settings/rules',
    onSelect: close
  }, {
    label: '数据字典',
    to: '/settings/dictionary',
    onSelect: close
  }, {
    label: '日志中心',
    icon: 'i-lucide-file-text',
    type: 'trigger' as const,
    defaultOpen: true,
    children: [{
      label: '操作日志',
      to: '/settings/logs/operations',
      onSelect: close
    }, {
      label: '同步日志',
      to: '/settings/logs/sync',
      onSelect: close
    }]
  }]
}], [{
  label: '使用帮助',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}]] satisfies NavigationMenuItem[][])

const groups = computed(() => [{
  id: 'links',
  label: '跳转到',
  items: links.value.flat()
}, {
  id: 'code',
  label: '代码',
  items: [{
    id: 'source',
    label: '查看页面源码',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>