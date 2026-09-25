<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { AccountDemandItem } from '~/domain'
import type { TeamDemandListItem } from '~/services'

const props = defineProps<{
  demandRows: TeamDemandListItem[]
  expandedDemandId: string | null
  expandedItems: AccountDemandItem[]
  mediaNameById: Record<string, string>
  productNameById: Record<string, string>
  leaderMemberId?: string | null
}>()

const emit = defineEmits<{
  apply: []
  toggle: [id: string]
  edit: [id: string]
  submit: [id: string]
  approve: [id: string]
  reject: [id: string]
  cancel: [id: string]
  confirmRecycle: [id: string]
}>()

const demandStatusLabel: Record<string, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  APPROVED: '已批准',
  PARTIALLY_ALLOCATED: '部分分配',
  FULFILLED: '已满足',
  REJECTED: '已拒绝',
  CANCELLED: '已取消'
}

const demandColumns: TableColumn<TeamDemandListItem>[] = [
  { accessorKey: 'demandNo', header: '需求号' },
  { id: 'status', header: '状态' },
  { accessorKey: 'priority', header: '优先级' },
  { id: 'expectedDate', header: '期望日期' },
  { accessorKey: 'unfulfilledQuantity', header: '未满足' },
  { id: 'reason', header: '原因' },
  { id: 'actions', header: '' }
]

function demandCell(row: Row<TeamDemandListItem>) {
  return row.original
}

const { member } = useCurrentUser()

/** Only the assigned team leader may approve — not merely "team has a leader". */
const canApprove = computed(
  () => Boolean(props.leaderMemberId && member.value?.id === props.leaderMemberId)
)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs text-muted">
        团队表达需求；不能选择具体账户。审批人是团队负责人。
      </p>
      <UButton
        label="申请账户"
        icon="i-lucide-plus"
        size="xs"
        variant="soft"
        @click="emit('apply')"
      />
    </div>
    <div v-if="!demandRows.length" class="text-sm text-muted py-8 text-center">
      暂无账户需求
    </div>
    <template v-else>
      <UTable :data="demandRows" :columns="demandColumns">
        <template #demandNo-cell="{ row }">
          <UButton
            :label="demandCell(row).demandNo"
            variant="ghost"
            color="neutral"
            class="font-mono text-sm -px-2 -py-1"
            @click="emit('toggle', demandCell(row).id)"
          />
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="demandStatusLabel[demandCell(row).status] ?? demandCell(row).status"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #expectedDate-cell="{ row }">
          {{ demandCell(row).expectedDate ?? '—' }}
        </template>
        <template #unfulfilledQuantity-cell="{ row }">
          <span :class="demandCell(row).unfulfilledQuantity > 0 ? 'text-warning font-medium' : ''">
            {{ demandCell(row).unfulfilledQuantity }}
          </span>
        </template>
        <template #reason-cell="{ row }">
          {{ demandCell(row).reason ?? '—' }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1 flex-wrap">
            <UButton
              label="明细"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('toggle', demandCell(row).id)"
            />
            <template v-if="demandCell(row).status === 'DRAFT'">
              <UButton
                label="编辑"
                size="xs"
                color="neutral"
                variant="soft"
                @click="emit('edit', demandCell(row).id)"
              />
              <UButton
                label="提交"
                size="xs"
                color="primary"
                variant="soft"
                @click="emit('submit', demandCell(row).id)"
              />
            </template>
            <template v-if="demandCell(row).status === 'SUBMITTED' && canApprove">
              <UButton
                label="通过"
                size="xs"
                color="primary"
                variant="soft"
                @click="emit('approve', demandCell(row).id)"
              />
              <UButton
                label="驳回"
                size="xs"
                color="error"
                variant="ghost"
                @click="emit('reject', demandCell(row).id)"
              />
            </template>
            <UButton
              v-if="demandCell(row).status !== 'CANCELLED' && demandCell(row).status !== 'FULFILLED' && demandCell(row).status !== 'REJECTED'"
              label="取消"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="emit('cancel', demandCell(row).id)"
            />
            <UButton
              v-if="demandCell(row).status === 'CANCELLED'"
              label="确认回收闲置"
              size="xs"
              color="warning"
              variant="soft"
              @click="emit('confirmRecycle', demandCell(row).id)"
            />
          </div>
        </template>
      </UTable>

      <div
        v-if="expandedDemandId && expandedItems.length"
        class="mt-4 rounded-lg border border-default bg-elevated/40 p-3 space-y-2"
      >
        <p class="text-xs font-medium text-muted">
          需求明细 · {{ expandedDemandId }}
        </p>
        <div
          v-for="item in expandedItems"
          :key="item.id"
          class="text-sm grid sm:grid-cols-2 gap-2"
        >
          <p>
            <span class="text-muted">媒体：</span>
            {{ mediaNameById[item.mediaId] ?? item.mediaId }}
          </p>
          <p>
            <span class="text-muted">产品：</span>
            {{ item.productId ? (productNameById[item.productId] ?? item.productId) : '—' }}
          </p>
          <p>
            <span class="text-muted">数量：</span>
            {{ item.requestedQuantity }}（已批 {{ item.approvedQuantity }}）
          </p>
          <p>
            <span class="text-muted">需求条件：</span>
            <span class="font-mono text-xs">{{ JSON.stringify(item.requirements) }}</span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
