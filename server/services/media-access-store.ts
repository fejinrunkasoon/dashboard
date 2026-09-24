/**
 * Server-side media access store.
 * Uses in-memory maps by default; when DATABASE_URL is set, prefer Drizzle (optional path).
 * Keeps secrets encrypted via encryptSecret.
 */
import { randomUUID } from 'node:crypto'
import type { ConnectablePlatform, PlatformApp } from '../../app/domain/platform-app'
import { MEDIA_CODE_TO_IMPL } from '../utils/media-codes'
import { encryptSecret, decryptSecret } from '../utils/crypto'

export interface ServerMediaPlatform {
  id: string
  code: string
  name: string
  status: 'ACTIVE' | 'DISABLED'
}

export interface ServerPlatformApp {
  id: string
  mediaId: string
  appId: string
  secretEncrypted: string | null
  developerTokenEncrypted: string | null
  status: 'ACTIVE' | 'DISABLED'
  isDefault: boolean
  redirectUriHint: string | null
  createdAt: string
  updatedAt: string
}

export interface ServerConnection {
  id: string
  organizationId: string
  teamId: string
  mediaId: string
  platformAppId: string | null
  displayName: string
  authorizedByUserId: string
  status: string
  providerIdentityId: string | null
  providerIdentityName: string | null
  scopes: string[]
  isMock: boolean
  authorizedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ServerConnectionSecret {
  connectionId: string
  accessTokenEncrypted: string | null
  refreshTokenEncrypted: string | null
  tokenExpiresAt: string | null
  secretVersion: number
}

export interface ServerAdAccount {
  id: string
  organizationId: string
  mediaId: string
  externalAccountId: string
  name: string | null
}

export interface ServerSyncJob {
  id: string
  connectionId: string | null
  mediaId: string
  platformAppId: string | null
  implKey: string
  status: string
  startedAt: string
  finishedAt: string | null
  stats: Record<string, number>
  errorMessage: string | null
}

const now = () => new Date().toISOString()

const platforms: ServerMediaPlatform[] = [
  { id: 'media-meta', code: 'META', name: 'Meta', status: 'ACTIVE' },
  { id: 'media-google', code: 'GOOGLE', name: 'Google', status: 'ACTIVE' },
  { id: 'media-tiktok', code: 'TIKTOK', name: 'TikTok', status: 'ACTIVE' },
  { id: 'media-snapchat', code: 'SNAPCHAT', name: 'Snapchat', status: 'ACTIVE' }
]

const apps: ServerPlatformApp[] = []
const connections: ServerConnection[] = []
const secrets = new Map<string, ServerConnectionSecret>()
const accounts: ServerAdAccount[] = []
const syncJobs: ServerSyncJob[] = []
/** OAuth state → connectionId */
const oauthStates = new Map<string, { connectionId: string, mediaCode: string, createdAt: number }>()

function toPublicApp(app: ServerPlatformApp): PlatformApp {
  return {
    id: app.id,
    mediaId: app.mediaId,
    appId: app.appId,
    hasSecret: Boolean(app.secretEncrypted),
    hasDeveloperToken: Boolean(app.developerTokenEncrypted),
    status: app.status,
    isDefault: app.isDefault,
    redirectUriHint: app.redirectUriHint,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt
  }
}

export const mediaAccessStore = {
  listPlatforms() {
    return [...platforms]
  },

  getPlatformByCode(code: string) {
    return platforms.find(p => p.code.toUpperCase() === code.toUpperCase()) ?? null
  },

  getPlatformById(id: string) {
    return platforms.find(p => p.id === id) ?? null
  },

  listApps(): PlatformApp[] {
    return apps.map(toPublicApp)
  },

  getDefaultApp(mediaId: string) {
    const app = apps.find(a => a.mediaId === mediaId && a.isDefault && a.status === 'ACTIVE')
    return app ? toPublicApp(app) : null
  },

  getAppRaw(id: string) {
    return apps.find(a => a.id === id) ?? null
  },

  upsertApp(input: {
    mediaId: string
    appId: string
    secret?: string | null
    developerToken?: string | null
    status?: 'ACTIVE' | 'DISABLED'
  }): PlatformApp {
    const media = platforms.find(p => p.id === input.mediaId)
    if (!media) throw createError({ statusCode: 404, statusMessage: 'Unknown media' })

    let app = apps.find(a => a.mediaId === input.mediaId && a.isDefault)
    const ts = now()
    if (!app) {
      app = {
        id: `papp-${media.code.toLowerCase()}-${randomUUID().slice(0, 8)}`,
        mediaId: input.mediaId,
        appId: input.appId.trim(),
        secretEncrypted: input.secret ? encryptSecret(input.secret) : null,
        developerTokenEncrypted: input.developerToken ? encryptSecret(input.developerToken) : null,
        status: input.status ?? 'ACTIVE',
        isDefault: true,
        redirectUriHint: `/api/oauth/${media.code.toLowerCase()}/callback`,
        createdAt: ts,
        updatedAt: ts
      }
      apps.push(app)
    } else {
      app.appId = input.appId.trim()
      if (input.secret) app.secretEncrypted = encryptSecret(input.secret)
      if (input.developerToken) app.developerTokenEncrypted = encryptSecret(input.developerToken)
      if (input.status) app.status = input.status
      app.updatedAt = ts
    }
    return toPublicApp(app)
  },

  listConnectable(): ConnectablePlatform[] {
    return platforms.map((media) => {
      const app = apps.find(a => a.mediaId === media.id && a.isDefault && a.status === 'ACTIVE')
      const configured = Boolean(app?.appId && app.secretEncrypted)
      const impl = MEDIA_CODE_TO_IMPL[media.code]
      return {
        mediaId: media.id,
        code: media.code,
        name: media.name,
        logoUrl: null,
        platformEnabled: media.status === 'ACTIVE',
        appConfigured: configured,
        platformAppId: configured && app ? app.id : null,
        discoveryReady: impl === 'meta'
      }
    })
  },

  createConnection(input: {
    organizationId: string
    teamId: string
    mediaId: string
    displayName: string
    authorizedByUserId: string
  }) {
    const media = platforms.find(p => p.id === input.mediaId)
    if (!media || media.status !== 'ACTIVE') {
      throw createError({ statusCode: 400, statusMessage: 'Platform disabled or unknown' })
    }
    const app = apps.find(a => a.mediaId === media.id && a.isDefault && a.status === 'ACTIVE')
    if (!app?.appId || !app.secretEncrypted) {
      throw createError({ statusCode: 400, statusMessage: 'Platform App not configured' })
    }
    const ts = now()
    const conn: ServerConnection = {
      id: `conn-${media.code.toLowerCase()}-${randomUUID().slice(0, 8)}`,
      organizationId: input.organizationId,
      teamId: input.teamId,
      mediaId: input.mediaId,
      platformAppId: app.id,
      displayName: input.displayName,
      authorizedByUserId: input.authorizedByUserId,
      status: 'PENDING_AUTH',
      providerIdentityId: null,
      providerIdentityName: null,
      scopes: ['ads_read'],
      isMock: false,
      authorizedAt: null,
      createdAt: ts,
      updatedAt: ts
    }
    connections.push(conn)
    return conn
  },

  getConnection(id: string) {
    return connections.find(c => c.id === id) ?? null
  },

  saveOAuthState(state: string, connectionId: string, mediaCode: string) {
    oauthStates.set(state, { connectionId, mediaCode, createdAt: Date.now() })
  },

  takeOAuthState(state: string) {
    const row = oauthStates.get(state)
    if (!row) return null
    oauthStates.delete(state)
    return row
  },

  completeAuth(connectionId: string, input: {
    accessToken: string
    refreshToken?: string | null
    expiresAt?: string | null
    providerIdentityId?: string | null
    providerIdentityName?: string | null
    scopes?: string[]
    isMock?: boolean
  }) {
    const conn = connections.find(c => c.id === connectionId)
    if (!conn) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })
    const ts = now()
    conn.status = input.isMock ? 'MOCK' : 'ACTIVE'
    conn.isMock = Boolean(input.isMock)
    conn.authorizedAt = ts
    conn.providerIdentityId = input.providerIdentityId ?? null
    conn.providerIdentityName = input.providerIdentityName ?? null
    if (input.scopes) conn.scopes = input.scopes
    conn.updatedAt = ts

