<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ConnectorBindingListItem } from '~/services'

defineProps<{
  bindings: ConnectorBindingListItem[]
  selectedBindingId: string | null
  pending?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  edit: [binding: ConnectorBindingListItem]
  toggleStatus: [binding: ConnectorBindingListItem]
}>()

const columns: TableColumn<ConnectorBindingListItem>[] = [
  { accessorKey: 'mediaName', header: '媒体' },
  { accessorKey: 'implDisplayName', header: 'Connector' },
  { accessorKey: 'assetTypeNames', header: 'Asset Types' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'credentialCount', header: 'Credential' },
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
        <h3 class="text-sm font-semibold text-highlighted">Connector 绑定</h3>
        <p class="text-xs text-muted">
          研发注册的 implKey 绑定到 MediaPlatform。同一媒体最多一条 ACTIVE 绑定。
        </p>
      </div>
      <UButton
        label="绑定 Connector"
        icon="i-lucide-plus"
        size="sm"
        @click="emit('create')"
      />
    </div>

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>
    <div
      v-else-if="!bindings.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      尚无 Connector 绑定。先在数据字典创建媒体与 Asset Type，再在此绑定。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="bindings" :columns="columns" class="shrink-0">
        <template #mediaName-cell="{ row }">
          <button
            type="button"
            class="text-left font-medium text-highlighted hover:underline"
            :class="{ 'text-primary': row.original.id === selectedBindingId }"
            @click="emit('select', row.original.id)"
          >
            {{ row.original.mediaName }}
            <span class="ml-1 font-mono text-xs text-muted">({{ row.original.mediaId }})</span>
          </button>
        </template>
        <template #implDisplayName-cell="{ row }">
          <div>
            <span class="text-sm">{{ row.original.implDisplayName }}</span>
            <span class="ml-1 font-mono text-xs text-muted">{{ row.original.implKey }}</span>
          </div>
        </template>
        <template #assetTypeNames-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="name in row.original.assetTypeNames"
              :key="name"
              :label="name"
              variant="subtle"
              color="neutral"
              size="xs"
            />
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.status"
            :color="statusColor(row.original.status)"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #credentialCount-cell="{ row }">
          <span class="text-sm tabular-nums">{{ row.original.credentialCount }}</span>
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
              color="neutral"
              variant="ghost"
              @click="emit('toggleStatus', row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
