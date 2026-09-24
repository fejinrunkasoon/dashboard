import type { PlatformAppService } from './types'
import { platformAppServiceMock } from './mock'

/**
 * Feature flag: NUXT_PUBLIC_MEDIA_API=live uses server API; default mock.
 */
function useLiveApi(): boolean {
  try {
    const config = useRuntimeConfig()
    return String(config.public.mediaApi ?? 'mock') === 'live'
  } catch {
    return false
  }
}

async function liveClient(): Promise<PlatformAppService> {
  const { platformAppServiceLive } = await import('./live')
  return platformAppServiceLive
}

export const platformAppService: PlatformAppService = {
  async listApps() {
    if (useLiveApi()) return (await liveClient()).listApps()
    return platformAppServiceMock.listApps()
  },
  async getAppByMediaId(mediaId) {
    if (useLiveApi()) return (await liveClient()).getAppByMediaId(mediaId)
    return platformAppServiceMock.getAppByMediaId(mediaId)
  },
  async getDefaultApp(mediaId) {
    if (useLiveApi()) return (await liveClient()).getDefaultApp(mediaId)
    return platformAppServiceMock.getDefaultApp(mediaId)
  },
  async upsertApp(input) {
    if (useLiveApi()) return (await liveClient()).upsertApp(input)
    return platformAppServiceMock.upsertApp(input)
  },
  async listConnectablePlatforms() {
    if (useLiveApi()) return (await liveClient()).listConnectablePlatforms()
    return platformAppServiceMock.listConnectablePlatforms()
  }
}
