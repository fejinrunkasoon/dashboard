/** Media Sync Mock — STEP 21. No real Media API. */

export type SyncJobTrigger = 'MANUAL'

export type SyncJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface SyncJobStats {
  discovered: number
  newCount: number
  alreadyInFfj: number
  conflictCount: number
  missingInMedia: number
  imported: number
}

export interface SyncJob {
  id: string
  /** Primary: tenant-plane connection that triggered discovery/sync. */
  connectionId: string | null
  mediaId: string
  platformAppId?: string | null
  implKey: string
  trigger: SyncJobTrigger
  status: SyncJobStatus
  startedAt: string
  finishedAt: string | null
  stats: SyncJobStats
  errorMessage: string | null
  /** @deprecated Use connectionId. */
  credentialId?: string | null
  /** @deprecated Removed with Connector Binding UI. */
  bindingId?: string | null
}

export type SyncLogLevel = 'INFO' | 'WARN' | 'ERROR'

export type SyncLogKind =
  | 'DISCOVER'
  | 'DEDUP'
  | 'IMPORT'
  | 'RECONCILE'
  | 'ERROR'

export interface SyncLog {
  id: string
  jobId: string
  kind: SyncLogKind
  level: SyncLogLevel
  message: string
  at: string
  accountId?: string | null
  discoveredId?: string | null
}

/** Dedup vs FFJ AdAccount by (mediaId, externalAccountId). */
export type DiscoveryMatchStatus = 'NEW' | 'ALREADY_IN_FFJ' | 'CONFLICT'

export type DiscoveredImportStatus = 'PENDING' | 'IMPORTED' | 'SKIPPED'

export interface DiscoveredAccount {
  id: string
  jobId: string
  connectionId: string | null
  mediaId: string
  externalAccountId: string
  name: string | null
  /** Media-side BM / asset external id when known. */
  platformAssetExternalId: string | null
  raw: Record<string, string>
  matchStatus: DiscoveryMatchStatus
  ffjAccountId: string | null
  importStatus: DiscoveredImportStatus
  createdAt: string
  updatedAt: string
  /** @deprecated Use connectionId. */
  credentialId?: string | null
}

export interface DiscoveredAccountQuery {
  credentialId?: string
  connectionId?: string
  jobId?: string
  matchStatuses?: DiscoveryMatchStatus[]
  importStatuses?: DiscoveredImportStatus[]
  keyword?: string
  page?: number
  pageSize?: number
}

export interface SyncJobQuery {
  credentialId?: string
  connectionId?: string
  mediaId?: string
  page?: number
  pageSize?: number
}

export interface SyncLogQuery {
  jobId?: string
  credentialId?: string
  accountId?: string
  page?: number
  pageSize?: number
}
