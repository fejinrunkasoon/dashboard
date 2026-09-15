<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const platform = ref({
  label: '广告账户管理',
  icon: 'i-lucide-megaphone'
})

const items = computed<DropdownMenuItem[][]>(() => {
  return [[{
    label: '广告账户管理',
    icon: 'i-lucide-megaphone',
    onSelect() {
      platform.value = { label: '广告账户管理', icon: 'i-lucide-megaphone' }
    }
  }], [{
    label: '系统设置',
    icon: 'i-lucide-cog',
    to: '/settings'
  }]]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : platform?.label"
      :icon="platform?.icon"
      trailing-icon="i-lucide-chevrons-up-down"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>