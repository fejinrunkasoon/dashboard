<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MediaPlatform, PlatformAssetType } from '~/domain'

defineProps<{
  platform: MediaPlatform | null
  types: PlatformAssetType[]
  pending?: boolean
}>()

const emit = defineEmits<{
  create: []
  edit: [type: PlatformAssetType]
  toggleStatus: [type: PlatformAssetType]
}>()

const columns: TableColumn<PlatformAssetType>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'status', header: '状态' },
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
        <h3 class="text-sm font-semibold text-highlighted">
          Platform Asset Type
          <span v-if="platform" class="text-muted font-normal">· {{ platform.name }}</span>
        </h3>
        <p class="text-xs text-muted">
          类型名称从主数据读取（BM / MCC / Business Center 等），不写死。父平台停用后新建筛选不可选。
        </p>
      </div>
      <UButton
        label="新增类型"
        icon="i-lucide-plus"
        size="sm"
        :disabled="!platform"
        @click="emit('create')"
      />
    </div>

    <div v-if="!platform" class="rounded-lg border border-dashed border-default p-6 text-sm text-muted">
      请先在上方选择一个媒体平台。
    </div>
    <div v-else-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!types.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      {{ platform.name }} 尚无 Asset Type。点击「新增类型」创建。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="types" :columns="columns" class="shrink-0">
        <template #name-cell="{ row }">
          <span class="font-medium text-highlighted">{{ row.original.name }}</span>
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
