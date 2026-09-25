import { DEMAND_TIMEZONE_OPTIONS } from '../../domain/demand-requirement-fields'
import { paginate } from '../../domain/common'
import type {
  BatchImportIssueCode,
  BatchImportJob,
  BatchImportJobStats,
  BatchImportRow,
  BatchImportRowStatus
} from '../../domain/batch-import'
import { BATCH_IMPORT_TEMPLATE_COLUMNS } from '../../domain/batch-import'
import {
  channels,
  mediaPlatforms,
  platformAssets
} from '../../mocks/entities'
import { parseCsv } from '../../utils/import-table'
import {
  saveBlob,
  stampFilename,
  toCsvBlob,
  toXlsx,
  type ExportFormat
} from '../../utils/export-table'
import { MOCK_TODAY } from '../../utils/spend-aggregation'
import { findAccountByExternal, intakeAdAccount } from '../accounts/intake'
import type {
  BatchImportService,
  ConfirmBatchImportResult,
  PatchBatchImportRowInput
} from './types'

const VALID_TIMEZONES = new Set(DEMAND_TIMEZONE_OPTIONS.map(item => item.value))

const jobs: BatchImportJob[] = []
const rows: BatchImportRow[] = []
let jobSeq = 0
let rowSeq = 0

function nowIso(): string {
  return `${MOCK_TODAY}T12:00:00.000Z`
}

function cloneJob(job: BatchImportJob): BatchImportJob {
  return { ...job, stats: { ...job.stats } }
}

function cloneRow(row: BatchImportRow): BatchImportRow {
  return { ...row, raw: { ...row.raw } }
}

function requireJob(jobId: string): BatchImportJob {
  const job = jobs.find(item => item.id === jobId)
  if (!job) throw new Error(`Unknown import job: ${jobId}`)
  return job
}

function emptyStats(): BatchImportJobStats {
  return { total: 0, valid: 0, exception: 0, imported: 0, skipped: 0 }
}

function recomputeStats(jobId: string): BatchImportJobStats {
  const jobRows = rows.filter(item => item.jobId === jobId)
  const stats = emptyStats()
  stats.total = jobRows.length
  for (const row of jobRows) {
    if (row.rowStatus === 'VALID') stats.valid += 1
    else if (row.rowStatus === 'EXCEPTION') stats.exception += 1
    else if (row.rowStatus === 'IMPORTED') stats.imported += 1
    else if (row.rowStatus === 'SKIPPED') stats.skipped += 1
  }
  const job = requireJob(jobId)
  job.stats = stats
  return stats
}

function cell(raw: Record<string, string>, key: string): string {
  return (raw[key] ?? '').trim()
}

function resolveMedia(code: string | null) {
  if (!code) return null
  return mediaPlatforms.find(
    item => item.code.toLowerCase() === code.toLowerCase() && item.status === 'ACTIVE'
  ) ?? null
}

function resolveChannel(code: string | null) {
  if (!code) return null
  return channels.find(
    item => item.code.toLowerCase() === code.toLowerCase() && item.status === 'ACTIVE'
  ) ?? null
}

function resolvePlatformAsset(mediaId: string | null, externalId: string | null) {
  if (!mediaId || !externalId) return null
  return platformAssets.find(
    item => item.mediaId === mediaId
      && item.externalId.toLowerCase() === externalId.toLowerCase()
      && item.status === 'ACTIVE'
  ) ?? null
}

function setException(
  row: BatchImportRow,
  code: BatchImportIssueCode,
  message: string
) {
  row.rowStatus = 'EXCEPTION'
  row.issueCode = code
  row.issueMessage = message
}

function setValid(row: BatchImportRow) {
  row.rowStatus = 'VALID'
  row.issueCode = null
  row.issueMessage = null
}

