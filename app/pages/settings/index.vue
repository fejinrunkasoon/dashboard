<script setup lang="ts">
import type { MediaCredentialStatus, MediaFieldDefinition, MediaFieldUsage } from '~/domain'
import type { ConnectorBindingListItem } from '~/services'

useSeoMeta({ title: '数据接入 · Media Connector' })

const toast = useToast()

const {
  definitions,
  bindings,
  activePlatforms,
  assetTypes: allAssetTypes,
  selectedBindingId,
  selectedBinding,
  demandFields,
  accountMapFields,
  credentials,
  selectedCredentialId,
  syncScope,
  assetTypesForSelectedMedia,
  pending,
  errorMessage,
  refresh,
  selectBinding,
  selectCredential,
  createBinding,
  updateBinding,
  setBindingStatus,
  createField,
  updateField,
  setFieldStatus,
  createCredential,
  setCredentialStatus,
  saveSyncScope,
  activeAssetTypesForMedia
} = useMediaConnectors()

await refresh()

const showBindingModal = ref(false)
const editingBinding = ref<ConnectorBindingListItem | null>(null)
const showFieldModal = ref(false)
const editingField = ref<MediaFieldDefinition | null>(null)
const fieldModalUsage = ref<MediaFieldUsage>('DEMAND')
const saving = ref(false)

function openCreateBinding() {
  editingBinding.value = null
  showBindingModal.value = true
}

function openEditBinding(binding: ConnectorBindingListItem) {
  editingBinding.value = binding
  showBindingModal.value = true
}

async function onSaveBinding(payload: { mediaId: string, implKey: string, assetTypeIds: string[] }) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingBinding.value) {
      await updateBinding(editingBinding.value.id, {
        implKey: payload.implKey,
        assetTypeIds: payload.assetTypeIds
      })
      toast.add({ title: '已更新绑定', icon: 'i-lucide-check', color: 'success' })
    } else {
      await createBinding(payload)
      toast.add({ title: '已绑定 Connector', icon: 'i-lucide-check', color: 'success' })
    }
    showBindingModal.value = false
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