    secrets.set(connectionId, {
      connectionId,
      accessTokenEncrypted: encryptSecret(input.accessToken),
      refreshTokenEncrypted: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      tokenExpiresAt: input.expiresAt ?? null,
      secretVersion: 1
    })
    return conn
  },

  getAccessToken(connectionId: string): string | null {
    const s = secrets.get(connectionId)
    if (!s?.accessTokenEncrypted) return null
    return decryptSecret(s.accessTokenEncrypted)
  },

  getAppSecret(platformAppId: string): string | null {
    const app = apps.find(a => a.id === platformAppId)
    if (!app?.secretEncrypted) return null
    return decryptSecret(app.secretEncrypted)
  },

  findAccount(organizationId: string, mediaId: string, externalAccountId: string) {
    return accounts.find(
      a => a.organizationId === organizationId
        && a.mediaId === mediaId
        && a.externalAccountId.toLowerCase() === externalAccountId.toLowerCase()
    ) ?? null
  },

  upsertAccount(input: {
    organizationId: string
    mediaId: string
    externalAccountId: string
    name: string | null
  }) {
    const existing = this.findAccount(input.organizationId, input.mediaId, input.externalAccountId)
    if (existing) {
      if (input.name) existing.name = input.name
      return existing
    }
    const row: ServerAdAccount = {
      id: `acc-${randomUUID().slice(0, 10)}`,
      organizationId: input.organizationId,
      mediaId: input.mediaId,
      externalAccountId: input.externalAccountId,
      name: input.name
    }
    accounts.push(row)
    return row
  },

  recordSyncJob(job: ServerSyncJob) {
    syncJobs.unshift(job)
    return job
  },

  listSyncJobs(mediaId?: string) {
    return syncJobs.filter(j => !mediaId || j.mediaId === mediaId)
  },

  disconnect(connectionId: string) {
    const conn = connections.find(c => c.id === connectionId)
    if (!conn) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })
    conn.status = 'DISCONNECTED'
    conn.updatedAt = now()
    secrets.delete(connectionId)
    return conn
  }
}
