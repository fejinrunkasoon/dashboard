<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AppRole, Member, Organization } from '~/domain'
import type { AppUserListItem } from '~/services'
import { orgAdminService, organizationService } from '~/services'
import { DEFAULT_ORGANIZATION_ID } from '~/mocks/entities'

useSeoMeta({ title: '用户与权限' })

const toast = useToast()
const saving = ref(false)
const pending = ref(true)

const users = ref<AppUserListItem[]>([])
const members = ref<Member[]>([])
const organizations = ref<Organization[]>([])

const showUserModal = ref(false)
const editingUser = ref<AppUserListItem | null>(null)
const displayName = ref('')
const memberId = ref<string | undefined>(undefined)
const organizationId = ref<string | undefined>(DEFAULT_ORGANIZATION_ID)
const selectedRoles = ref<AppRole[]>(['TEAM_MEMBER'])

const APP_ROLE_META: Record<AppRole, { label: string, description: string }> = {
  PLATFORM_ADMIN: {
    label: 'Platform Admin',
    description: '平台级管理，可开通媒体 App 与系统配置'
  },
  ORG_ADMIN: {
    label: 'Org Admin',
    description: '组织管理员，可见本组织全部账户与连接'
  },
  TEAM_MANAGER: {
    label: 'Team Manager',
    description: '团队负责人，管理本团队账户分配与连接'
  },
  TEAM_MEMBER: {
    label: 'Team Member',
    description: '普通成员，按分配可见账户'
  }
}

type CapabilityKey =
  | 'viewChannelFunds'
  | 'createPayment'
  | 'allocateAccount'
  | 'manageSystem'

const capabilityLabels: { key: CapabilityKey, label: string }[] = [
  { key: 'viewChannelFunds', label: '查看渠道资金' },
  { key: 'createPayment', label: '创建打款' },
  { key: 'allocateAccount', label: '分配账户' },
  { key: 'manageSystem', label: '管理系统' }
]

/** Read-only capability guide mapped from AppRole — not an editable ACL engine. */
const ROLE_CAPABILITIES: Record<AppRole, Record<CapabilityKey, boolean>> = {
  PLATFORM_ADMIN: {
    viewChannelFunds: true,
    createPayment: true,
    allocateAccount: true,
    manageSystem: true
  },
  ORG_ADMIN: {
    viewChannelFunds: true,
    createPayment: true,
    allocateAccount: true,
    manageSystem: true
  },
  TEAM_MANAGER: {
    viewChannelFunds: false,
    createPayment: false,
    allocateAccount: true,
    manageSystem: false
  },
  TEAM_MEMBER: {
    viewChannelFunds: false,
    createPayment: false,
    allocateAccount: false,
    manageSystem: false
  }
}

const roleCards = (Object.keys(APP_ROLE_META) as AppRole[]).map(id => ({
  id,
  ...APP_ROLE_META[id]
}))

const selectedRoleId = ref<AppRole>('ORG_ADMIN')

const selectedRoleGuide = computed(() => ROLE_CAPABILITIES[selectedRoleId.value])

const matrixRows = computed(() =>
  capabilityLabels.map(item => ({
    key: item.key,
    label: item.label,
    enabled: selectedRoleGuide.value[item.key]
  }))
)

const matrixColumns: TableColumn<{ key: CapabilityKey, label: string, enabled: boolean }>[] = [
  { accessorKey: 'label', header: '能力（说明）' },
  { id: 'enabled', header: '典型允许' }
]

