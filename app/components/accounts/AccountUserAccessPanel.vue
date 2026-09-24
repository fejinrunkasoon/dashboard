<script setup lang="ts">
import { appUsers } from '~/mocks/entities'
import { accountAccessService, connectionService } from '~/services'

const props = defineProps<{
  accountId: string
}>()

const { userId, isTeamManager, isOrgAdmin } = useCurrentUser()
const toast = useToast()

const accessRows = ref<{ userId: string, displayName: string, assignmentType: string, assignedAt: string }[]>([])
const canAssign = ref(false)
const pending = ref(false)
const selectedUserId = ref<string | undefined>()

const assignableUsers = computed(() =>
  appUsers
    .filter(u => u.status === 'ACTIVE' && u.id !== 'user-admin')
    .map(u => ({
      label: `${u.displayName} · ${u.roles.join(',')}`,
      value: u.id
    }))
)

async function refresh() {
  pending.value = true
  try {
    accessRows.value = await connectionService.listUserAccess(props.accountId)
    canAssign.value = await accountAccessService.canAssignAccount(userId.value, props.accountId)
  } finally {
    pending.value = false
  }
}

await refresh()

watch(() => props.accountId, () => { void refresh() })

async function onAssign() {
  if (!selectedUserId.value) return
  try {
    await connectionService.assignUser({
      mediaAccountId: props.accountId,
      userId: selectedUserId.value,
      actorUserId: userId.value
    })
    selectedUserId.value = undefined
    await refresh()
    toast.add({ title: '已分配成员', color: 'success', icon: 'i-lucide-check' })
  } catch (error) {
    toast.add({
      title: '分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  }
}

async function onUnassign(targetUserId: string) {
  try {
    await connectionService.unassignUser(props.accountId, targetUserId, userId.value)
    await refresh()
    toast.add({ title: '已取消分配', color: 'success' })
  } catch (error) {
    toast.add({
      title: '取消失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  }
}

const typeLabel: Record<string, string> = {
  IMPORTED_BY: '我接入',
  ASSIGNED: '主管分配'
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-default p-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h3 class="text-sm font-medium text-highlighted">
          用户访问权限（Account Access）
        </h3>
        <p class="text-xs text-muted mt-0.5">
          与 Connection 权限分离：被分配成员可看账户数据，但不能断开他人的平台连接。
          <span v-if="isOrgAdmin || isTeamManager">你可分配 / 取消分配。</span>
        </p>
      </div>
    </div>

    <ul
      v-if="accessRows.length"
      class="divide-y divide-default rounded-md border border-default"
    >
      <li
        v-for="row in accessRows"
        :key="row.userId"
        class="flex items-center justify-between gap-2 p-2.5 text-sm"
      >
        <div>
          <span class="font-medium text-highlighted">{{ row.displayName }}</span>
          <UBadge
            size="sm"
            variant="subtle"
            class="ms-2"
            :color="row.assignmentType === 'IMPORTED_BY' ? 'primary' : 'neutral'"
          >
            {{ typeLabel[row.assignmentType] ?? row.assignmentType }}
          </UBadge>
          <p class="text-xs text-muted mt-0.5">
            {{ row.assignedAt.slice(0, 10) }}
          </p>
        </div>
        <UButton
          v-if="canAssign && row.assignmentType === 'ASSIGNED'"
          size="xs"
          color="error"
          variant="soft"
          label="取消分配"
          :disabled="pending"
          @click="onUnassign(row.userId)"
        />
      </li>
    </ul>
    <p
      v-else
      class="text-sm text-muted"
    >
      暂无用户访问记录。
    </p>

    <div
      v-if="canAssign"
      class="flex flex-wrap items-end gap-2 pt-1"
    >
      <UFormField
        label="分配给成员"
        class="min-w-48 flex-1"
      >
        <USelect
          v-model="selectedUserId"
          :items="assignableUsers"
          placeholder="选择用户"
          class="w-full"
        />
      </UFormField>
      <UButton
        label="分配"
        color="primary"
        :disabled="!selectedUserId || pending"
        @click="onAssign"
      />
    </div>
  </div>
</template>
