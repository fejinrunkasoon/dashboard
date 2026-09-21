<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { BatchImportIssueCode, BatchImportRow } from '~/domain'
import type { PatchBatchImportRowInput } from '~/services'

const props = defineProps<{
  rows: BatchImportRow[]
  issueFilter: BatchImportIssueCode | 'ALL'
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:issueFilter': [value: BatchImportIssueCode | 'ALL']
  patch: [patches: PatchBatchImportRowInput[]]
  revalidate: []
}>()

const drafts = ref<Record<string, string>>({})

watch(
  () => props.rows,
  (list) => {
    const next: Record<string, string> = {}
    for (const row of list) {
      next[row.id] = row.externalAccountId ?? ''
    }
    drafts.value = next
  },
  { immediate: true }
)

const filterOptions = [
  { label: '缺失 Account ID', value: 'MISSING_ACCOUNT_ID' },
  { label: '全部异常', value: 'ALL' },
  { label: '未知媒体', value: 'UNKNOWN_MEDIA' },
  { label: '未知渠道', value: 'UNKNOWN_CHANNEL' },
  { label: '文件内重复', value: 'DUPLICATE_IN_FILE' },
  { label: '已在 FFJ', value: 'ALREADY_IN_FFJ' },
  { label: '无效时区', value: 'INVALID_TIMEZONE' }
]

const columns: TableColumn<BatchImportRow>[] = [
  { accessorKey: 'rowIndex', header: '#' },
  { accessorKey: 'mediaCode', header: '媒体' },
  { accessorKey: 'channelCode', header: '渠道' },
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'issueCode', header: '异常' },
  { id: 'externalAccountId', header: '补录 Account ID' },
  { id: 'actions', header: '操作' }
]

function saveRow(row: BatchImportRow) {
  const value = (drafts.value[row.id] ?? '').trim()
  emit('patch', [{ rowId: row.id, externalAccountId: value }])
}

function saveAllMissing() {
  const patches: PatchBatchImportRowInput[] = props.rows
    .filter(row => row.issueCode === 'MISSING_ACCOUNT_ID')
    .map(row => ({
      rowId: row.id,
      externalAccountId: (drafts.value[row.id] ?? '').trim()
    }))
    .filter(item => item.externalAccountId)
  if (patches.length) emit('patch', patches)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          异常队列
        </h3>
        <p class="text-xs text-muted">
          缺失 Account ID 不单独立项，在此补录后重新校验即可入库。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          :model-value="issueFilter"
          :items="filterOptions"
          value-key="value"
          label-key="label"
          class="w-44"
          @update:model-value="emit('update:issueFilter', $event as BatchImportIssueCode | 'ALL')"
        />
        <UButton
          label="批量补录并校验"
          size="sm"
          color="neutral"
          variant="soft"
          :disabled="pending"
          @click="saveAllMissing"
        />
        <UButton
          label="重新校验"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="pending"
          @click="emit('revalidate')"
        />
      </div>
    </div>

    <div
      v-if="pending"
      class="flex items-center justify-center gap-2 rounded-lg border border-default py-10 text-sm text-muted"
    >
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      加载异常…
    </div>
    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-dashed border-default py-10 text-center text-sm text-muted"
    >
      当前筛选下无异常行。
    </div>
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-default"
    >
      <UTable
        :data="rows"
        :columns="columns"
        class="shrink-0"
      >
        <template #issueCode-cell="{ row }">
          <div class="space-y-0.5">
            <UBadge
              :label="row.original.issueCode ?? '—'"
              color="warning"
              variant="subtle"
              size="xs"
            />
            <p class="text-xs text-muted">
              {{ row.original.issueMessage }}
            </p>
          </div>
        </template>
        <template #externalAccountId-cell="{ row }">
          <UInput
            v-model="drafts[row.original.id]"
            size="sm"
            placeholder="补录 Account ID"
            class="w-44 font-mono"
          />
        </template>
        <template #actions-cell="{ row }">
          <UButton
            label="保存"
            size="xs"
            variant="soft"
            :disabled="pending"
            @click="saveRow(row.original)"
          />
        </template>
      </UTable>
    </div>
  </div>
</template>
