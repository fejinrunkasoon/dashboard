<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MediaFieldDefinition, MediaFieldUsage } from '~/domain'

const props = defineProps<{
  title: string
  description: string
  usage: MediaFieldUsage
  fields: MediaFieldDefinition[]
  disabled?: boolean
  pending?: boolean
}>()

const emit = defineEmits<{
  create: [usage: MediaFieldUsage]
  edit: [field: MediaFieldDefinition]
  toggleStatus: [field: MediaFieldDefinition]
}>()

const columns: TableColumn<MediaFieldDefinition>[] = [
  { accessorKey: 'key', header: '键名' },
  { accessorKey: 'label', header: '标签' },
  { accessorKey: 'fieldType', header: '类型' },
  { accessorKey: 'required', header: '必填' },
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
        <h4 class="text-sm font-semibold text-highlighted">{{ title }}</h4>
        <p class="text-xs text-muted">{{ description }}</p>
      </div>
      <UButton
        label="新增字段"
        icon="i-lucide-plus"
        size="sm"
        :disabled="disabled"
        @click="emit('create', props.usage)"
      />
    </div>

    <div
      v-if="pending"
      class="rounded-lg border border-default p-4 text-sm text-muted"
    >
      加载中…
    </div>
    <div
      v-else-if="!fields.length"
      class="rounded-lg border border-dashed border-default p-4 text-sm text-muted"
    >
      暂无字段。
    </div>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="fields" :columns="columns" class="shrink-0">
        <template #key-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.key }}</span>
        </template>
        <template #label-cell="{ row }">
          <span class="text-sm">{{ row.original.label }}</span>
          <span
            v-if="row.original.sourceKey"
            class="ml-1 font-mono text-xs text-muted"
          >
            ← {{ row.original.sourceKey }}
          </span>
        </template>
        <template #fieldType-cell="{ row }">
          <UBadge :label="row.original.fieldType" variant="subtle" color="neutral" size="xs" />
        </template>
        <template #required-cell="{ row }">
          <span class="text-xs">{{ row.original.required ? '是' : '否' }}</span>
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
