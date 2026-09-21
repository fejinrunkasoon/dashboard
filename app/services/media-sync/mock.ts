import { paginate } from '../../domain/common'
import type {
  DiscoveredAccount,
  DiscoveredAccountQuery,
  SyncJob,
  SyncJobQuery,
  SyncJobStats,
  SyncLog,
  SyncLogQuery
} from '../../domain/sync'
import {
  accountApiAccess,
  accounts,
  mediaConnectorBindings,
  mediaCredentials,
  mediaFieldDefinitions,
  platformAssets,
  syncScopeConfigs
} from '../../mocks/entities'
import { getConnectorDefinition } from '../connectors/registry'
import { META_DISCOVER_CATALOG } from '../connectors/meta/mock-catalog'
import {
  findAccountByExternal,
  intakeAdAccount
} from '../accounts/intake'
import { alertService } from '../alerts/mock'
import type {
  ConfirmSyncImportInput,
  MediaSyncService,
  RunDiscoveryResult
} from './types'

const syncJobs: SyncJob[] = []
const syncLogs: SyncLog[] = []
const discoveredAccounts: DiscoveredAccount[] = []

let jobSeq = 0
let logSeq = 0
let discoveredSeq = 0

function nowIso() {
  return new Date().toISOString()
}

function emptyStats(): SyncJobStats {
  return {
    discovered: 0,
    newCount: 0,
    alreadyInFfj: 0,
    conflictCount: 0,
    missingInMedia: 0,
    imported: 0
  }
}

function cloneJob(job: SyncJob): SyncJob {
  return { ...job, stats: { ...job.stats } }
}

function cloneDiscovered(row: DiscoveredAccount): DiscoveredAccount {
  return { ...row, raw: { ...row.raw } }
}

function cloneLog(log: SyncLog): SyncLog {
  return { ...log }
}

function pushLog(
  jobId: string,
  kind: SyncLog['kind'],
  level: SyncLog['level'],
  message: string,
  extra?: { accountId?: string | null, discoveredId?: string | null }
) {
  logSeq += 1
  const entry: SyncLog = {
    id: `slog-${String(logSeq).padStart(4, '0')}`,
    jobId,
    kind,
    level,
    message,
    at: nowIso(),
    accountId: extra?.accountId ?? null,
    discoveredId: extra?.discoveredId ?? null
  }
  syncLogs.push(entry)
  return entry
}

function requireCredential(credentialId: string) {
  const cred = mediaCredentials.find(item => item.id === credentialId)
  if (!cred) throw new Error(`Unknown credential: ${credentialId}`)
  return cred
}

function applyAccountMap(
  mediaId: string,
  raw: Record<string, string>
): { name: string | null, noteExtra: string | null } {
  const maps = mediaFieldDefinitions.filter(
    item => item.mediaId === mediaId
      && item.usage === 'ACCOUNT_MAP'
      && item.status === 'ACTIVE'
  )
  let name: string | null = null
  const extras: string[] = []
  for (const field of maps) {
    const sourceKey = field.sourceKey?.trim()
    if (!sourceKey) continue
    const value = raw[sourceKey]?.trim()
    if (!value) continue
    if (field.key === 'accountName' || sourceKey === 'name') {
      name = value
    } else {
      extras.push(`${field.label}=${value}`)
    }
  }
  if (!name && raw.name?.trim()) name = raw.name.trim()
  return { name, noteExtra: extras.length ? extras.join('; ') : null }
}

function resolvePlatformAssetId(
  mediaId: string,
  platformAssetExternalId: string | null | undefined,
  preferredId: string | null | undefined
): string | null {
  if (preferredId) return preferredId
  if (!platformAssetExternalId?.trim()) return null
  const asset = platformAssets.find(
    item => item.mediaId === mediaId
      && item.externalId === platformAssetExternalId.trim()
  )
  return asset?.id ?? null
}

async function reconcileMissing(
  job: SyncJob,
  mediaId: string,
  discoveredExternalIds: Set<string>
): Promise<number> {
  let missing = 0
  const candidates = accounts.filter(account => account.mediaId === mediaId)
  for (const account of candidates) {
    const status = accountApiAccess[account.id] ?? 'UNKNOWN'
    if (status !== 'ACCESSIBLE' && status !== 'UNKNOWN') continue
    const key = account.externalAccountId.toLowerCase()
    if (discoveredExternalIds.has(key)) continue

    accountApiAccess[account.id] = 'LOST'
    account.lastSyncAt = nowIso()
    account.updatedAt = nowIso()
    await alertService.ensureApiAccessLostAlert(account.id)
    pushLog(
      job.id,
      'RECONCILE',
      'WARN',
      `FFJ 有而媒体无：${account.externalAccountId} → API_ACCESS_LOST`,
      { accountId: account.id }
    )
    missing += 1
  }
  return missing
}

