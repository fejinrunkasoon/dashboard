<script setup lang="ts">
const roles = ref([{
  id: 'admin',
  name: '管理员',
  description: '拥有所有权限，可管理渠道、团队、账户和系统配置',
  memberCount: 2,
  permissions: ['渠道管理', '账户管理', '团队管理', '产品管理', '预警处理', '系统配置', '数据导出']
}, {
  id: 'operator',
  name: '运营主管',
  description: '可管理账户分配、转移和团队运营数据',
  memberCount: 5,
  permissions: ['账户管理', '团队管理', '预警处理', '数据导出']
}, {
  id: 'viewer',
  name: '只读查看',
  description: '仅可查看各中心数据，不可进行操作',
  memberCount: 8,
  permissions: ['数据查看']
}])

const selectedRole = ref<string | null>(null)

const toast = useToast()

function onAddRole() {
  toast.add({ title: '功能开发中', description: '新增角色功能即将上线', icon: 'i-lucide-info', color: 'info' })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="用户与权限"
      description="管理系统用户角色和权限分配，控制各角色的可操作范围。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex gap-2 w-fit lg:ms-auto">
        <UButton label="新增用户" icon="i-lucide-user-plus" color="neutral" @click="onAddRole" />
        <UButton label="新增角色" icon="i-lucide-plus" color="primary" variant="outline" @click="onAddRole" />
      </div>
    </UPageCard>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard
        v-for="role in roles"
        :key="role.id"
        :ui="{ body: 'p-4 sm:p-4' }"
        class="cursor-pointer transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': selectedRole === role.id }"
        @click="selectedRole = selectedRole === role.id ? null : role.id"
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="font-semibold text-highlighted">{{ role.name }}</span>
            <UBadge :label="`${role.memberCount} 人`" variant="subtle" size="xs" />
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <p class="text-muted">{{ role.description }}</p>
          <USeparator />
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="perm in role.permissions"
              :key="perm"
              :label="perm"
              variant="subtle"
              color="neutral"
              size="xs"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>