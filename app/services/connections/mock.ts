import type {
  ConnectionAccount,
  ConnectionSecret,
  MediaConnection
} from '../../domain/connection'
import type { TeamAccountLink, UserAccountAccess } from '../../domain/governance'
import type { DiscoveredAccount } from '../../domain/sync'
import {
  accounts,
  appUsers,
  connectionAccounts,
  connectionSecrets,
  DEFAULT_ORGANIZATION_ID,
  mediaConnections,
  mediaPlatforms,
  platformApps,
  teamAccountLinks,
  teams,
  userAccountAccesses
} from '../../mocks/entities'
import { getAdapterForMediaCode } from '../connectors/registry'
import { ConnectorNotImplementedError } from '../connectors/stubs'
import {
  findAccountByExternal,
  intakeAdAccount
} from '../accounts/intake'
import { accountAccessService } from '../access/mock'
import { auditService } from '../audit/mock'
import { mediaSyncService } from '../media-sync/mock'
import type {
  AssignUserToAccountInput,
  CompleteMockAuthInput,
  ConnectionService,
  DiscoverViaConnectionResult,
  ImportConnectionAccountsInput,
  MediaConnectionListItem,
  PlatformConnectionSummary,
  StartConnectionInput
} from './types'

let connSeq = mediaConnections.length
let caSeq = connectionAccounts.length
let talSeq = teamAccountLinks.length
let uaaSeq = userAccountAccesses.length

function nowIso() {
  return new Date().toISOString()
}

function toListItem(conn: MediaConnection): MediaConnectionListItem {
  const team = teams.find(t => t.id === conn.teamId)
  const user = appUsers.find(u => u.id === conn.authorizedByUserId)
  const accountCount = connectionAccounts.filter(
    ca => ca.connectionId === conn.id
  ).length
  return {
    ...conn,
    teamName: team?.name ?? conn.teamId,
    authorizedByName: user?.displayName ?? conn.authorizedByUserId,
    accountCount
  }
}

function requireConnection(id: string): MediaConnection {
  const conn = mediaConnections.find(c => c.id === id)
  if (!conn) throw new Error(`Unknown connection: ${id}`)
  return conn
}

function ensureTeamLink(
  organizationId: string,
  teamId: string,
  mediaAccountId: string,
  actorUserId: string
) {
  const existing = teamAccountLinks.find(
    l => l.mediaAccountId === mediaAccountId
      && l.teamId === teamId
      && l.status === 'ACTIVE'
  )
  if (existing) return existing
  talSeq += 1
  const link: TeamAccountLink = {
    id: `tal-${String(talSeq).padStart(3, '0')}`,
    organizationId,
    teamId,
    mediaAccountId,
    status: 'ACTIVE',
    assignedByUserId: actorUserId,
    assignedAt: nowIso(),
    endedAt: null
  }
  teamAccountLinks.push(link)
  return link
}

function ensureUserAccess(
  organizationId: string,
  mediaAccountId: string,
  userId: string,
  assignmentType: UserAccountAccess['assignmentType'],
  actorUserId: string
) {
  const existing = userAccountAccesses.find(
    a => a.mediaAccountId === mediaAccountId
      && a.userId === userId
      && a.status === 'ACTIVE'
  )
  if (existing) return existing
  uaaSeq += 1
  const row: UserAccountAccess = {
    id: `uaa-${String(uaaSeq).padStart(3, '0')}`,
    organizationId,
    mediaAccountId,
    userId,
    assignmentType,
    assignedByUserId: actorUserId,
    assignedAt: nowIso(),
    status: 'ACTIVE',
    endedAt: null
  }
  userAccountAccesses.push(row)
  return row
}

