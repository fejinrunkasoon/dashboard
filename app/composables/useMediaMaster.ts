import type { MediaPlatform, PlatformAssetType } from '~/domain'
import type {
  CreateMediaPlatformInput,
  CreatePlatformAssetTypeInput,
  UpdateMediaPlatformInput,
  UpdatePlatformAssetTypeInput
} from '~/services'
import { mediaService } from '~/services'

export function useMediaMaster() {
  const platforms = ref<MediaPlatform[]>([])
  const assetTypes = ref<PlatformAssetType[]>([])
  const selectedMediaId = ref<string | null>(null)
  const pending = ref(false)
  const errorMessage = ref('')

  const selectedPlatform = computed(() =>
    platforms.value.find(item => item.id === selectedMediaId.value) ?? null
  )

  const typesForSelected = computed(() => {
    if (!selectedMediaId.value) return []
    return assetTypes.value.filter(item => item.mediaId === selectedMediaId.value)
  })

  const typeCountByMedia = computed(() => {
    const map = new Map<string, number>()
    for (const type of assetTypes.value) {
      map.set(type.mediaId, (map.get(type.mediaId) ?? 0) + 1)
    }
    return map
  })

  async function refresh() {
    pending.value = true
    errorMessage.value = ''
    try {
      const [nextPlatforms, nextTypes] = await Promise.all([
        mediaService.getMediaPlatforms(),
        mediaService.getPlatformAssetTypes()
      ])
      platforms.value = nextPlatforms
      assetTypes.value = nextTypes

      if (selectedMediaId.value && !nextPlatforms.some(item => item.id === selectedMediaId.value)) {
        selectedMediaId.value = nextPlatforms[0]?.id ?? null
      } else if (!selectedMediaId.value && nextPlatforms.length) {
        selectedMediaId.value = nextPlatforms[0]!.id
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载媒体主数据失败'
    } finally {
      pending.value = false
    }
  }

  function selectMedia(id: string) {
    selectedMediaId.value = id
  }

  async function createPlatform(input: CreateMediaPlatformInput) {
    const created = await mediaService.createMediaPlatform(input)
    await refresh()
    selectedMediaId.value = created.id
    return created
  }

  async function updatePlatform(id: string, input: UpdateMediaPlatformInput) {
    const updated = await mediaService.updateMediaPlatform(id, input)
    await refresh()
    return updated
  }

  async function setPlatformStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    const updated = await mediaService.setMediaPlatformStatus(id, status)
    await refresh()
    return updated
  }

  async function createType(input: CreatePlatformAssetTypeInput) {
    const created = await mediaService.createPlatformAssetType(input)
    await refresh()
    return created
  }

  async function updateType(id: string, input: UpdatePlatformAssetTypeInput) {
    const updated = await mediaService.updatePlatformAssetType(id, input)
    await refresh()
    return updated
  }

  async function setTypeStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    const updated = await mediaService.setPlatformAssetTypeStatus(id, status)
    await refresh()
    return updated
  }

  return {
    platforms,
    assetTypes,
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
  }
}
