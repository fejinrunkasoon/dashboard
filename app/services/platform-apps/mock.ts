import type { PlatformApp, PlatformAppUpsertInput, ConnectablePlatform } from '../../domain/platform-app'
import { mediaPlatforms, platformApps } from '../../mocks/entities'
import { isDiscoveryReadyForMediaCode } from '../connectors/registry'
import type { PlatformAppService } from './types'

/** In-memory secret store — never exported on PlatformApp. */
const secretStore = new Map<string, { secret?: string, developerToken?: string }>()

function nowIso() {
  return new Date().toISOString()
}

function toPublic(app: PlatformApp & { _secret?: string, _developerToken?: string }): PlatformApp {
  return {
    id: app.id,
    mediaId: app.mediaId,
    appId: app.appId,
    hasSecret: app.hasSecret,
    hasDeveloperToken: app.hasDeveloperToken,
    status: app.status,
    isDefault: app.isDefault,
    redirectUriHint: app.redirectUriHint ?? '/api/oauth/callback',
    createdAt: app.createdAt,
    updatedAt: app.updatedAt
  }
}

let seq = platformApps.length

/** Seed mock secrets for pre-configured platform apps. */
for (const app of platformApps) {
  if (app.hasSecret && !secretStore.has(app.id)) {
    secretStore.set(app.id, {
      secret: `mock-secret-${app.id}`,
      developerToken: app.hasDeveloperToken ? `mock-dev-token-${app.id}` : undefined
    })
  }
}

export const platformAppServiceMock: PlatformAppService = {
  async listApps() {
    return platformApps.map(a => toPublic(a))
  },

  async getAppByMediaId(mediaId) {
    const app = platformApps.find(a => a.mediaId === mediaId && a.isDefault)
      ?? platformApps.find(a => a.mediaId === mediaId)
    return app ? toPublic(app) : null
  },

  async getDefaultApp(mediaId) {
    const app = platformApps.find(
      a => a.mediaId === mediaId && a.isDefault && a.status === 'ACTIVE'
    )
    return app ? toPublic(app) : null
  },

  async upsertApp(input: PlatformAppUpsertInput) {
    const media = mediaPlatforms.find(m => m.id === input.mediaId)
    if (!media) throw new Error(`Unknown media: ${input.mediaId}`)

    let app = platformApps.find(a => a.mediaId === input.mediaId && a.isDefault)
    const stored = app ? secretStore.get(app.id) ?? {} : {}

    if (input.secret != null && input.secret !== '') {
      stored.secret = input.secret
    }
    if (input.developerToken != null && input.developerToken !== '') {
      stored.developerToken = input.developerToken
    }

    if (!app) {
      seq += 1
      app = {
        id: `papp-${media.code.toLowerCase()}-${String(seq).padStart(2, '0')}`,
        mediaId: input.mediaId,
        appId: input.appId.trim(),
        hasSecret: Boolean(stored.secret),
        hasDeveloperToken: Boolean(stored.developerToken),
        status: input.status ?? 'ACTIVE',
        isDefault: input.isDefault ?? true,
        redirectUriHint: `/api/oauth/${media.code.toLowerCase()}/callback`,
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
      platformApps.push(app)
    } else {
      app.appId = input.appId.trim()
      if (input.status) app.status = input.status
      app.hasSecret = Boolean(stored.secret)
      app.hasDeveloperToken = Boolean(stored.developerToken)
      app.updatedAt = nowIso()
    }

    secretStore.set(app.id, stored)
    return toPublic(app)
  },

  async listConnectablePlatforms(): Promise<ConnectablePlatform[]> {
    return mediaPlatforms.map((media) => {
      const app = platformApps.find(
        a => a.mediaId === media.id && a.isDefault && a.status === 'ACTIVE'
      )
      const configured = Boolean(app && app.appId && app.hasSecret)
      return {
        mediaId: media.id,
        code: media.code,
        name: media.name,
        logoUrl: media.logoUrl ?? null,
        platformEnabled: media.status === 'ACTIVE',
        appConfigured: configured,
        platformAppId: configured && app ? app.id : null,
        discoveryReady: isDiscoveryReadyForMediaCode(media.code)
      }
    })
  }
}

/** Test helper: read mock secret (server-side only). */
export function getMockPlatformAppSecret(platformAppId: string) {
  return secretStore.get(platformAppId)
}
