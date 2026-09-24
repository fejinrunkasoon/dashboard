import type { ConnectablePlatform, PlatformApp, PlatformAppUpsertInput } from '~/domain'
import { mediaService, platformAppService } from '~/services'
import type { MediaPlatform } from '~/domain'

export function usePlatformApps() {
  const platforms = ref<MediaPlatform[]>([])
  const apps = ref<PlatformApp[]>([])
  const connectable = ref<ConnectablePlatform[]>([])
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)

  async function refresh() {
    pending.value = true
    errorMessage.value = null
    try {
      const [plats, appList, connect] = await Promise.all([
        mediaService.getMediaPlatforms(),
        platformAppService.listApps(),
        platformAppService.listConnectablePlatforms()
      ])
      platforms.value = plats
      apps.value = appList
      connectable.value = connect
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      pending.value = false
    }
  }

  function appForMedia(mediaId: string) {
    return apps.value.find(a => a.mediaId === mediaId && a.isDefault)
      ?? apps.value.find(a => a.mediaId === mediaId)
      ?? null
  }

  async function saveApp(input: PlatformAppUpsertInput) {
    const saved = await platformAppService.upsertApp(input)
    await refresh()
    return saved
  }

  async function setPlatformStatus(mediaId: string, status: 'ACTIVE' | 'DISABLED') {
    await mediaService.setMediaPlatformStatus(mediaId, status)
    await refresh()
  }

  return {
    platforms,
    apps,
    connectable,
    pending,
    errorMessage,
    refresh,
    appForMedia,
    saveApp,
    setPlatformStatus
  }
}