function validateRow(
  row: BatchImportRow,
  fileKeys: Map<string, string[]>
): void {
  if (row.rowStatus === 'IMPORTED' || row.rowStatus === 'SKIPPED') return

  const mediaCode = cell(row.raw, 'mediaCode') || row.mediaCode || ''
  const channelCode = cell(row.raw, 'channelCode') || row.channelCode || ''
  const externalAccountId
    = cell(row.raw, 'externalAccountId') || row.externalAccountId || ''
  const accountName = cell(row.raw, 'accountName') || row.name || ''
  const platformAssetExternalId
    = cell(row.raw, 'platformAssetExternalId') || row.platformAssetExternalId || ''
  const timezone = cell(row.raw, 'timezone') || row.timezone || ''
  const note = cell(row.raw, 'note') || row.note || ''

  row.mediaCode = mediaCode || null
  row.channelCode = channelCode || null
  row.externalAccountId = externalAccountId || null
  row.name = accountName || null
  row.platformAssetExternalId = platformAssetExternalId || null
  row.timezone = timezone || null
  row.note = note || null
  row.mediaId = null
  row.channelId = null
  row.platformAssetId = null
  row.updatedAt = nowIso()

  if (!externalAccountId) {
    setException(row, 'MISSING_ACCOUNT_ID', '缺少 Account ID（externalAccountId）')
    return
  }

  if (!mediaCode) {
    setException(row, 'UNKNOWN_MEDIA', '缺少 mediaCode')
    return
  }
  const media = resolveMedia(mediaCode)
  if (!media) {
    setException(row, 'UNKNOWN_MEDIA', `未知或已停用媒体: ${mediaCode}`)
    return
  }
  row.mediaId = media.id

  if (!channelCode) {
    setException(row, 'MISSING_CHANNEL', '缺少 channelCode')
    return
  }
  const channel = resolveChannel(channelCode)
  if (!channel) {
    setException(row, 'UNKNOWN_CHANNEL', `未知或已停用渠道: ${channelCode}`)
    return
  }
  row.channelId = channel.id

  if (timezone && !VALID_TIMEZONES.has(timezone)) {
    setException(row, 'INVALID_TIMEZONE', `无效时区: ${timezone}`)
    return
  }

  if (platformAssetExternalId) {
    const asset = resolvePlatformAsset(media.id, platformAssetExternalId)
    if (!asset) {
      setException(
        row,
        'UNKNOWN_PLATFORM_ASSET',
        `未知 Platform Asset: ${platformAssetExternalId}`
      )
      return
    }
    if (asset.sourceChannelId && asset.sourceChannelId !== channel.id) {
      setException(
        row,
        'UNKNOWN_PLATFORM_ASSET',
        `Platform Asset 不属于渠道 ${channelCode}`
      )
      return
    }
    row.platformAssetId = asset.id
  }

  const dedupeKey = `${media.id}::${externalAccountId.toLowerCase()}`
  const siblings = fileKeys.get(dedupeKey) ?? []
  if (siblings.length > 1 && siblings[0] !== row.id) {
    setException(row, 'DUPLICATE_IN_FILE', `文件内重复 Account ID: ${externalAccountId}`)
    return
  }

  if (findAccountByExternal(media.id, externalAccountId)) {
    setException(row, 'ALREADY_IN_FFJ', `账户已存在于 FFJ: ${externalAccountId}`)
    return
  }

  setValid(row)
}

function buildFileKeys(jobId: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of rows.filter(item => item.jobId === jobId)) {
    const mediaCode = cell(row.raw, 'mediaCode') || row.mediaCode || ''
    const externalId = cell(row.raw, 'externalAccountId') || row.externalAccountId || ''
    if (!mediaCode || !externalId) continue
    const media = resolveMedia(mediaCode)
    if (!media) continue
    const key = `${media.id}::${externalId.toLowerCase()}`
    const list = map.get(key) ?? []
    list.push(row.id)
    map.set(key, list)
  }
  return map
}