function ensureConnectionAccount(
  conn: MediaConnection,
  mediaAccountId: string
): ConnectionAccount {
  const existing = connectionAccounts.find(
    ca => ca.connectionId === conn.id && ca.mediaAccountId === mediaAccountId
  )
  if (existing) return existing

  const hasPrimary = connectionAccounts.some(
    ca => ca.mediaAccountId === mediaAccountId && ca.isPrimarySyncSource
  )
  caSeq += 1
  const row: ConnectionAccount = {
    id: `ca-${String(caSeq).padStart(3, '0')}`,
    organizationId: conn.organizationId,
    connectionId: conn.id,
    mediaAccountId,
    providerAccessStatus: 'ACCESSIBLE',
    syncEnabled: true,
    isPrimarySyncSource: !hasPrimary,
    discoveredAt: nowIso(),
    lastVerifiedAt: nowIso(),
    lastSuccessfulSyncAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
  connectionAccounts.push(row)
  return row
}

/** In-memory discovered rows keyed by connection (wizard session). */
const discoveredByConnection = new Map<string, DiscoveredAccount[]>()

export const connectionService: ConnectionService = {
  async listPlatformSummaries(organizationId) {
    const connectable = platformApps.filter(a => a.status === 'ACTIVE' && a.hasSecret && a.appId)
    const mediaIds = new Set([
      ...mediaPlatforms.filter(p => p.status === 'ACTIVE').map(p => p.id),
      ...connectable.map(a => a.mediaId)
    ])
    const result: PlatformConnectionSummary[] = []
    for (const mediaId of mediaIds) {
      const platform = mediaPlatforms.find(p => p.id === mediaId)
      if (!platform || platform.status !== 'ACTIVE') continue
      const app = platformApps.find(a => a.mediaId === platform.id && a.isDefault && a.status === 'ACTIVE')
      const configured = Boolean(app?.appId && app.hasSecret)
      if (!configured && !mediaConnections.some(c => c.platformId === platform.id)) {
        // Still show unconfigured platforms as empty cards so UI can grey them out via connectable list
      }
      const conns = mediaConnections.filter(
        c => c.organizationId === organizationId
          && c.platformId === platform.id
          && c.status !== 'DISCONNECTED'
          && c.status !== 'REVOKED'
      )
      const accountIds = new Set<string>()
      for (const c of conns) {
        for (const ca of connectionAccounts) {
          if (ca.connectionId === c.id) accountIds.add(ca.mediaAccountId)
        }
      }
      result.push({
        platformId: platform.id,
        platformCode: platform.code,
        platformName: platform.name,
        connectionCount: conns.length,
        accountCount: accountIds.size,
        connections: conns.map(toListItem)
      })
    }
    return result
  },

  async listConnections(organizationId, platformId) {
    return mediaConnections
      .filter(c => c.organizationId === organizationId
        && (!platformId || c.platformId === platformId))
      .map(toListItem)
  },

  async getConnection(id) {
    const conn = mediaConnections.find(c => c.id === id)
    return conn ? toListItem(conn) : null
  },

  async startConnection(input: StartConnectionInput) {
    const platform = mediaPlatforms.find(p => p.id === input.platformId)
    if (!platform) throw new Error(`Unknown platform: ${input.platformId}`)
    if (platform.status !== 'ACTIVE') throw new Error(`Platform ${platform.code} is disabled`)
    const team = teams.find(t => t.id === input.teamId)
    if (!team) throw new Error(`Unknown team: ${input.teamId}`)

    const app = platformApps.find(
      a => a.mediaId === platform.id && a.isDefault && a.status === 'ACTIVE'
    )
    if (!app?.appId || !app.hasSecret) {
      throw new Error(`Platform ${platform.name} is not opened (configure App ID/Secret in 媒体平台开通)`)
    }

    connSeq += 1
    const id = `conn-${platform.code.toLowerCase()}-${String(connSeq).padStart(3, '0')}`
    const user = appUsers.find(u => u.id === input.actorUserId)
    const conn: MediaConnection = {
      id,
      organizationId: input.organizationId || DEFAULT_ORGANIZATION_ID,
      teamId: input.teamId,
      platformId: input.platformId,
      displayName: input.displayName?.trim()
        || `${platform.name} - ${user?.displayName ?? 'User'}`,
      authorizedByUserId: input.actorUserId,
      status: 'PENDING_AUTH',
      providerIdentityId: null,
      providerIdentityName: null,
      scopes: ['ads_read'],
      isMock: true,
      platformAppId: app.id,
      legacyCredentialId: null,
      authorizedAt: null,
      expiresAt: null,
      lastVerifiedAt: null,
      lastSyncAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
    mediaConnections.push(conn)

    await auditService.append({
      organizationId: conn.organizationId,
      teamId: conn.teamId,
      actorUserId: input.actorUserId,
      action: 'CONNECT_PLATFORM',
      resourceType: 'MediaConnection',
      resourceId: conn.id,
      afterJson: JSON.stringify({
        status: conn.status,
        platformId: conn.platformId,
        platformAppId: conn.platformAppId
      })
    })

    return { ...conn }
  },

  async completeMockAuth(input: CompleteMockAuthInput) {
    const conn = requireConnection(input.connectionId)
    if (!(await accountAccessService.canManageConnection(input.actorUserId, conn.id))) {
      throw new Error('No permission to authorize this connection')
    }
    if (!conn.platformAppId) {
      const app = platformApps.find(
        a => a.mediaId === conn.platformId && a.isDefault && a.status === 'ACTIVE'
      )
      if (!app) throw new Error('No PlatformApp configured for this media')
      conn.platformAppId = app.id
    }

    conn.status = 'MOCK'
    conn.isMock = true
    conn.authorizedAt = nowIso()
    conn.lastVerifiedAt = nowIso()
    conn.providerIdentityId = `mock-${conn.id}`
    conn.providerIdentityName = input.providerIdentityName?.trim()
      || appUsers.find(u => u.id === input.actorUserId)?.displayName
      || 'Mock User'
    conn.updatedAt = nowIso()

    const secret: ConnectionSecret = {
      connectionId: conn.id,
      hasAccessToken: true,
      hasRefreshToken: false,
      tokenExpiresAt: null,
      secretVersion: 1,
      updatedAt: nowIso()
    }
    const idx = connectionSecrets.findIndex(s => s.connectionId === conn.id)
    if (idx >= 0) connectionSecrets[idx] = secret
    else connectionSecrets.push(secret)

    return { ...conn }
  },

  async reauthorize(connectionId, actorUserId) {
    if (!(await accountAccessService.canManageConnection(actorUserId, connectionId))) {
      throw new Error('No permission to reauthorize this connection')
    }
    const conn = await this.completeMockAuth({ connectionId, actorUserId })
    conn.status = 'MOCK'
    await auditService.append({
      organizationId: conn.organizationId,
      teamId: conn.teamId,
      actorUserId,
      action: 'REAUTHORIZE_CONNECTION',
      resourceType: 'MediaConnection',
      resourceId: conn.id
    })
    return conn
  },

  async disconnect(connectionId, actorUserId) {
    if (!(await accountAccessService.canManageConnection(actorUserId, connectionId))) {
      throw new Error('No permission to disconnect this connection')
    }
    const conn = requireConnection(connectionId)
    const before = conn.status
    conn.status = 'DISCONNECTED'
    conn.updatedAt = nowIso()
    await auditService.append({
      organizationId: conn.organizationId,
      teamId: conn.teamId,
      actorUserId,
      action: 'DISCONNECT_PLATFORM',
      resourceType: 'MediaConnection',
      resourceId: conn.id,
      beforeJson: JSON.stringify({ status: before }),
      afterJson: JSON.stringify({ status: conn.status })
    })
    return { ...conn }
  },

  async discover(connectionId, actorUserId): Promise<DiscoverViaConnectionResult> {
    const conn = requireConnection(connectionId)
    if (!(await accountAccessService.canManageConnection(actorUserId, connectionId))) {
      throw new Error('No permission to discover on this connection')
    }
    if (conn.status !== 'ACTIVE' && conn.status !== 'MOCK') {
      throw new Error('Connection is not authorized')
    }

    const platform = mediaPlatforms.find(p => p.id === conn.platformId)
    if (!platform) throw new Error('Unknown platform on connection')
    const adapter = getAdapterForMediaCode(platform.code)
    if (!adapter) {
      throw new Error(`No connector adapter for platform ${platform.code}`)
    }

    let catalog
    try {
      catalog = await adapter.discoverAccounts({ connectionId: conn.id })
    } catch (error) {
      if (error instanceof ConnectorNotImplementedError) {
        throw new Error(`${platform.name} 账户发现尚未接通（即将支持）`)
      }
      throw error
    }

    const jobId = `cjob-${connectionId}-${Date.now()}`
    const discovered: DiscoveredAccount[] = []
    let newCount = 0
    let already = 0

    for (const row of catalog) {
      const existing = findAccountByExternal(conn.platformId, row.externalAccountId)
      const matchStatus = existing ? 'ALREADY_IN_FFJ' as const : 'NEW' as const
      if (existing) already += 1
      else newCount += 1

      discovered.push({
        id: `cdisc-${connectionId}-${row.externalAccountId}`,
        jobId,
        connectionId: conn.id,
        mediaId: conn.platformId,
        externalAccountId: row.externalAccountId,
        name: row.name,
        platformAssetExternalId: row.platformAssetExternalId ?? null,
        raw: row.raw,
        matchStatus,
        ffjAccountId: existing?.id ?? null,
        importStatus: 'PENDING',
        createdAt: nowIso(),
        updatedAt: nowIso()
      })
    }

    discoveredByConnection.set(conn.id, discovered)
    conn.lastSyncAt = nowIso()
    conn.updatedAt = nowIso()

    await mediaSyncService.recordConnectionDiscoveryJob({
      jobId,
      connectionId: conn.id,
      mediaId: conn.platformId,
      platformAppId: conn.platformAppId,
      implKey: adapter.implKey,
      stats: {
        discovered: discovered.length,
        newCount,
        alreadyInFfj: already,
        conflictCount: 0,
        missingInMedia: 0,
        imported: 0
      }
    })

    await auditService.append({
      organizationId: conn.organizationId,
      teamId: conn.teamId,
      actorUserId,
      action: 'DISCOVER_ACCOUNT',
      resourceType: 'MediaConnection',
      resourceId: conn.id,
      afterJson: JSON.stringify({ discovered: discovered.length, newCount, already })
    })

    return {
      jobId,
      connectionId: conn.id,
      discovered,
      stats: {
        discovered: discovered.length,
        newCount,
        alreadyInFfj: already
      }
    }
  },

  async listDiscovered(connectionId) {
    const rows = discoveredByConnection.get(connectionId) ?? []
    return rows.map(d => ({ ...d, raw: { ...d.raw } }))
  },

  async importAccounts(input: ImportConnectionAccountsInput) {
    const conn = requireConnection(input.connectionId)
    if (!(await accountAccessService.canManageConnection(input.actorUserId, conn.id))) {
      throw new Error('No permission to import on this connection')
    }

    const discovered = discoveredByConnection.get(conn.id) ?? []
    const imported = []
    const linked: ConnectionAccount[] = []
    let skippedExisting = 0

    for (const externalId of input.externalAccountIds) {
      const disc = discovered.find(
        d => d.externalAccountId.toLowerCase() === externalId.trim().toLowerCase()
      )
      let account = findAccountByExternal(conn.platformId, externalId)

      if (account) {
        skippedExisting += 1
      } else {
        const result = intakeAdAccount({
          mediaId: conn.platformId,
          externalAccountId: externalId,
          sourceChannelId: input.sourceChannelId || 'ch-alpha',
          name: disc?.name ?? null,
          platformAssetId: input.platformAssetId ?? null,
          intakeSource: 'MEDIA_SYNC',
          organizationId: conn.organizationId,
          reason: `Platform connection import (${conn.displayName})`
        })
        account = result.account
        imported.push({ ...account })
      }

      const ca = ensureConnectionAccount(conn, account.id)
      linked.push({ ...ca })
      ensureTeamLink(conn.organizationId, conn.teamId, account.id, input.actorUserId)
      ensureUserAccess(
        conn.organizationId,
        account.id,
        input.actorUserId,
        'IMPORTED_BY',
        input.actorUserId
      )

      if (disc) {
        disc.importStatus = 'IMPORTED'
        disc.ffjAccountId = account.id
        disc.matchStatus = 'ALREADY_IN_FFJ'
        disc.updatedAt = nowIso()
      }

      await auditService.append({
        organizationId: conn.organizationId,
        teamId: conn.teamId,
        actorUserId: input.actorUserId,
        action: 'IMPORT_ACCOUNT',
        resourceType: 'AdAccount',
        resourceId: account.id,
        afterJson: JSON.stringify({ connectionId: conn.id, externalAccountId: externalId })
      })
    }

    return { imported, linked, skippedExisting }
  },

  async listConnectionAccounts(connectionId) {
    return connectionAccounts
      .filter(ca => ca.connectionId === connectionId)
      .map(ca => ({ ...ca }))
  },

  async setPrimarySyncSource(connectionAccountId, actorUserId) {
    const target = connectionAccounts.find(ca => ca.id === connectionAccountId)
    if (!target) throw new Error(`Unknown connection account: ${connectionAccountId}`)
    if (!(await accountAccessService.canManageConnection(actorUserId, target.connectionId))) {
      throw new Error('No permission to change primary sync source')
    }

    for (const ca of connectionAccounts) {
      if (ca.mediaAccountId === target.mediaAccountId) {
        ca.isPrimarySyncSource = ca.id === target.id
        ca.updatedAt = nowIso()
      }
    }

    await auditService.append({
      organizationId: target.organizationId,
      actorUserId,
      action: 'CHANGE_PRIMARY_CONNECTION',
      resourceType: 'ConnectionAccount',
      resourceId: target.id,
      afterJson: JSON.stringify({ mediaAccountId: target.mediaAccountId, connectionId: target.connectionId })
    })

    return { ...target, isPrimarySyncSource: true }
  },

  async assignUser(input: AssignUserToAccountInput) {
    if (!(await accountAccessService.canAssignAccount(input.actorUserId, input.mediaAccountId))) {
      throw new Error('No permission to assign this account')
    }
    const account = accounts.find(a => a.id === input.mediaAccountId)
    if (!account) throw new Error(`Unknown account: ${input.mediaAccountId}`)
    const targetUser = appUsers.find(u => u.id === input.userId)
    if (!targetUser) throw new Error(`Unknown user: ${input.userId}`)

    ensureUserAccess(
      account.organizationId ?? DEFAULT_ORGANIZATION_ID,
      input.mediaAccountId,
      input.userId,
      'ASSIGNED',
      input.actorUserId
    )

    await auditService.append({
      organizationId: account.organizationId ?? DEFAULT_ORGANIZATION_ID,
      actorUserId: input.actorUserId,
      action: 'ASSIGN_ACCOUNT',
      resourceType: 'AdAccount',
      resourceId: input.mediaAccountId,
      afterJson: JSON.stringify({ userId: input.userId })
    })
  },

  async unassignUser(mediaAccountId, userId, actorUserId) {
    if (!(await accountAccessService.canAssignAccount(actorUserId, mediaAccountId))) {
      throw new Error('No permission to unassign this account')
    }
    const account = accounts.find(a => a.id === mediaAccountId)
    const row = userAccountAccesses.find(
      a => a.mediaAccountId === mediaAccountId
        && a.userId === userId
        && a.status === 'ACTIVE'
    )
    if (row) {
      row.status = 'ENDED'
      row.endedAt = nowIso()
    }
    await auditService.append({
      organizationId: account?.organizationId ?? DEFAULT_ORGANIZATION_ID,
      actorUserId,
      action: 'UNASSIGN_ACCOUNT',
      resourceType: 'AdAccount',
      resourceId: mediaAccountId,
      afterJson: JSON.stringify({ userId })
    })
  },

  async listUserAccess(mediaAccountId) {
    return userAccountAccesses
      .filter(a => a.mediaAccountId === mediaAccountId && a.status === 'ACTIVE')
      .map(a => {
        const user = appUsers.find(u => u.id === a.userId)
        return {
          userId: a.userId,
          displayName: user?.displayName ?? a.userId,
          assignmentType: a.assignmentType,
          assignedAt: a.assignedAt
        }
      })
  }
}
