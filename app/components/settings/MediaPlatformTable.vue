<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MediaPlatform } from '~/domain'

defineProps<{
  platforms: MediaPlatform[]
  typeCountByMedia: Map<string, number>
  selectedMediaId: string | null
  pending?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  edit: [platform: MediaPlatform]
  toggleStatus: [platform: MediaPlatform]
}>()

const columns: TableColumn<MediaPlatform>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'status', header: '状态' },
  { id: 'typeCount', header: '类型数' },
  { id: 'actions', header: '操作' }
]

function statusColor(status: string) {
  return status === 'ACTIVE' ? 'success' : 'neutral'
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">媒体平台</h3>
        <p class="text-xs text-muted">MediaPlatform 主数据。停用不物理删除；新建与筛选只消费 ACTIVE。</p>
      </div>
      <UButton label="新增媒体" icon="i-lucide-plus" size="sm" @click="emit('create')" />
    </div>

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!platforms.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      暂无媒体平台。点击「新增媒体」创建第一条。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="platforms" :columns="columns" class="shrink-0">
        <template #name-cell="{ row }">
          <button
            type="button"
            class="text-left font-medium text-highlighted hover:text-primary"
            :class="{ 'text-primary': row.original.id === selectedMediaId }"
            @click="emit('select', row.original.id)"
          >
            {{ row.original.name }}
          </button>
        </template>
        <template #code-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.status"
            :color="statusColor(row.original.status)"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #typeCount-cell="{ row }">
          {{ typeCountByMedia.get(row.original.id) ?? 0 }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              label="编辑"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('edit', row.original)"
            />
            <UButton
              :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
              size="xs"
              :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
              variant="ghost"
              @click="emit('toggleStatus', row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