function runValidation(jobId: string): BatchImportJob {
  const job = requireJob(jobId)
  if (job.status === 'COMMITTED') {
    throw new Error('Committed job cannot be re-validated')
  }

  const fileKeys = buildFileKeys(jobId)
  for (const row of rows.filter(item => item.jobId === jobId)) {
    if (row.rowStatus === 'IMPORTED' || row.rowStatus === 'SKIPPED') continue
    validateRow(row, fileKeys)
  }

  recomputeStats(jobId)
  job.status = 'VALIDATED'
  job.validatedAt = nowIso()
  job.errorMessage = null
  return job
}

function seedSampleJob() {
  if (jobs.length) return

  jobSeq += 1
  const jobId = `bij-seed-001`
  const createdAt = nowIso()
  const job: BatchImportJob = {
    id: jobId,
    status: 'DRAFT',
    sourceFilename: 'sample-batch-import.csv',
    mediaId: null,
    channelId: null,
    stats: emptyStats(),
    createdAt,
    validatedAt: null,
    committedAt: null,
    errorMessage: null
  }
  jobs.push(job)

  const seedRaw: Record<string, string>[] = [
    {
      mediaCode: 'META',
      externalAccountId: 'act_import_900001',
      accountName: 'Import Meta Valid',
      channelCode: 'ALPHA',
      platformAssetExternalId: '123456',
      timezone: 'GMT+8',
      note: 'seed valid'
    },
    {
      mediaCode: 'META',
      externalAccountId: '',
      accountName: 'Import Missing ID',
      channelCode: 'ALPHA',
      platformAssetExternalId: '',
      timezone: 'GMT+8',
      note: 'seed missing id'
    },
    {
      mediaCode: 'META',
      externalAccountId: 'act_100001',
      accountName: 'Already in FFJ',
      channelCode: 'ALPHA',
      platformAssetExternalId: '',
      timezone: 'GMT+8',
      note: 'seed already exists'
    },
    {
      mediaCode: 'META',
      externalAccountId: 'act_import_dup',
      accountName: 'Dup A',
      channelCode: 'BETA',
      platformAssetExternalId: '',
      timezone: 'GMT+8',
      note: 'dup first'
    },
    {
      mediaCode: 'META',
      externalAccountId: 'act_import_dup',
      accountName: 'Dup B',
      channelCode: 'BETA',
      platformAssetExternalId: '',
      timezone: 'GMT+8',
      note: 'dup second'
    }
  ]

  for (let i = 0; i < seedRaw.length; i++) {
    rowSeq += 1
    const raw = seedRaw[i]!
    rows.push({
      id: `bir-seed-${String(i + 1).padStart(3, '0')}`,
      jobId,
      rowIndex: i + 1,
      raw: { ...raw },
      mediaId: null,
      mediaCode: raw.mediaCode || null,
      externalAccountId: raw.externalAccountId || null,
      name: raw.accountName || null,
      channelId: null,
      channelCode: raw.channelCode || null,
      platformAssetId: null,
      platformAssetExternalId: raw.platformAssetExternalId || null,
      timezone: raw.timezone || null,
      note: raw.note || null,
      rowStatus: 'EXCEPTION',
      issueCode: null,
      issueMessage: null,
      importedAccountId: null,
      updatedAt: createdAt
    })
  }

  runValidation(jobId)
}

seedSampleJob()

function templateExampleRows(): Record<string, unknown>[] {
  return [
    {
      mediaCode: 'META',
      externalAccountId: 'act_example_001',
      accountName: 'Example Account',
      channelCode: 'ALPHA',
      platformAssetExternalId: '123456',
      timezone: 'GMT+8',
      note: ''
    }
  ]
}

