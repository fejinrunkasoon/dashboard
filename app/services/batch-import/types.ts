import type {
  BatchImportIssueCode,
  BatchImportJob,
  BatchImportJobQuery,
  BatchImportJobStats,
  BatchImportRow,
  BatchImportRowQuery
} from '../../domain/batch-import'
import type { PagedResponse } from '../../domain/common'
import type { ExportFormat } from '../../utils/export-table'

export interface PatchBatchImportRowInput {
  rowId: string
  externalAccountId?: string | null
  mediaCode?: string | null
  channelCode?: string | null
  accountName?: string | null
  platformAssetExternalId?: string | null
  timezone?: string | null
  note?: string | null
}

export interface ConfirmBatchImportResult {
  job: BatchImportJob
  imported: number
  skipped: number
  exception: number
  accountIds: string[]
}

export interface BatchImportService {
  downloadTemplate(format: ExportFormat): Promise<void>
  createJobFromCsv(text: string, filename: string): Promise<BatchImportJob>
  validateJob(jobId: string): Promise<BatchImportJob>
  confirmImport(jobId: string): Promise<ConfirmBatchImportResult>
  listJobs(query?: BatchImportJobQuery): Promise<PagedResponse<BatchImportJob>>
  getJob(jobId: string): Promise<BatchImportJob | null>
  listRows(query?: BatchImportRowQuery): Promise<PagedResponse<BatchImportRow>>
  patchExceptionRows(
    jobId: string,
    patches: PatchBatchImportRowInput[]
  ): Promise<BatchImportJob>
  getJobStats(jobId: string): Promise<BatchImportJobStats>
}

export type { BatchImportIssueCode }
