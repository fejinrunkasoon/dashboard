<script setup lang="ts">
import type { DiscoveredAccount } from '~/domain'
import { teams as allTeams } from '~/mocks/entities'

const props = defineProps<{
  open: boolean
  platformId: string | null
  platformName: string
  step: number
  connectionId: string | null
  discovered: DiscoveredAccount[]
  discoverStats: { discovered: number, newCount: number, alreadyInFfj: number } | null
  busy: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirmTeam: [teamId: string, displayName: string]
  mockAuth: []
  discover: []
  import: [externalAccountIds: string[]]
  close: []
}>()

const { team } = useCurrentUser()

const selectedTeamId = ref(team.value?.id ?? 'team-a')
const displayName = ref('')
const search = ref('')
const selectedIds = ref<string[]>([])

watch(() => props.open, (v) => {
  if (v) {
    selectedTeamId.value = team.value?.id ?? 'team-a'
    displayName.value = ''
    search.value = ''
    selectedIds.value = []
  }
})

watch(() => props.discovered, (rows) => {
  selectedIds.value = rows
    .filter(r => r.matchStatus === 'NEW' && r.importStatus === 'PENDING')
    .map(r => r.externalAccountId)
}, { immediate: true })

const teamOptions = computed(() =>
  allTeams
    .filter(t => t.status === 'ACTIVE')
    .map(t => ({ label: t.name, value: t.id }))
)

const filteredDiscovered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.discovered
  return props.discovered.filter(r =>
    r.externalAccountId.toLowerCase().includes(q)
    || (r.name?.toLowerCase().includes(q) ?? false)
  )
})

const selectableNew = computed(() =>
  filteredDiscovered.value.filter(
    r => r.matchStatus === 'NEW' && r.importStatus === 'PENDING'
  )
)

const stepTitle = computed(() => {
  switch (props.step) {
    case 1: return '确认接入团队'
    case 2: return '平台授权'
    case 3: return '发现广告账户'
    case 4: return '选择并接入'
    default: return '平台连接'
  }
})

function onConfirmTeam() {
  emit('confirmTeam', selectedTeamId.value, displayName.value)
}

function toggleAllNew(checked: boolean | 'indeterminate') {
  if (checked === true) {
    selectedIds.value = selectableNew.value.map(r => r.externalAccountId)
  } else {
    selectedIds.value = []
  }
}

function toggleRow(externalAccountId: string, checked: boolean | 'indeterminate') {
  if (checked === true) {
    if (!selectedIds.value.includes(externalAccountId)) {
      selectedIds.value = [...selectedIds.value, externalAccountId]
    }
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== externalAccountId)
  }
}

function onImport() {
  emit('import', [...selectedIds.value])
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-semibold text-highlighted">
                连接 {{ platformName }}
              </h3>
              <p class="text-sm text-muted mt-0.5">
                步骤 {{ Math.min(step, 4) }} / 4 · {{ stepTitle }}
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="emit('close')"
            />
          </div>
        </template>

        <!-- Step 1: Team -->
        <div v-if="step === 1" class="flex flex-col gap-4">
          <p class="text-sm text-muted">
            本次授权将归属所选团队。授权成功后仍需发现并选择账户，才会正式接入系统。
          </p>
          <UFormField label="接入团队">
            <USelect
              v-model="selectedTeamId"
              :items="teamOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField label="连接显示名（可选）">
            <UInput
              v-model="displayName"
              placeholder="例如：Meta - 王五"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="emit('close')" />
            <UButton
              label="下一步：授权"
              color="primary"
              :loading="busy"
              @click="onConfirmTeam"
            />
          </div>
        </div>

        <!-- Step 2: Mock OAuth -->
        <div v-else-if="step === 2" class="flex flex-col gap-4">
          <UAlert
            color="info"
            variant="subtle"
            title="平台授权"
            description="生产环境将跳转官方 OAuth（Token 存服务端，不回传前端）。当前 mediaApi=mock 时用模拟授权完成同一流程。"
            icon="i-lucide-shield"
          />
          <p class="text-sm text-muted">
            点击下方完成 {{ platformName }} 授权。授权成功 ≠ 账户已接入，还需发现并勾选导入。
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="emit('close')" />
            <UButton
              label="继续授权"
              color="primary"
              icon="i-lucide-external-link"
              :loading="busy"
              @click="emit('mockAuth')"
            />
          </div>
        </div>

        <!-- Step 3: Discover -->
        <div v-else-if="step === 3" class="flex flex-col gap-4">
          <UAlert
            color="success"
            variant="subtle"
            title="授权成功"
            :description="`${platformName} 授权已完成。请发现可用广告账户，再选择需要正式接入的账户。`"
            icon="i-lucide-check-circle"
          />
          <p
            v-if="discoverStats"
            class="text-sm text-muted"
          >
            发现 {{ discoverStats.discovered }} 个 · 新账户 {{ discoverStats.newCount }} · 已在系统
            {{ discoverStats.alreadyInFfj }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              v-if="!discoverStats"
              label="发现账户"
              color="primary"
              icon="i-lucide-radar"
              :loading="busy"
              @click="emit('discover')"
            />
            <UButton
              v-else
              label="选择要接入的账户"
              color="primary"
              :loading="busy"
              @click="emit('discover')"
            />
          </div>
        </div>

        <!-- Step 4: Select & Import -->
        <div v-else-if="step === 4" class="flex flex-col gap-4">
          <p class="text-sm text-muted">
            检测到当前 {{ platformName }} 账号包含以下广告账户，请配置导入规则：
          </p>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="搜索账户 ID / 名称"
            class="w-full"
          />
          <div class="flex items-center justify-between text-sm">
            <UCheckbox
              :model-value="selectedIds.length > 0 && selectedIds.length === selectableNew.length"
              label="全选新账户"
              @update:model-value="toggleAllNew"
            />
            <span class="text-muted">
              已选择 {{ selectedIds.length }} / {{ selectableNew.length }} 新账户
            </span>
          </div>
          <div class="max-h-72 overflow-auto rounded-md border border-default divide-y divide-default">
            <label
              v-for="row in filteredDiscovered"
              :key="row.id"
              class="flex items-start gap-3 p-3 hover:bg-elevated/50"
              :class="{ 'opacity-60': row.matchStatus !== 'NEW' || row.importStatus !== 'PENDING' }"
            >
              <UCheckbox
                :model-value="selectedIds.includes(row.externalAccountId)"
                :disabled="row.matchStatus !== 'NEW' || row.importStatus !== 'PENDING'"
                @update:model-value="(v: boolean | 'indeterminate') => toggleRow(row.externalAccountId, v)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm text-highlighted truncate">
                    {{ row.name || row.externalAccountId }}
                  </span>
                  <UBadge
                    size="sm"
                    variant="subtle"
                    :color="row.matchStatus === 'NEW' ? 'success' : 'neutral'"
                  >
                    {{ row.matchStatus === 'NEW' ? '新账户' : '已在系统' }}
                  </UBadge>
                </div>
                <p class="text-xs text-muted mt-0.5">
                  {{ row.externalAccountId }}
                  <template v-if="row.platformAssetExternalId">
                    · BM {{ row.platformAssetExternalId }}
                  </template>
                </p>
              </div>
            </label>
            <p
              v-if="!filteredDiscovered.length"
              class="p-4 text-sm text-muted text-center"
            >
              无发现结果
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <UButton label="稍后接入" color="neutral" variant="ghost" @click="emit('close')" />
            <UButton
              label="接入所选账户"
              color="primary"
              icon="i-lucide-download"
              :disabled="!selectedIds.length"
              :loading="busy"
              @click="onImport"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
