/** Batch Import / 数据治理 — STEP 22. No real object storage. */

export type BatchImportJobStatus = 'DRAFT' | 'VALIDATED' | 'COMMITTED' | 'FAILED'

export type BatchImportRowStatus = 'VALID' | 'EXCEPTION' | 'IMPORTED' | 'SKIPPED'

export type BatchImportIssueCode =
  | 'MISSING_ACCOUNT_ID'
  | 'UNKNOWN_MEDIA'
  | 'UNKNOWN_CHANNEL'
  | 'DUPLICATE_IN_FILE'
  | 'ALREADY_IN_FFJ'
  | 'INVALID_TIMEZONE'
  | 'UNKNOWN_PLATFORM_ASSET'
  | 'MISSING_CHANNEL'

export interface BatchImportJobStats {
  total: number
  valid: number
  exception: number
  imported: number
  skipped: number
}

export interface BatchImportJob {
  id: string
  status: BatchImportJobStatus
  sourceFilename: string
  mediaId: string | null
  channelId: string | null
  stats: BatchImportJobStats
  createdAt: string
  validatedAt: string | null
  committedAt: string | null
  errorMessage: string | null
}

export interface BatchImportRow {
  id: string
  jobId: string
  rowIndex: number
  /** Original CSV cell values keyed by template column. */
  raw: Record<string, string>
  mediaId: string | null
  mediaCode: string | null
  externalAccountId: string | null
  name: string | null
  channelId: string | null
  channelCode: string | null
  platformAssetId: string | null
  platformAssetExternalId: string | null
  timezone: string | null
  note: string | null
  rowStatus: BatchImportRowStatus
  issueCode: BatchImportIssueCode | null
  issueMessage: string | null
  importedAccountId: string | null
  updatedAt: string
}

export interface BatchImportRowQuery {
  jobId?: string
  issueCodes?: BatchImportIssueCode[]
  rowStatuses?: BatchImportRowStatus[]
  keyword?: string
  page?: number
  pageSize?: number
}

export interface BatchImportJobQuery {
  status?: BatchImportJobStatus
  page?: number
  pageSize?: number
}

/** Frozen template columns for account batch import. */
export const BATCH_IMPORT_TEMPLATE_COLUMNS = [
  { key: 'mediaCode', header: 'mediaCode' },
  { key: 'externalAccountId', header: 'externalAccountId' },
  { key: 'accountName', header: 'accountName' },
  { key: 'channelCode', header: 'channelCode' },
  { key: 'platformAssetExternalId', header: 'platformAssetExternalId' },
  { key: 'timezone', header: 'timezone' },
  { key: 'note', header: 'note' }
] as const

export type BatchImportTemplateColumnKey =
  (typeof BATCH_IMPORT_TEMPLATE_COLUMNS)[number]['key']