export const batchImportService: BatchImportService = {
  async downloadTemplate(format: ExportFormat) {
    const columns = BATCH_IMPORT_TEMPLATE_COLUMNS.map(col => ({
      key: col.key,
      header: col.header
    }))
    const example = templateExampleRows()
    if (format === 'csv') {
      await saveBlob(
        stampFilename('ffj-account-import-template', 'csv'),
        toCsvBlob(example, columns),
        'csv'
      )
      return
    }
    await saveBlob(
      stampFilename('ffj-account-import-template', 'xlsx'),
      toXlsx(example, columns),
      'xlsx'
    )
  },

  async createJobFromCsv(text, filename) {
    const parsed = parseCsv(text)
    if (!parsed.rows.length) {
      throw new Error('CSV 无数据行')
    }

    const required = ['mediaCode', 'externalAccountId', 'channelCode']
    for (const key of required) {
      if (!parsed.headers.includes(key)) {
        throw new Error(`CSV 缺少列: ${key}`)
      }
    }

    jobSeq += 1
    const jobId = `bij-${String(jobSeq).padStart(3, '0')}`
    const createdAt = nowIso()
    const job: BatchImportJob = {
      id: jobId,
      status: 'DRAFT',
      sourceFilename: filename || 'upload.csv',
      mediaId: null,
      channelId: null,
      stats: emptyStats(),
      createdAt,
      validatedAt: null,
      committedAt: null,
      errorMessage: null
    }
    jobs.unshift(job)

    parsed.rows.forEach((raw, index) => {
      rowSeq += 1
      rows.push({
        id: `bir-${String(rowSeq).padStart(4, '0')}`,
        jobId,
        rowIndex: index + 1,
        raw: { ...raw },
        mediaId: null,
        mediaCode: cell(raw, 'mediaCode') || null,
        externalAccountId: cell(raw, 'externalAccountId') || null,
        name: cell(raw, 'accountName') || null,
        channelId: null,
        channelCode: cell(raw, 'channelCode') || null,
        platformAssetId: null,
        platformAssetExternalId: cell(raw, 'platformAssetExternalId') || null,
        timezone: cell(raw, 'timezone') || null,
        note: cell(raw, 'note') || null,
        rowStatus: 'EXCEPTION' as BatchImportRowStatus,
        issueCode: null,
        issueMessage: null,
        importedAccountId: null,
        updatedAt: createdAt
      })
    })

    return cloneJob(runValidation(jobId))
  },

  async validateJob(jobId) {
    return cloneJob(runValidation(jobId))
  },

  async confirmImport(jobId): Promise<ConfirmBatchImportResult> {
    const job = requireJob(jobId)
    if (job.status === 'COMMITTED') {
      throw new Error('Job already committed')
    }

    runValidation(jobId)

    const accountIds: string[] = []
    let imported = 0
    let skipped = 0

    for (const row of rows.filter(item => item.jobId === jobId)) {
      if (row.rowStatus === 'IMPORTED') continue
      if (row.rowStatus === 'EXCEPTION') continue
      if (row.rowStatus !== 'VALID') continue

      if (!row.mediaId || !row.externalAccountId || !row.channelId) {
        setException(row, 'MISSING_ACCOUNT_ID', '行数据不完整')
        continue
      }

      if (findAccountByExternal(row.mediaId, row.externalAccountId)) {
        row.rowStatus = 'SKIPPED'
        row.issueCode = 'ALREADY_IN_FFJ'
        row.issueMessage = `账户已存在，跳过: ${row.externalAccountId}`
        skipped += 1
        continue
      }

      try {
        const { account } = intakeAdAccount({
          mediaId: row.mediaId,
          externalAccountId: row.externalAccountId,
          sourceChannelId: row.channelId,
          name: row.name,
          timezone: row.timezone,
          platformAssetId: row.platformAssetId,
          note: row.note || `Batch import ${job.sourceFilename}`,
          intakeSource: 'BATCH_IMPORT',
          reason: `Batch import ${job.id}`
        })
        row.rowStatus = 'IMPORTED'
        row.issueCode = null
        row.issueMessage = null
        row.importedAccountId = account.id
        row.updatedAt = nowIso()
        accountIds.push(account.id)
        imported += 1
      } catch (error) {
        setException(
          row,
          'ALREADY_IN_FFJ',
          error instanceof Error ? error.message : '导入失败'
        )
      }
    }

    recomputeStats(jobId)
    const exception = job.stats.exception
    // Partial import: leave VALIDATED so exception rows can still be patched / re-confirmed.
    if (exception > 0 || job.stats.valid > 0) {
      job.status = 'VALIDATED'
      job.committedAt = null
    } else {
      job.status = 'COMMITTED'
      job.committedAt = nowIso()
    }
    job.errorMessage = null

    return {
      job: cloneJob(job),
      imported,
      skipped,
      exception,
      accountIds
    }
  },

  async listJobs(query = {}) {
    let list = [...jobs]
    if (query.status) {
      list = list.filter(item => item.status === query.status)
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const page = paginate(list, query.page, query.pageSize)
    return {
      data: page.data.map(cloneJob),
      pagination: page.pagination
    }
  },

  async getJob(jobId) {
    const job = jobs.find(item => item.id === jobId)
    return job ? cloneJob(job) : null
  },

  async listRows(query = {}) {
    let list = [...rows]
    if (query.jobId) {
      list = list.filter(item => item.jobId === query.jobId)
    }
    if (query.issueCodes?.length) {
      list = list.filter(
        item => item.issueCode && query.issueCodes!.includes(item.issueCode)
      )
    }
    if (query.rowStatuses?.length) {
      list = list.filter(item => query.rowStatuses!.includes(item.rowStatus))
    }
    if (query.keyword?.trim()) {
      const kw = query.keyword.trim().toLowerCase()
      list = list.filter((item) => {
        const hay = [
          item.externalAccountId,
          item.name,
          item.mediaCode,
          item.channelCode,
          item.issueMessage
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(kw)
      })
    }
    list.sort((a, b) => a.rowIndex - b.rowIndex)
    const page = paginate(list, query.page, query.pageSize)
    return {
      data: page.data.map(cloneRow),
      pagination: page.pagination
    }
  },

  async patchExceptionRows(jobId, patches: PatchBatchImportRowInput[]) {
    const job = requireJob(jobId)
    if (job.status === 'COMMITTED') {
      throw new Error('Committed job cannot be patched')
    }

    for (const patch of patches) {
      const row = rows.find(item => item.id === patch.rowId && item.jobId === jobId)
      if (!row) throw new Error(`Unknown row: ${patch.rowId}`)
      if (row.rowStatus === 'IMPORTED') continue

      if (patch.externalAccountId !== undefined) {
        const value = patch.externalAccountId?.trim() || ''
        row.raw.externalAccountId = value
        row.externalAccountId = value || null
      }
      if (patch.mediaCode !== undefined) {
        const value = patch.mediaCode?.trim() || ''
        row.raw.mediaCode = value
        row.mediaCode = value || null
      }
      if (patch.channelCode !== undefined) {
        const value = patch.channelCode?.trim() || ''
        row.raw.channelCode = value
        row.channelCode = value || null
      }
      if (patch.accountName !== undefined) {
        const value = patch.accountName?.trim() || ''
        row.raw.accountName = value
        row.name = value || null
      }
      if (patch.platformAssetExternalId !== undefined) {
        const value = patch.platformAssetExternalId?.trim() || ''
        row.raw.platformAssetExternalId = value
        row.platformAssetExternalId = value || null
      }
      if (patch.timezone !== undefined) {
        const value = patch.timezone?.trim() || ''
        row.raw.timezone = value
        row.timezone = value || null
      }
      if (patch.note !== undefined) {
        const value = patch.note?.trim() || ''
        row.raw.note = value
        row.note = value || null
      }
      row.updatedAt = nowIso()
    }

    return cloneJob(runValidation(jobId))
  },

  async getJobStats(jobId) {
    requireJob(jobId)
    return { ...recomputeStats(jobId) }
  }
}