const userColumns: TableColumn<AppUserListItem>[] = [
  { accessorKey: 'displayName', header: '用户' },
  { id: 'member', header: '绑定成员' },
  { id: 'roles', header: '角色' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

const roleFilterItems = [
  { label: '全部角色', value: 'all' },
  ...roleCards.map(r => ({ label: r.label, value: r.id }))
]
const roleFilter = ref('all')

const filteredUsers = computed(() => {
  if (roleFilter.value === 'all') return users.value
  return users.value.filter(u => u.roles.includes(roleFilter.value as AppRole))
})

const memberItems = computed(() =>
  members.value
    .filter(m => m.status === 'ACTIVE' || m.id === editingUser.value?.memberId)
    .map(m => ({ label: `${m.name} (${m.code})`, value: m.id }))
)

const orgItems = computed(() =>
  organizations.value
    .filter(o => o.status === 'ACTIVE' || o.id === editingUser.value?.organizationId)
    .map(o => ({ label: `${o.name} (${o.code})`, value: o.id }))
)

const roleSelectItems = roleCards.map(r => ({ label: r.label, value: r.id }))

async function refresh() {
  pending.value = true
  try {
    const [userRows, memberRows, orgRows] = await Promise.all([
      orgAdminService.listUsers(),
      organizationService.getMembers(),
      orgAdminService.getOrganizations()
    ])
    users.value = userRows
    members.value = memberRows
    organizations.value = orgRows
  } finally {
    pending.value = false
  }
}

await refresh()

function memberCount(role: AppRole) {
  return users.value.filter(u => u.status === 'ACTIVE' && u.roles.includes(role)).length
}

function openCreateUser() {
  editingUser.value = null
  displayName.value = ''
  memberId.value = members.value.find(m => m.status === 'ACTIVE')?.id
  organizationId.value = DEFAULT_ORGANIZATION_ID
  selectedRoles.value = ['TEAM_MEMBER']
  showUserModal.value = true
}

function openEditUser(user: AppUserListItem) {
  editingUser.value = user
  displayName.value = user.displayName
  memberId.value = user.memberId
  organizationId.value = user.organizationId
  selectedRoles.value = [...user.roles]
  showUserModal.value = true
}

const canSubmitUser = computed(() =>
  Boolean(
    displayName.value.trim()
    && memberId.value
    && organizationId.value
    && selectedRoles.value.length
  )
)

async function onSaveUser() {
  if (!canSubmitUser.value || saving.value || !memberId.value || !organizationId.value) return
  saving.value = true
  try {
    if (editingUser.value) {
      await orgAdminService.updateUser(editingUser.value.id, {
        displayName: displayName.value.trim(),
        memberId: memberId.value,
        organizationId: organizationId.value,
        roles: [...selectedRoles.value]
      })
      toast.add({ title: '已更新用户', icon: 'i-lucide-check', color: 'success' })
    } else {
      await orgAdminService.createUser({
        displayName: displayName.value.trim(),
        memberId: memberId.value,
        organizationId: organizationId.value,
        roles: [...selectedRoles.value]
      })
      toast.add({ title: '已创建用户', icon: 'i-lucide-check', color: 'success' })
    }
    showUserModal.value = false
    await refresh()
  } catch (error) {
    toast.add({
      title: '保存失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function onToggleUserStatus(user: AppUserListItem) {
  const next = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await orgAdminService.setUserStatus(user.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用用户' : '已停用用户',
      description: `${user.displayName} → ${next}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await refresh()
  } catch (error) {
    toast.add({
      title: '状态更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function statusColor(status: string) {
  return status === 'ACTIVE' ? 'success' : 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="用户与权限"
      description="管理 AppUser 与 AppRole（Mock）。能力矩阵为说明文档，不接真实鉴权引擎。切换会话请用右上角用户菜单。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <UButton
        label="新增用户"
        icon="i-lucide-user-plus"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="openCreateUser"
      />
    </UPageCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <button
        v-for="role in roleCards"
        :key="role.id"
        type="button"
        class="rounded-lg border border-default p-3 text-left transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': role.id === selectedRoleId }"
        @click="selectedRoleId = role.id"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-sm font-semibold text-highlighted">{{ role.label }}</span>
          <UBadge :label="`${memberCount(role.id)} 人`" variant="subtle" size="xs" />
        </div>
        <p class="text-xs text-muted line-clamp-2">{{ role.description }}</p>
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-highlighted">
          {{ APP_ROLE_META[selectedRoleId].label }} · 能力说明（只读）
        </h3>
        <div class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="matrixRows" :columns="matrixColumns" class="shrink-0">
            <template #enabled-cell="{ row }">
              <UBadge
                :label="row.original.enabled ? '是' : '否'"
                :color="row.original.enabled ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </template>
          </UTable>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-highlighted">应用用户</h3>
          <USelect
            v-model="roleFilter"
            :items="roleFilterItems"
            class="w-40"
          />
        </div>
        <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
          加载中…
        </div>
        <div
          v-else-if="!filteredUsers.length"
          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
        >
          暂无用户。点击「新增用户」创建。
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="filteredUsers" :columns="userColumns" class="shrink-0">
            <template #member-cell="{ row }">
              <span class="text-sm text-muted">
                {{ row.original.memberName ?? '—' }}
                <span v-if="row.original.memberCode" class="font-mono text-xs ms-1">
                  {{ row.original.memberCode }}
                </span>
              </span>
            </template>
            <template #roles-cell="{ row }">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="role in row.original.roles"
                  :key="role"
                  :label="APP_ROLE_META[role]?.label ?? role"
                  variant="subtle"
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
            <template #actions-cell="{ row }">
              <div class="flex items-center gap-1">
                <UButton
                  label="编辑"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="openEditUser(row.original)"
                />
                <UButton
                  :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
                  size="xs"
                  :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
                  variant="ghost"
                  @click="onToggleUserStatus(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </div>

    <UModal v-model:open="showUserModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="space-y-1">
              <span class="font-semibold text-highlighted">
                {{ editingUser ? '编辑用户' : '新增用户' }}
              </span>
              <p class="text-xs text-muted">
                AppUser 绑定 Member 与 Organization，角色可多选。
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="显示名" required>
              <UInput v-model="displayName" placeholder="例如：张三" />
            </UFormField>
            <UFormField label="绑定成员" required>
              <USelect
                v-model="memberId"
                :items="memberItems"
                placeholder="选择成员"
                class="w-full"
              />
            </UFormField>
            <UFormField label="所属组织" required>
              <USelect
                v-model="organizationId"
                :items="orgItems"
                placeholder="选择组织"
                class="w-full"
              />
            </UFormField>
            <UFormField label="角色" required>
              <USelectMenu
                v-model="selectedRoles"
                :items="roleSelectItems"
                multiple
                value-key="value"
                placeholder="选择角色"
                class="w-full"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showUserModal = false" />
              <UButton
                label="保存"
                :loading="saving"
                :disabled="!canSubmitUser"
                @click="onSaveUser"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