export const mediaSyncService: MediaSyncService = {
  async runDiscovery(credentialId): Promise<RunDiscoveryResult> {
    const cred = requireCredential(credentialId)
    const binding = mediaConnectorBindings.find(item => item.id === cred.connectorBindingId)
    if (!binding) throw new Error('Credential binding not found')
    if (binding.status !== 'ACTIVE') {
      throw new Error('Connector binding is not ACTIVE')
    }

    const def = getConnectorDefinition(binding.implKey)
    if (!def) throw new Error(`Unknown connector impl: ${binding.implKey}`)
    if (binding.implKey !== 'meta') {
      throw new Error('STEP 21 Mock Discovery 仅支持 Meta；其他媒体见 STEP 30')
    }
    if (!def.capabilities.includes('DISCOVERY')) {
      throw new Error(`Connector ${binding.implKey} 不具备 DISCOVERY 能力`)
    }
    if (cred.status !== 'MOCK_CONNECTED') {
      throw new Error(`Credential 状态为 ${cred.status}，需 MOCK_CONNECTED 才能发现`)
    }

    const scope = syncScopeConfigs.find(item => item.credentialId === credentialId)
    if (!scope?.discoverAccounts) {
      throw new Error('同步范围未开启「发现账户」')
    }

    jobSeq += 1
    const startedAt = nowIso()
    const job: SyncJob = {
      id: `sjob-${String(jobSeq).padStart(3, '0')}`,
      credentialId,
      bindingId: binding.id,
      mediaId: binding.mediaId,
      implKey: binding.implKey,
      trigger: 'MANUAL',
      status: 'RUNNING',
      startedAt,
      finishedAt: null,
      stats: emptyStats(),
      errorMessage: null
    }
    syncJobs.unshift(job)

    try {
      pushLog(job.id, 'DISCOVER', 'INFO', `开始 Meta 发现（credential ${credentialId}）`)

      const batch: DiscoveredAccount[] = []
      const seenInBatch = new Set<string>()
      const discoveredExternalIds = new Set<string>()
      const ts = nowIso()

      for (const row of META_DISCOVER_CATALOG) {
        const externalAccountId = row.externalAccountId.trim()
        const key = externalAccountId.toLowerCase()
        discoveredExternalIds.add(key)

        if (seenInBatch.has(key)) {
          discoveredSeq += 1
          const conflict: DiscoveredAccount = {
            id: `disc-${String(discoveredSeq).padStart(4, '0')}`,
            jobId: job.id,
            credentialId,
            mediaId: binding.mediaId,
            externalAccountId,
            name: row.name,
            platformAssetExternalId: row.platformAssetExternalId,
            raw: { name: row.name, ...(row.raw ?? {}) },
            matchStatus: 'CONFLICT',
            ffjAccountId: null,
            importStatus: 'PENDING',
            createdAt: ts,
            updatedAt: ts
          }
          batch.push(conflict)
          job.stats.conflictCount += 1
          continue
        }
        seenInBatch.add(key)

        const existing = findAccountByExternal(binding.mediaId, externalAccountId)
        const matchStatus = existing ? 'ALREADY_IN_FFJ' : 'NEW'
        if (existing) {
          existing.lastSyncAt = ts
          existing.updatedAt = ts
          if ((accountApiAccess[existing.id] ?? 'UNKNOWN') === 'LOST') {
            accountApiAccess[existing.id] = 'ACCESSIBLE'
          }
        }

        discoveredSeq += 1
        const discovered: DiscoveredAccount = {
          id: `disc-${String(discoveredSeq).padStart(4, '0')}`,
          jobId: job.id,
          credentialId,
          mediaId: binding.mediaId,
          externalAccountId,
          name: row.name,
          platformAssetExternalId: row.platformAssetExternalId,
          raw: { name: row.name, ...(row.raw ?? {}) },
          matchStatus,
          ffjAccountId: existing?.id ?? null,
          importStatus: existing ? 'SKIPPED' : 'PENDING',
          createdAt: ts,
          updatedAt: ts
        }
        batch.push(discovered)
        if (matchStatus === 'NEW') job.stats.newCount += 1
        else job.stats.alreadyInFfj += 1
      }

      discoveredAccounts.unshift(...batch)
      job.stats.discovered = batch.length
      pushLog(
        job.id,
        'DEDUP',
        'INFO',
        `去重完成：NEW ${job.stats.newCount}，已在库 ${job.stats.alreadyInFfj}，冲突 ${job.stats.conflictCount}`
      )

      job.stats.missingInMedia = await reconcileMissing(
        job,
        binding.mediaId,
        discoveredExternalIds
      )

      job.status = 'SUCCEEDED'
      job.finishedAt = nowIso()
      pushLog(
        job.id,
        'DISCOVER',
        'INFO',
        `发现完成：共 ${job.stats.discovered} 条，媒体缺失 ${job.stats.missingInMedia}`
      )

      return {
        job: cloneJob(job),
        discovered: batch.map(cloneDiscovered)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discovery failed'
      job.status = 'FAILED'
      job.finishedAt = nowIso()
      job.errorMessage = message
      pushLog(job.id, 'ERROR', 'ERROR', message)
      await alertService.reportSyncFailed(job.id, message)
      throw error
    }
  },

  async listDiscovered(query: DiscoveredAccountQuery = {}) {
    let rows = [...discoveredAccounts]
    if (query.credentialId) {
      rows = rows.filter(item => item.credentialId === query.credentialId)
    }
    if (query.jobId) {
      rows = rows.filter(item => item.jobId === query.jobId)
    }
    if (query.matchStatuses?.length) {
      rows = rows.filter(item => query.matchStatuses!.includes(item.matchStatus))
    }
    if (query.importStatuses?.length) {
      rows = rows.filter(item => query.importStatuses!.includes(item.importStatus))
    }
    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      rows = rows.filter(item =>
        item.externalAccountId.toLowerCase().includes(q)
        || (item.name?.toLowerCase().includes(q) ?? false)
      )
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const page = paginate(rows, query.page ?? 1, query.pageSize ?? 50)
    return {
      ...page,
      items: page.items.map(cloneDiscovered)
    }
  },

  async getJobs(query: SyncJobQuery = {}) {
    let rows = [...syncJobs]
    if (query.credentialId) {
      rows = rows.filter(item => item.credentialId === query.credentialId)
    }
    if (query.mediaId) {
      rows = rows.filter(item => item.mediaId === query.mediaId)
    }
    rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const page = paginate(rows, query.page ?? 1, query.pageSize ?? 20)
    return {
      ...page,
      items: page.items.map(cloneJob)
    }
  },

  async getLogs(query: SyncLogQuery = {}) {
    let rows = [...syncLogs]
    if (query.jobId) {
      rows = rows.filter(item => item.jobId === query.jobId)
    }
    if (query.accountId) {
      rows = rows.filter(item => item.accountId === query.accountId)
    }
    if (query.credentialId) {
      const jobIds = new Set(
        syncJobs.filter(j => j.credentialId === query.credentialId).map(j => j.id)
      )
      rows = rows.filter(item => jobIds.has(item.jobId))
    }
    rows.sort((a, b) => b.at.localeCompare(a.at))
    const page = paginate(rows, query.page ?? 1, query.pageSize ?? 50)
    return {
      ...page,
      items: page.items.map(cloneLog)
    }
  },

  async confirmImport(input: ConfirmSyncImportInput) {
    if (!input.discoveredIds?.length) throw new Error('discoveredIds is required')

    const accountIds: string[] = []
    let importedCount = 0
    const ts = nowIso()

    for (const id of input.discoveredIds) {
      const row = discoveredAccounts.find(item => item.id === id)
      if (!row) throw new Error(`Unknown discovered account: ${id}`)
      if (row.matchStatus !== 'NEW') {
        throw new Error(`${row.externalAccountId} 不是 NEW，不能导入`)
      }
      if (row.importStatus !== 'PENDING') {
        throw new Error(`${row.externalAccountId} 状态为 ${row.importStatus}，不能导入`)
      }

      const mapped = applyAccountMap(row.mediaId, row.raw)
      const platformAssetId = resolvePlatformAssetId(
        row.mediaId,
        row.platformAssetExternalId,
        input.platformAssetId
      )
      const noteParts = ['Inbound from Media Sync']
      if (mapped.noteExtra) noteParts.push(mapped.noteExtra)

      const { account } = intakeAdAccount({
        externalAccountId: row.externalAccountId,
        mediaId: row.mediaId,
        name: mapped.name ?? row.name,
        sourceChannelId: input.sourceChannelId ?? null,
        platformAssetId,
        note: noteParts.join(' · '),
        reason: 'Media sync confirm',
        intakeSource: 'MEDIA_SYNC',
        lastSyncAt: ts,
        firstSeenAt: ts
      })

      row.importStatus = 'IMPORTED'
      row.ffjAccountId = account.id
      row.updatedAt = ts
      accountIds.push(account.id)
      importedCount += 1

      const job = syncJobs.find(item => item.id === row.jobId)
      if (job) job.stats.imported += 1

      pushLog(
        row.jobId,
        'IMPORT',
        'INFO',
        `确认导入 ${row.externalAccountId} → ${account.id}（AVAILABLE，未分配）`,
        { accountId: account.id, discoveredId: row.id }
      )
    }

    return { accountIds, importedCount }
  },

  async skipDiscovered(ids) {
    if (!ids?.length) return 0
    const ts = nowIso()
    let count = 0
    for (const id of ids) {
      const row = discoveredAccounts.find(item => item.id === id)
      if (!row) continue
      if (row.importStatus !== 'PENDING') continue
      row.importStatus = 'SKIPPED'
      row.updatedAt = ts
      count += 1
      pushLog(
        row.jobId,
        'IMPORT',
        'INFO',
        `跳过发现结果 ${row.externalAccountId}`,
        { discoveredId: row.id }
      )
    }
    return count
  },

  async getLogsForAccount(accountId, limit = 10) {
    return syncLogs
      .filter(item => item.accountId === accountId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(cloneLog)
  }
}
