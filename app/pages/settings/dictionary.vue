<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { MediaPlatform, PlatformAssetType } from '~/domain'
import type { DictionaryEnumItem, DictionaryEnumKind } from '~/services'
import { DICTIONARY_KIND_LABELS, dictionaryService } from '~/services'

useSeoMeta({ title: '数据字典' })

const toast = useToast()

const pageSegment = ref<'media' | 'enums'>('media')
const pageSegmentItems = [
  { label: '媒体主数据', value: 'media' },
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

async function refreshEnums() {
  enumPending.value = true
  try {
    enumItems.value = await dictionaryService.getEnumItems(selectedKind.value)
  } finally {
    enumPending.value = false
  }
}

await refreshEnums()

watch(selectedKind, () => {
  refreshEnums()
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
      description="媒体主数据（STEP 19）与普通业务枚举。费率策略、产品、团队不在本页维护。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    />

    <UTabs v-model="pageSegment" :items="pageSegmentItems" class="w-full" :content="false" />

    <template v-if="pageSegment === 'media'">
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

    <template v-else>
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h3 class="text-sm font-semibold text-highlighted">业务枚举</h3>
            <p class="text-xs text-muted">
              Transfer / Recycle / Disable Reason、Priority、Tags。仅启停，不做复杂 CRUD。
            </p>
          </div>
          <USelect
            v-model="selectedKind"
            :items="kindItems"
            class="w-full sm:w-48"
          />
        </div>

        <div v-if="enumPending" class="rounded-lg border border-default p-6 text-sm text-muted">
          加载中…
        </div>
        <div
          v-else-if="!enumItems.length"
          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
        >
          该分类暂无枚举项。
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
    </template>
  </div>
</template>
