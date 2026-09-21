<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: '用户与权限' })

const toast = useToast()

type PermissionKey =
  | 'viewChannelFunds'
  | 'createPayment'
  | 'confirmPayment'
  | 'allocateAccount'
  | 'transferAccount'
  | 'disableAccount'
  | 'manageProduct'
  | 'reconcile'
  | 'manageSystem'

interface RoleDef {
  id: string
  name: string
  description: string
  permissions: Record<PermissionKey, boolean>
}

interface MockUser {
  id: string
  name: string
  roleId: string
  status: 'ACTIVE' | 'DISABLED'
}

const permissionLabels: { key: PermissionKey, label: string }[] = [
  { key: 'viewChannelFunds', label: '查看渠道资金' },
  { key: 'createPayment', label: '创建打款' },
  { key: 'confirmPayment', label: '确认打款' },
  { key: 'allocateAccount', label: '分配账户' },
  { key: 'transferAccount', label: '转移账户' },
  { key: 'disableAccount', label: '停用账户' },
  { key: 'manageProduct', label: '管理产品' },
  { key: 'reconcile', label: '对账' },
  { key: 'manageSystem', label: '管理系统' }
]

const roles = ref<RoleDef[]>([
  {
    id: 'super-admin',
    name: '超级管理员',
    description: '拥有全部权限，可管理系统配置',
    permissions: {
      viewChannelFunds: true,
      createPayment: true,
      confirmPayment: true,
      allocateAccount: true,
      transferAccount: true,
      disableAccount: true,
      manageProduct: true,
      reconcile: true,
      manageSystem: true
    }
  },
  {
    id: 'ops-admin',
    name: '运营管理员',
    description: '账户分配、转移与团队运营',
    permissions: {
      viewChannelFunds: true,
      createPayment: false,
      confirmPayment: false,
      allocateAccount: true,
      transferAccount: true,
      disableAccount: true,
      manageProduct: true,
      reconcile: false,
      manageSystem: false
    }
  },
  {
    id: 'channel-finance',
    name: '渠道/财务',
    description: '渠道资金、打款与对账',
    permissions: {
      viewChannelFunds: true,
      createPayment: true,
      confirmPayment: true,
      allocateAccount: false,
      transferAccount: false,
      disableAccount: false,
      manageProduct: false,
      reconcile: true,
      manageSystem: false
    }
  },
  {
    id: 'team-lead',
    name: '团队负责人',
    description: '本团队账户与需求相关操作',
    permissions: {
      viewChannelFunds: false,
      createPayment: false,
      confirmPayment: false,
      allocateAccount: false,
      transferAccount: true,
      disableAccount: false,
      manageProduct: false,
      reconcile: false,
      manageSystem: false
    }
  },
  {
    id: 'member',
    name: '普通成员',
    description: '只读查看与有限自助操作',
    permissions: {
      viewChannelFunds: false,
      createPayment: false,
      confirmPayment: false,
      allocateAccount: false,
      transferAccount: false,
      disableAccount: false,
      manageProduct: false,
      reconcile: false,
      manageSystem: false
    }
  }
])

const users = ref<MockUser[]>([
  { id: 'u-1', name: 'Admin', roleId: 'super-admin', status: 'ACTIVE' },
  { id: 'u-2', name: '王五', roleId: 'ops-admin', status: 'ACTIVE' },
  { id: 'u-3', name: '赵磊', roleId: 'team-lead', status: 'ACTIVE' },
  { id: 'u-4', name: '财务小张', roleId: 'channel-finance', status: 'ACTIVE' },
  { id: 'u-5', name: '张三', roleId: 'member', status: 'ACTIVE' },
  { id: 'u-6', name: '李四', roleId: 'member', status: 'DISABLED' }
])

const selectedRoleId = ref('super-admin')

const selectedRole = computed(() =>
  roles.value.find(r => r.id === selectedRoleId.value) ?? roles.value[0]!
)

const roleUsers = computed(() =>
  users.value.filter(u => u.roleId === selectedRoleId.value)
)

const matrixRows = computed(() =>
  permissionLabels.map(item => ({
    key: item.key,
    label: item.label,
    enabled: selectedRole.value.permissions[item.key]
  }))
)

const matrixColumns: TableColumn<{ key: PermissionKey, label: string, enabled: boolean }>[] = [
  { accessorKey: 'label', header: '权限' },
  { id: 'enabled', header: '允许' }
]

const userColumns: TableColumn<MockUser>[] = [
  { accessorKey: 'name', header: '用户' },
  { accessorKey: 'status', header: '状态' }
]

function selectRole(id: string) {
  selectedRoleId.value = id
}

function togglePermission(key: PermissionKey, value: boolean) {
  selectedRole.value.permissions[key] = value
}

function onSave() {
  toast.add({
    title: '已保存',
    description: `${selectedRole.value.name} 权限矩阵已更新（Mock，未接真实鉴权）。`,
    icon: 'i-lucide-check',
    color: 'success'
  })
}

function memberCount(roleId: string) {
  return users.value.filter(u => u.roleId === roleId && u.status === 'ACTIVE').length
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="用户与权限"
      description="按角色配置可操作范围。当前为 Mock 矩阵，不接真实登录与鉴权引擎。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <UButton
        label="保存配置"
        icon="i-lucide-save"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="onSave"
      />
    </UPageCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <button
        v-for="role in roles"
        :key="role.id"
        type="button"
        class="rounded-lg border border-default p-3 text-left transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': role.id === selectedRoleId }"
        @click="selectRole(role.id)"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-sm font-semibold text-highlighted">{{ role.name }}</span>
          <UBadge :label="`${memberCount(role.id)} 人`" variant="subtle" size="xs" />
        </div>
        <p class="text-xs text-muted line-clamp-2">{{ role.description }}</p>
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-highlighted">
          {{ selectedRole.name }} · 权限矩阵
        </h3>
        <div class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="matrixRows" :columns="matrixColumns" class="shrink-0">
            <template #enabled-cell="{ row }">
              <USwitch
                :model-value="row.original.enabled"
                @update:model-value="(v: boolean) => togglePermission(row.original.key, v)"
              />
            </template>
          </UTable>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-highlighted">
          绑定用户（示例）
        </h3>
        <div
          v-if="!roleUsers.length"
          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
        >
          该角色暂无用户。
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="roleUsers" :columns="userColumns" class="shrink-0">
            <template #status-cell="{ row }">
              <UBadge
                :label="row.original.status"
                :color="row.original.status === 'ACTIVE' ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </template>
          </UTable>
        </div>
      </div>
    </div>
  </div>
</template>
