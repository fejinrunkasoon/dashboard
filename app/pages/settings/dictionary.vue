<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Channel, MediaPlatform, PlatformAsset, PlatformAssetType } from '~/domain'
import type { DictionaryEnumItem, DictionaryEnumKind, PlatformAssetListItem } from '~/services'
import {
  DICTIONARY_KIND_LABELS,
  channelService,
  dictionaryService,
  mediaService
} from '~/services'

useSeoMeta({ title: '数据字典' })

const toast = useToast()

const pageSegment = ref<'media' | 'assets' | 'enums'>('media')
const pageSegmentItems = [
  { label: '媒体主数据', value: 'media' },
  { label: '资产实例', value: 'assets' },
  { label: '业务枚举', value: 'enums' }
]

const {
  platforms,
  selectedMediaId,
  selectedPlatform,
  typesForSelected,
  typeCountByMedia,
  pending,
  errorMessage,
  refresh,
  selectMedia,
  createPlatform,
  updatePlatform,
  setPlatformStatus,
  createType,
  updateType,
  setTypeStatus
} = useMediaMaster()

await refresh()

const showPlatformModal = ref(false)
const editingPlatform = ref<MediaPlatform | null>(null)
const showTypeModal = ref(false)
const editingType = ref<PlatformAssetType | null>(null)
const saving = ref(false)

const enumItems = ref<DictionaryEnumItem[]>([])
const selectedKind = ref<DictionaryEnumKind>('TRANSFER_REASON')
const enumPending = ref(true)
const showEnumModal = ref(false)

const assetRows = ref<PlatformAssetListItem[]>([])
const assetEntities = ref<PlatformAsset[]>([])
const allTypes = ref<PlatformAssetType[]>([])
const channels = ref<Channel[]>([])
const assetPending = ref(true)
const showAssetModal = ref(false)
const editingAsset = ref<PlatformAsset | null>(null)

const kindItems = (Object.keys(DICTIONARY_KIND_LABELS) as DictionaryEnumKind[]).map(kind => ({
  label: DICTIONARY_KIND_LABELS[kind],
  value: kind
}))

