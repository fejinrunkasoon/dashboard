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
import type {
  ConfirmSyncImportInput,
  MediaSyncService,
  RunDiscoveryResult
} from './types'

const syncJobs: SyncJob[] = []
const syncLogs: SyncLog[] = []
const discoveredAccounts: DiscoveredAccount[] = []

let logSeq = 0

function nowIso() {
  return new Date().toISOString()
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

export const mediaSyncService: MediaSyncService = {
  async runDiscovery(_credentialId): Promise<RunDiscoveryResult> {
    throw new Error('Credential 发现已移除。请到「账户中心 → 平台连接」授权并发现账户。')
  },

  async recordConnectionDiscoveryJob(input) {
    const startedAt = nowIso()
    const job: SyncJob = {
      id: input.jobId,
      connectionId: input.connectionId,
      mediaId: input.mediaId,
      platformAppId: input.platformAppId ?? null,
      implKey: input.implKey,
      trigger: 'MANUAL',
      status: 'SUCCEEDED',
      startedAt,
      finishedAt: nowIso(),
      stats: { ...input.stats },
      errorMessage: null,
      credentialId: null,
      bindingId: null
    }
    syncJobs.unshift(job)
    pushLog(
      job.id,
      'DISCOVER',
      'INFO',
      `平台连接发现完成：connection=${input.connectionId} NEW=${input.stats.newCount} 已在库=${input.stats.alreadyInFfj}`
    )
    return cloneJob(job)
  },

  async listDiscovered(query: DiscoveredAccountQuery = {}) {
    let rows = [...discoveredAccounts]
    if (query.credentialId) {
      rows = rows.filter(item => item.credentialId === query.credentialId)
    }
    if (query.connectionId) {
      rows = rows.filter(item => item.connectionId === query.connectionId)
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
      data: page.data.map(cloneDiscovered),
      pagination: page.pagination
    }
  },

  async getJobs(query: SyncJobQuery = {}) {
    let rows = [...syncJobs]
    if (query.credentialId) {
      rows = rows.filter(item => item.credentialId === query.credentialId)
    }
    if (query.connectionId) {
      rows = rows.filter(item => item.connectionId === query.connectionId)
    }
    if (query.mediaId) {
      rows = rows.filter(item => item.mediaId === query.mediaId)
    }
    rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const page = paginate(rows, query.page ?? 1, query.pageSize ?? 20)
    return {
      data: page.data.map(cloneJob),
      pagination: page.pagination
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
      data: page.data.map(cloneLog),
      pagination: page.pagination
    }
  },

  async confirmImport(_input: ConfirmSyncImportInput) {
    throw new Error('请使用「平台连接」导入账户')
  },

  async skipDiscovered(ids: string[]) {
    let n = 0
    for (const id of ids) {
      const row = discoveredAccounts.find(item => item.id === id)
      if (!row || row.importStatus !== 'PENDING') continue
      row.importStatus = 'SKIPPED'
      row.updatedAt = nowIso()
      n += 1
    }
    return n
  },

  async getLogsForAccount(accountId: string, limit = 20) {
    return syncLogs
      .filter(item => item.accountId === accountId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(cloneLog)
  }
}

/** Expose emptyStats for typing sanity — unused helper kept for future workers. */
export function _unusedEmptyStats(): SyncJobStats {
  return {
    discovered: 0,
    newCount: 0,
    alreadyInFfj: 0,
    conflictCount: 0,
    missingInMedia: 0,
    imported: 0
  }
}
