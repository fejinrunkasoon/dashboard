<script setup lang="ts">
import type { DiscoveredAccount } from '~/domain'

const props = defineProps<{
  rows: DiscoveredAccount[]
  selectedIds: string[]
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
}>()

const selectable = computed(() =>
  props.rows.filter(item => item.matchStatus === 'NEW' && item.importStatus === 'PENDING')
)

const allSelected = computed({
  get: () =>
    selectable.value.length > 0
    && selectable.value.every(item => props.selectedIds.includes(item.id)),
  set: (value: boolean) => {
    if (value) {
      emit('update:selectedIds', selectable.value.map(item => item.id))
    } else {
      emit('update:selectedIds', [])
    }
  }
})

function toggle(id: string, checked: boolean | 'indeterminate') {
  const on = checked === true
  if (on) {
    if (!props.selectedIds.includes(id)) {
      emit('update:selectedIds', [...props.selectedIds, id])
    }
  } else {
    emit('update:selectedIds', props.selectedIds.filter(item => item !== id))
  }
}

function matchColor(status: string) {
  if (status === 'NEW') return 'success'
  if (status === 'ALREADY_IN_FFJ') return 'neutral'
  return 'warning'
}

function importColor(status: string) {
  if (status === 'IMPORTED') return 'success'
  if (status === 'SKIPPED') return 'neutral'
  return 'info'
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <table class="w-full min-w-[640px] text-left text-sm">
      <thead class="border-b border-default bg-elevated/50 text-xs text-muted">
        <tr>
          <th class="w-10 px-3 py-2">
            <UCheckbox v-model="allSelected" :disabled="!selectable.length" />
          </th>
          <th class="px-3 py-2 font-medium">外部 Account ID</th>
          <th class="px-3 py-2 font-medium">名称</th>
          <th class="px-3 py-2 font-medium">匹配</th>
          <th class="px-3 py-2 font-medium">导入</th>
          <th class="px-3 py-2 font-medium">FFJ 账户</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pending">
          <td colspan="6" class="px-3 py-6 text-center text-muted">加载中…</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td colspan="6" class="px-3 py-6 text-center text-muted">
            暂无发现结果。选择 Meta Credential 后点击「运行发现」。
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="border-b border-default/60 last:border-0"
        >
          <td class="px-3 py-2">
            <UCheckbox
              :model-value="selectedIds.includes(row.id)"
              :disabled="row.matchStatus !== 'NEW' || row.importStatus !== 'PENDING'"
              @update:model-value="(v: boolean | 'indeterminate') => toggle(row.id, v)"
            />
          </td>
          <td class="px-3 py-2 font-mono text-xs">{{ row.externalAccountId }}</td>
          <td class="px-3 py-2">{{ row.name ?? '—' }}</td>
          <td class="px-3 py-2">
            <UBadge :label="row.matchStatus" :color="matchColor(row.matchStatus)" variant="subtle" size="xs" />
          </td>
          <td class="px-3 py-2">
            <UBadge :label="row.importStatus" :color="importColor(row.importStatus)" variant="subtle" size="xs" />
          </td>
          <td class="px-3 py-2 font-mono text-xs text-muted">
            {{ row.ffjAccountId ?? '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