const enumColumns: TableColumn<DictionaryEnumItem>[] = [
  { accessorKey: 'label', header: '名称' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

const assetColumns: TableColumn<PlatformAssetListItem>[] = [
  { accessorKey: 'mediaName', header: '媒体' },
  { accessorKey: 'typeName', header: '类型' },
  { accessorKey: 'externalId', header: 'External ID' },
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'channelName', header: '来源渠道' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

async function refreshEnums() {
  enumPending.value = true
  try {
    enumItems.value = await dictionaryService.getEnumItems(selectedKind.value)
  } finally {
    enumPending.value = false
  }
}

async function refreshAssets() {
  assetPending.value = true
  try {
    const [list, entities, types, channelRows] = await Promise.all([
      mediaService.getPlatformAssetList({ page: 1, pageSize: 500 }),
      mediaService.getPlatformAssets(),
      mediaService.getPlatformAssetTypes(),
      channelService.getChannels()
    ])
    assetRows.value = list.data
    assetEntities.value = entities
    allTypes.value = types
    channels.value = channelRows
  } finally {
    assetPending.value = false
  }
}

await refreshEnums()
await refreshAssets()

watch(selectedKind, () => {
  refreshEnums()
})

watch(pageSegment, (segment) => {
  if (segment === 'assets') void refreshAssets()
  if (segment === 'enums') void refreshEnums()
})

function openCreatePlatform() {
  editingPlatform.value = null
  showPlatformModal.value = true
}

function openEditPlatform(platform: MediaPlatform) {
  editingPlatform.value = platform
  showPlatformModal.value = true
}

function openCreateType() {
  editingType.value = null
  showTypeModal.value = true
}

function openEditType(type: PlatformAssetType) {
  editingType.value = type
  showTypeModal.value = true
}

function openCreateAsset() {
  editingAsset.value = null
  showAssetModal.value = true
}

function openEditAsset(row: PlatformAssetListItem) {
  editingAsset.value = assetEntities.value.find(item => item.id === row.id) ?? null
  showAssetModal.value = true
}

function openCreateEnum() {
  showEnumModal.value = true
}

async function onSavePlatform(payload: { code: string, name: string, logoUrl?: string | null }) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingPlatform.value) {
      await updatePlatform(editingPlatform.value.id, {
        name: payload.name,
        logoUrl: payload.logoUrl
      })
      toast.add({ title: '已更新媒体平台', icon: 'i-lucide-check', color: 'success' })
    } else {
      await createPlatform({
        code: payload.code,
        name: payload.name,
        logoUrl: payload.logoUrl
      })
      toast.add({ title: '已创建媒体平台', icon: 'i-lucide-check', color: 'success' })
    }
    showPlatformModal.value = false
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

async function onTogglePlatformStatus(platform: MediaPlatform) {
  const next = platform.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await setPlatformStatus(platform.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用媒体平台' : '已停用媒体平台',
      description: `${platform.name} → ${next}`,
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

async function onSaveType(payload: { mediaId: string, code: string, name: string }) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingType.value) {
      await updateType(editingType.value.id, { name: payload.name })
      toast.add({ title: '已更新 Asset Type', icon: 'i-lucide-check', color: 'success' })
    } else {
      await createType({
        mediaId: payload.mediaId,
        code: payload.code,
        name: payload.name
      })
      toast.add({ title: '已创建 Asset Type', icon: 'i-lucide-check', color: 'success' })
    }
    showTypeModal.value = false
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

async function onToggleTypeStatus(type: PlatformAssetType) {
  const next = type.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await setTypeStatus(type.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用 Asset Type' : '已停用 Asset Type',
      description: `${type.name} → ${next}`,
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

async function onSaveAsset(payload: {
  mediaId: string
  typeId: string
  externalId: string
  name?: string | null
  sourceChannelId?: string | null
  note?: string | null
}) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingAsset.value) {
      await mediaService.updatePlatformAsset(editingAsset.value.id, {
        name: payload.name,
        sourceChannelId: payload.sourceChannelId,
        note: payload.note
      })
      toast.add({ title: '已更新媒体资产', icon: 'i-lucide-check', color: 'success' })
    } else {
      await mediaService.createPlatformAsset(payload)
      toast.add({ title: '已登记媒体资产', icon: 'i-lucide-check', color: 'success' })
    }
    showAssetModal.value = false
    await refreshAssets()
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

async function onToggleAssetStatus(row: PlatformAssetListItem) {
  const next = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await mediaService.setPlatformAssetStatus(row.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用资产' : '已停用资产',
      description: `${row.externalId} → ${next}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await refreshAssets()
  } catch (error) {
    toast.add({
      title: '状态更新失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onSaveEnum(payload: { kind: DictionaryEnumKind, code: string, label: string }) {
  if (saving.value) return
  saving.value = true
  try {
    await dictionaryService.createEnumItem(payload)
    toast.add({ title: '已创建枚举项', icon: 'i-lucide-check', color: 'success' })
    showEnumModal.value = false
    selectedKind.value = payload.kind
    await refreshEnums()
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

async function onToggleEnumStatus(item: DictionaryEnumItem) {
  const next = item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await dictionaryService.setEnumStatus(item.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用枚举' : '已停用枚举',
      description: `${item.label} → ${next}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await refreshEnums()
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
  <div class="space-y-8">
    <UPageCard
      title="数据字典"
      description="媒体主数据、资产实例与业务枚举。费率策略、产品、团队、渠道不在本页维护。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    />

    <UTabs v-model="pageSegment" :items="pageSegmentItems" class="w-full" :content="false" />

    <template v-if="pageSegment === 'media'">
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="媒体主数据（预置）"
        description="META/GOOGLE/TIKTOK/SNAPCHAT 为预置媒体；Asset Type 受白名单约束（BM/MCC/BC/Org）。禁止发明新媒体 API 或跨媒体错挂类型。开通 App 凭据请到「媒体平台开通」。"
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

      <SettingsMediaPlatformTable
        :platforms="platforms"
        :type-count-by-media="typeCountByMedia"
        :selected-media-id="selectedMediaId"
        :pending="pending"
        @select="selectMedia"
        @create="openCreatePlatform"
        @edit="openEditPlatform"
        @toggle-status="onTogglePlatformStatus"
      />

      <SettingsPlatformAssetTypeTable
        :platform="selectedPlatform"
        :types="typesForSelected"
        :pending="pending"
        @create="openCreateType"
        @edit="openEditType"
        @toggle-status="onToggleTypeStatus"
      />

      <SettingsMediaPlatformFormModal
        v-model:open="showPlatformModal"
        :platform="editingPlatform"
        @save="onSavePlatform"
      />

      <SettingsPlatformAssetTypeFormModal
        v-model:open="showTypeModal"
        :platform="selectedPlatform"
        :asset-type="editingType"
        @save="onSaveType"
      />
    </template>

    <template v-else-if="pageSegment === 'assets'">
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h3 class="text-sm font-semibold text-highlighted">资产实例</h3>
            <p class="text-xs text-muted">
              登记 BM / MCC / BC / Org 等平台侧容器。运营筛选请到账户中心 → 媒体资产。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              label="去媒体资产"
              icon="i-lucide-boxes"
              color="neutral"
              variant="outline"
              size="sm"
              to="/accounts/assets"
            />
            <UButton
              label="登记资产"
              icon="i-lucide-plus"
              color="neutral"
              size="sm"
              @click="openCreateAsset"
            />
          </div>
        </div>

        <div v-if="assetPending" class="rounded-lg border border-default p-6 text-sm text-muted">
          加载中…
        </div>
        <div
          v-else-if="!assetRows.length"
          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
        >
          暂无资产实例。点击「登记资产」创建。
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="assetRows" :columns="assetColumns" class="shrink-0">
            <template #externalId-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.externalId }}</span>
            </template>
            <template #name-cell="{ row }">
              <span class="text-sm">{{ row.original.name ?? '—' }}</span>
            </template>
            <template #channelName-cell="{ row }">
              <span class="text-sm text-muted">{{ row.original.channelName ?? '—' }}</span>
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
                  @click="openEditAsset(row.original)"
                />
                <UButton
                  :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
                  size="xs"
                  :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
                  variant="ghost"
                  @click="onToggleAssetStatus(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>

      <SettingsPlatformAssetFormModal
        v-model:open="showAssetModal"
        :asset="editingAsset"
        :media-platforms="platforms"
        :asset-types="allTypes"
        :channels="channels"
        @save="onSaveAsset"
      />
    </template>

    <template v-else>
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h3 class="text-sm font-semibold text-highlighted">业务枚举</h3>
            <p class="text-xs text-muted">
              Transfer / Recycle / Disable Reason、Priority、Tags。可新增与启停。
            </p>
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <USelect
              v-model="selectedKind"
              :items="kindItems"
              class="w-full sm:w-48"
            />
            <UButton
              label="新增"
              icon="i-lucide-plus"
              color="neutral"
              size="sm"
              @click="openCreateEnum"
            />
          </div>
        </div>

        <div v-if="enumPending" class="rounded-lg border border-default p-6 text-sm text-muted">
          加载中…
        </div>
        <div
          v-else-if="!enumItems.length"
          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
        >
          该分类暂无枚举项。点击「新增」创建。
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-default">
          <UTable :data="enumItems" :columns="enumColumns" class="shrink-0">
            <template #code-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
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
              <UButton
                :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
                size="xs"
                :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
                variant="ghost"
                @click="onToggleEnumStatus(row.original)"
              />
            </template>
          </UTable>
        </div>
      </div>

      <SettingsEnumFormModal
        v-model:open="showEnumModal"
        :kind="selectedKind"
        @save="onSaveEnum"
      />
    </template>
  </div>
</template>