async function onToggleBindingStatus(binding: ConnectorBindingListItem) {
  const next = binding.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await setBindingStatus(binding.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用绑定' : '已停用绑定',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: '状态更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function openCreateField(usage: MediaFieldUsage) {
  editingField.value = null
  fieldModalUsage.value = usage
  showFieldModal.value = true
}

function openEditField(field: MediaFieldDefinition) {
  editingField.value = field
  fieldModalUsage.value = field.usage
  showFieldModal.value = true
}

async function onSaveField(payload: {
  mediaId: string
  usage: MediaFieldUsage
  key: string
  label: string
  fieldType: 'text' | 'select'
  required: boolean
  options?: { label: string, value: string }[]
  sourceKey?: string | null
}) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingField.value) {
      await updateField(editingField.value.id, {
        label: payload.label,
        fieldType: payload.fieldType,
        required: payload.required,
        options: payload.options,
        sourceKey: payload.sourceKey
      })
      toast.add({ title: '已更新字段', icon: 'i-lucide-check', color: 'success' })
    } else {
      await createField(payload)
      toast.add({ title: '已创建字段', icon: 'i-lucide-check', color: 'success' })
    }
    showFieldModal.value = false
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

async function onToggleFieldStatus(field: MediaFieldDefinition) {
  const next = field.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await setFieldStatus(field.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用字段' : '已停用字段',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: '状态更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onCreateCredential(label: string) {
  if (!selectedBinding.value) return
  try {
    await createCredential({
      connectorBindingId: selectedBinding.value.id,
      label
    })
    toast.add({ title: '已创建 Mock Credential', icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toast.add({
      title: '创建失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onSetCredentialStatus(id: string, status: MediaCredentialStatus) {
  try {
    await setCredentialStatus(id, status)
    toast.add({ title: `Credential → ${status}`, icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toast.add({
      title: '状态更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onSaveScope(payload: {
  discoverAccounts: boolean
  syncSpend: boolean
  syncStatus: boolean
  assetTypeIds: string[]
}) {
  if (!selectedCredentialId.value) return
  try {
    await saveSyncScope(selectedCredentialId.value, payload)
    toast.add({ title: '已保存同步范围', icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toast.add({
      title: '保存失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

const bindingModalAssetTypes = computed(() => {
  if (editingBinding.value) {
    return activeAssetTypesForMedia(editingBinding.value.mediaId)
  }
  return allAssetTypes.value.filter(item => item.status === 'ACTIVE')
})
</script>

<template>
  <div class="space-y-8">
    <UPageCard
      title="数据接入 · Media Connector"
      description="注册实现绑定到 MediaPlatform，配置 Asset Type、专属字段、Mock Credential 与同步范围。发现 / 导入请到「媒体同步」。不接真实 OAuth。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="errorMessage"
      class="mb-2"
    >
      <template #description>
        <UButton label="重试" size="xs" color="neutral" variant="soft" class="mt-2" @click="refresh" />
      </template>
    </UAlert>

    <SettingsConnectorBindingTable
      :bindings="bindings"
      :selected-binding-id="selectedBindingId"
      :pending="pending"
      @select="selectBinding"
      @create="openCreateBinding"
      @edit="openEditBinding"
      @toggle-status="onToggleBindingStatus"
    />

    <div class="space-y-6 rounded-lg border border-default p-4 sm:p-6">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          专属字段
          <span v-if="selectedBinding" class="font-normal text-muted">
            · {{ selectedBinding.mediaName }}
          </span>
        </h3>
        <p class="text-xs text-muted">
          DEMAND 字段供申请单动态读取；ACCOUNT_MAP 在媒体同步确认导入时映射展示字段。Timezone 为公共字段，不在此维护。
        </p>
      </div>

      <div
        v-if="!selectedBinding"
        class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
      >
        请先在上方选择一条绑定。
      </div>
      <template v-else>
        <SettingsConnectorFieldTable
          title="申请单字段（DEMAND）"
          description="替换硬编码 media-specific 表；新建媒体配字段后申请弹窗自动出现。"
          usage="DEMAND"
          :fields="demandFields"
          :disabled="selectedBinding.status !== 'ACTIVE'"
          :pending="pending"
          @create="openCreateField"
          @edit="openEditField"
          @toggle-status="onToggleFieldStatus"
        />
        <SettingsConnectorFieldTable
          title="账户字段映射（ACCOUNT_MAP）"
          description="配置 only；本步不拉取媒体数据。"
          usage="ACCOUNT_MAP"
          :fields="accountMapFields"
          :disabled="selectedBinding.status !== 'ACTIVE'"
          :pending="pending"
          @create="openCreateField"
          @edit="openEditField"
          @toggle-status="onToggleFieldStatus"
        />
      </template>
    </div>

    <div class="rounded-lg border border-default p-4 sm:p-6">
      <SettingsConnectorCredentialPanel
        :binding="selectedBinding"
        :credentials="credentials"
        :selected-credential-id="selectedCredentialId"
        :sync-scope="syncScope"
        :asset-types="assetTypesForSelectedMedia"
        :pending="pending"
        @select-credential="selectCredential"
        @create-credential="onCreateCredential"
        @set-credential-status="onSetCredentialStatus"
        @save-scope="onSaveScope"
      />
    </div>

    <SettingsConnectorBindingFormModal
      v-model:open="showBindingModal"
      :binding="editingBinding"
      :platforms="activePlatforms"
      :definitions="definitions"
      :asset-types="bindingModalAssetTypes"
      @save="onSaveBinding"
    />

    <SettingsConnectorFieldFormModal
      v-model:open="showFieldModal"
      :media-id="selectedBinding?.mediaId ?? null"
      :usage="fieldModalUsage"
      :field="editingField"
      @save="onSaveField"
    />
  </div>
</template>
