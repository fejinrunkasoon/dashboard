import type { AuditAction, AuditLog } from '../../domain/audit'
import type { SyncJob } from '../../domain/sync'
import { appUsers, mediaPlatforms } from '../../mocks/entities'
import { auditService } from '../audit/mock'
import { mediaSyncService } from '../media-sync/mock'
import type {
  ConnectorSyncLog,
  LogsService,
  OperationLog,
  OperationLogQuery,
  SyncLogListQuery,
  SyncLogStatus
} from './types'

/** Demo seed — 保证空审计时仍可浏览过滤；真实操作写入的 audit / sync job 会排在前面。 */
const seedOperationLogs: OperationLog[] = [
  {
    id: 'op-1',
    at: '2026-09-19T08:12:00.000Z',
    actor: 'Admin',
    module: '产品与客户',
    action: '创建产品',
    target: 'APP_C',
    result: 'SUCCESS'
  },
  {
    id: 'op-2',
    at: '2026-09-19T07:40:00.000Z',
    actor: '王五',
    module: '组织与成员',
    action: '成员调组',
    target: '张三 → Team B',
    result: 'SUCCESS'
  },
  {
    id: 'op-3',
    at: '2026-09-18T16:05:00.000Z',
    actor: '财务小张',
    module: '规则配置',
    action: '更新预警阈值',
    target: '对账差异 5%',
    result: 'SUCCESS'
  },
  {
    id: 'op-4',
    at: '2026-09-18T11:22:00.000Z',
    actor: '赵磊',
    module: '用户与权限',
    action: '修改角色权限',
    target: '团队负责人 · 转移账户',
    result: 'FAILED'
  },
  {
    id: 'op-5',
    at: '2026-09-17T09:18:00.000Z',
    actor: 'Admin',
    module: '数据字典',
    action: '停用枚举',
    target: 'RECYCLE_REASON · QUALITY',
    result: 'SUCCESS'
  }
]

const ACTION_LABEL: Record<AuditAction, string> = {
  CONNECT_PLATFORM: '连接平台',
  REAUTHORIZE_CONNECTION: '重新授权',
  DISCONNECT_PLATFORM: '断开连接',
  DISCOVER_ACCOUNT: '发现账户',
  IMPORT_ACCOUNT: '导入账户',
  ASSIGN_ACCOUNT: '分配账户',
  UNASSIGN_ACCOUNT: '取消分配',
  ENABLE_SYNC: '启用同步',
  DISABLE_SYNC: '停用同步',
  CHANGE_PRIMARY_CONNECTION: '更换主连接',
  ARCHIVE_ACCOUNT: '归档账户'
}

const ACTION_MODULE: Record<AuditAction, string> = {
  CONNECT_PLATFORM: '平台连接',
  REAUTHORIZE_CONNECTION: '平台连接',
  DISCONNECT_PLATFORM: '平台连接',
  DISCOVER_ACCOUNT: '平台连接',
  IMPORT_ACCOUNT: '平台连接',
  CHANGE_PRIMARY_CONNECTION: '平台连接',
  ASSIGN_ACCOUNT: '账户权限',
  UNASSIGN_ACCOUNT: '账户权限',
  ARCHIVE_ACCOUNT: '账户权限',
  ENABLE_SYNC: '同步控制',
  DISABLE_SYNC: '同步控制'
}

function mediaName(mediaId: string) {
  return mediaPlatforms.find(p => p.id === mediaId)?.name ?? mediaId
}

function auditToOperationLog(entry: AuditLog): OperationLog {
  const actor = appUsers.find(u => u.id === entry.actorUserId)
  return {
    id: entry.id,
    at: entry.createdAt,
    actor: actor?.displayName ?? entry.actorUserId,
    module: ACTION_MODULE[entry.action] ?? '平台连接',
    action: ACTION_LABEL[entry.action] ?? entry.action,
    target: `${entry.resourceType}:${entry.resourceId}`,
    result: 'SUCCESS'
  }
}

function jobToConnectorSyncLog(job: SyncJob): ConnectorSyncLog {
  let status: SyncLogStatus = job.status
  if (job.status === 'SUCCEEDED' && (job.stats.conflictCount > 0 || job.errorMessage)) {
    status = 'PARTIAL'
  }
  const count = job.stats.discovered || job.stats.imported || job.stats.newCount
  const scopeParts = [
    job.connectionId ? `connection:${job.connectionId}` : null,
    '账户发现'
  ].filter(Boolean)
  return {
    id: job.id,
    at: job.finishedAt ?? job.startedAt,
    connector: job.implKey,
    media: mediaName(job.mediaId),
    mediaId: job.mediaId,
    scope: scopeParts.join(' · '),
    status,
    count,
    errorSummary: job.errorMessage
  }
}

function matchKeyword(haystack: string, keyword?: string) {
  if (!keyword?.trim()) return true
  return haystack.toLowerCase().includes(keyword.trim().toLowerCase())
}

function filterOperationLogs(rows: OperationLog[], query?: OperationLogQuery) {
  let next = rows
  if (query?.module) {
    next = next.filter(r => r.module === query.module)
  }
  if (query?.result) {
    next = next.filter(r => r.result === query.result)
  }
  if (query?.actor?.trim()) {
    const q = query.actor.trim().toLowerCase()
    next = next.filter(r => r.actor.toLowerCase().includes(q))
  }
  if (query?.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    next = next.filter(r =>
      matchKeyword(`${r.module} ${r.action} ${r.target} ${r.actor}`, q)
    )
  }
  return next
}

function filterSyncLogs(rows: ConnectorSyncLog[], query?: SyncLogListQuery) {
  let next = rows
  if (query?.mediaId) {
    next = next.filter(r => r.mediaId === query.mediaId)
  }
  if (query?.status) {
    next = next.filter(r => r.status === query.status)
  }
  if (query?.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    next = next.filter(r =>
      matchKeyword(`${r.connector} ${r.media} ${r.scope} ${r.errorSummary ?? ''}`, q)
    )
  }
  return next
}

export const logsService: LogsService = {
  async getOperationLogs(query) {
    const live = (await auditService.list({ limit: 500 })).map(auditToOperationLog)
    const merged = [...live, ...seedOperationLogs]
    merged.sort((a, b) => b.at.localeCompare(a.at))
    return filterOperationLogs(merged, query).map(item => ({ ...item }))
  },

  async getSyncLogs(query) {
    const { data: jobs } = await mediaSyncService.getJobs({ page: 1, pageSize: 200 })
    const rows = jobs.map(jobToConnectorSyncLog)
    rows.sort((a, b) => b.at.localeCompare(a.at))
    return filterSyncLogs(rows, query).map(item => ({ ...item }))
  },

  async listOperationModules() {
    const rows = await this.getOperationLogs()
    return [...new Set(rows.map(r => r.module))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }
}
