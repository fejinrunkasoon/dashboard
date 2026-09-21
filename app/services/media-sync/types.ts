import type { PagedResponse } from '../../domain/common'
import type {
  DiscoveredAccount,
  DiscoveredAccountQuery,
  SyncJob,
  SyncJobQuery,
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

export interface MediaSyncService {
  runDiscovery(credentialId: string): Promise<RunDiscoveryResult>

  listDiscovered(query?: DiscoveredAccountQuery): Promise<PagedResponse<DiscoveredAccount>>
  getJobs(query?: SyncJobQuery): Promise<PagedResponse<SyncJob>>
  getLogs(query?: SyncLogQuery): Promise<PagedResponse<SyncLog>>

  confirmImport(input: ConfirmSyncImportInput): Promise<ConfirmSyncImportResult>
  skipDiscovered(ids: string[]): Promise<number>

  /** Recent sync logs for an FFJ account (API Data tab). */
  getLogsForAccount(accountId: string, limit?: number): Promise<SyncLog[]>
}
