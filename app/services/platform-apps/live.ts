import type { ConnectablePlatform, PlatformApp, PlatformAppUpsertInput } from '../../domain/platform-app'
import type { PlatformAppService } from './types'

/** Live HTTP client — talks to /api/admin/platform-apps and /api/media/platforms. */
export const platformAppServiceLive: PlatformAppService = {
  async listApps() {
    return await $fetch<PlatformApp[]>('/api/admin/platform-apps')
  },
  async getAppByMediaId(mediaId) {
    const apps = await this.listApps()
    return apps.find(a => a.mediaId === mediaId && a.isDefault)
      ?? apps.find(a => a.mediaId === mediaId)
      ?? null
  },
  async getDefaultApp(mediaId) {
    const apps = await this.listApps()
    return apps.find(a => a.mediaId === mediaId && a.isDefault && a.status === 'ACTIVE') ?? null
  },
  async upsertApp(input: PlatformAppUpsertInput) {
    // Resolve media code from connectable list or mediaId suffix
    const platforms = await $fetch<ConnectablePlatform[]>('/api/media/platforms').catch(() => [])
    const code = platforms.find(p => p.mediaId === input.mediaId)?.code
      ?? input.mediaId.replace(/^media-/i, '').toUpperCase()
    return await $fetch<PlatformApp>(`/api/admin/platform-apps/${code}`, {
      method: 'PUT',
      body: input
    })
  },
  async listConnectablePlatforms() {
    return await $fetch<ConnectablePlatform[]>('/api/media/platforms')
  }
}
