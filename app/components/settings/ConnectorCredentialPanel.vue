<script setup lang="ts">
import type { MediaCredential, MediaCredentialStatus, PlatformAssetType, SyncScopeConfig } from '~/domain'
import type { ConnectorBindingListItem } from '~/services'

const props = defineProps<{
  binding: ConnectorBindingListItem | null
  credentials: MediaCredential[]
  selectedCredentialId: string | null
  syncScope: SyncScopeConfig | null
  assetTypes: PlatformAssetType[]
  pending?: boolean
}>()

const emit = defineEmits<{
  selectCredential: [id: string]
  createCredential: [label: string]
  setCredentialStatus: [id: string, status: MediaCredentialStatus]
  saveScope: [payload: {
    discoverAccounts: boolean
    syncSpend: boolean
    syncStatus: boolean
    assetTypeIds: string[]
  }]
}>()

const newLabel = ref('')
const discoverAccounts = ref(false)
const syncSpend = ref(false)
const syncStatus = ref(false)
const scopeTypeIds = ref<string[]>([])

const statusOptions: { label: string, value: MediaCredentialStatus }[] = [
  { label: 'DRAFT', value: 'DRAFT' },
  { label: 'MOCK_CONNECTED', value: 'MOCK_CONNECTED' },
  { label: 'EXPIRED', value: 'EXPIRED' },
  { label: 'REVOKED', value: 'REVOKED' }
]

const selectedCredential = computed(() =>
  props.credentials.find(item => item.id === props.selectedCredentialId) ?? null
)

watch(
  () => props.syncScope,
  (scope) => {
    if (!scope) {
      discoverAccounts.value = false
      syncSpend.value = false
      syncStatus.value = false
      scopeTypeIds.value = props.binding ? [...props.binding.assetTypeIds] : []
      return
    }
    discoverAccounts.value = scope.discoverAccounts
    syncSpend.value = scope.syncSpend
    syncStatus.value = scope.syncStatus
    scopeTypeIds.value = [...scope.assetTypeIds]
  },
  { immediate: true }
)

function statusColor(status: MediaCredentialStatus) {
  if (status === 'MOCK_CONNECTED') return 'success'
  if (status === 'EXPIRED') return 'warning'
  if (status === 'REVOKED') return 'error'
  return 'neutral'
}

function toggleScopeType(id: string) {
  if (scopeTypeIds.value.includes(id)) {
    scopeTypeIds.value = scopeTypeIds.value.filter(item => item !== id)
  } else {
    scopeTypeIds.value = [...scopeTypeIds.value, id]
  }
}

function onCreate() {
  const label = newLabel.value.trim()
  if (!label) return
  emit('createCredential', label)
  newLabel.value = ''
}

function onCredentialStatusChange(value: MediaCredentialStatus | MediaCredentialStatus[] | undefined) {
  const status = Array.isArray(value) ? value[0] : value
  if (!status || !selectedCredential.value) return
  emit('setCredentialStatus', selectedCredential.value.id, status)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-semibold text-highlighted">Credential 与同步范围</h3>
      <p class="text-xs text-muted">
        Mock Credential（TEST ONLY），不存 Token。业务进户请到
        <NuxtLink to="/accounts/connections" class="text-primary underline">平台连接</NuxtLink>
        。运维排障可到
        <NuxtLink to="/settings/sync" class="text-primary underline">数据同步</NuxtLink>
        。真实 OAuth 接口位预留。
      </p>
    </div>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Mock Credential"
      description="状态可手动切换（DRAFT / MOCK_CONNECTED / EXPIRED / REVOKED）。停用绑定后不可标为 MOCK_CONNECTED。"
    />

    <div v-if="!binding" class="rounded-lg border border-dashed border-default p-6 text-sm text-muted">
      请先选择一条 Connector 绑定。
    </div>

    <template v-else>
      <div class="flex flex-wrap items-end gap-2">
        <UFormField label="新建 Credential 标签" class="min-w-48 flex-1">
          <UInput v-model="newLabel" placeholder="例如：Ops Desk (Mock)" />
        </UFormField>
        <UButton
          label="新建"
          size="sm"
          icon="i-lucide-plus"
          :disabled="!newLabel.trim() || binding.status !== 'ACTIVE'"
          @click="onCreate"
        />
      </div>

      <div v-if="pending" class="text-sm text-muted">加载中…</div>
      <div
        v-else-if="!credentials.length"
        class="rounded-lg border border-dashed border-default p-4 text-sm text-muted"
      >
        尚无 Credential。
      </div>
      <div v-else class="space-y-2">
        <button
          v-for="cred in credentials"
          :key="cred.id"
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-default px-3 py-2 text-left transition-colors hover:bg-elevated"
          :class="{ 'ring-2 ring-primary': cred.id === selectedCredentialId }"
          @click="emit('selectCredential', cred.id)"
        >
          <div>
            <span class="text-sm font-medium text-highlighted">{{ cred.label }}</span>
            <span class="ml-2 font-mono text-xs text-muted">{{ cred.id }}</span>
          </div>
          <UBadge
            :label="cred.status"
            :color="statusColor(cred.status)"
            variant="subtle"
            size="xs"
          />
        </button>
      </div>

      <div
        v-if="selectedCredential"
        class="space-y-4 rounded-lg border border-default p-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-medium">状态</span>
          <USelectMenu
            :model-value="selectedCredential.status"
            :items="statusOptions"
            value-key="value"
            class="w-48"
            @update:model-value="onCredentialStatusChange"
          />
        </div>

        <USeparator />

        <div class="space-y-3">
          <h4 class="text-sm font-semibold">同步范围（仅配置）</h4>
          <UCheckbox v-model="discoverAccounts" label="发现账户" />
          <p class="text-xs text-muted">
            开启后可在
            <NuxtLink to="/accounts/connections" class="text-primary underline">平台连接</NuxtLink>
            运行 Discovery。
          </p>
          <UCheckbox v-model="syncSpend" label="同步消耗" />
          <UCheckbox v-model="syncStatus" label="同步状态" />

          <div class="space-y-2">
            <p class="text-xs text-muted">允许的 Asset Types</p>
            <label
              v-for="type in assetTypes"
              :key="type.id"
              class="flex items-center gap-2 text-sm"
            >
              <UCheckbox
                :model-value="scopeTypeIds.includes(type.id)"
                @update:model-value="toggleScopeType(type.id)"
              />
              <span>{{ type.name }} ({{ type.code }})</span>
            </label>
          </div>

          <UButton
            label="保存同步范围"
            size="sm"
            color="primary"
            :disabled="!scopeTypeIds.length"
            @click="onSaveScope"
          />
        </div>
      </div>
    </template>
  </div>
</template>
