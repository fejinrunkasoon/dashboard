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
  credentialId: string
  bindingId: string
  mediaId: string
  implKey: string
  trigger: SyncJobTrigger
  status: SyncJobStatus
  startedAt: string
  finishedAt: string | null
  stats: SyncJobStats
  errorMessage: string | null
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
  credentialId: string
  mediaId: string
  externalAccountId: string
  name: string | null
  /** Media-side BM / asset external id when known. */
  platformAssetExternalId: string | null
  /** Raw media payload keys for ACCOUNT_MAP. */
  raw: Record<string, string>
  matchStatus: DiscoveryMatchStatus
  ffjAccountId: string | null
  importStatus: DiscoveredImportStatus
  createdAt: string
  updatedAt: string
}

export interface DiscoveredAccountQuery {
  credentialId?: string
  jobId?: string
  matchStatuses?: DiscoveryMatchStatus[]
  importStatuses?: DiscoveredImportStatus[]
  keyword?: string
  page?: number
  pageSize?: number
}

export interface SyncJobQuery {
  credentialId?: string
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
