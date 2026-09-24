import type { PagedResponse } from '../../domain/common'
import type {
  DiscoveredAccount,
  DiscoveredAccountQuery,
  SyncJob,
  SyncJobQuery,
  SyncJobStats,
  SyncLog,
  SyncLogQuery
} from '../../domain/sync'

export interface ConfirmSyncImportInput {
  discoveredIds: string[]
  sourceChannelId?: string | null
  platformAssetId?: string | null
}

export interface ConfirmSyncImportResult {
  accountIds: string[]
  importedCount: number
}

export interface RunDiscoveryResult {
  job: SyncJob
  discovered: DiscoveredAccount[]
}

export interface RecordConnectionDiscoveryInput {
  jobId: string
  connectionId: string
  mediaId: string
  platformAppId?: string | null
  implKey: string
  stats: SyncJobStats
}

export interface MediaSyncService {
  /** @deprecated Credential discovery removed — use ConnectionService.discover */
  runDiscovery(credentialId: string): Promise<RunDiscoveryResult>

  listDiscovered(query?: DiscoveredAccountQuery): Promise<PagedResponse<DiscoveredAccount>>
  getJobs(query?: SyncJobQuery): Promise<PagedResponse<SyncJob>>
  getLogs(query?: SyncLogQuery): Promise<PagedResponse<SyncLog>>

  /** @deprecated Import via ConnectionService.importAccounts */
  confirmImport(input: ConfirmSyncImportInput): Promise<ConfirmSyncImportResult>
  skipDiscovered(ids: string[]): Promise<number>

  getLogsForAccount(accountId: string, limit?: number): Promise<SyncLog[]>

  /** Record a discovery job started from 平台连接 (ops visibility). */
  recordConnectionDiscoveryJob(input: RecordConnectionDiscoveryInput): Promise<SyncJob>
}
