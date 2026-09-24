import type {
  ConnectorSyncLog,
  LogsService,
  OperationLog
} from './types'
import { auditLogs, appUsers } from '../../mocks/entities'

const operationLogs: OperationLog[] = [
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

const syncLogs: ConnectorSyncLog[] = [
  {
    id: 'sync-1',
    at: '2026-09-19T06:00:00.000Z',
    connector: 'meta-ads',
    media: 'Meta',
    scope: 'BM · 全量账户',
    status: 'SUCCEEDED',
    count: 128,
    errorSummary: null
  },
  {
    id: 'sync-2',
    at: '2026-09-19T05:30:00.000Z',
    connector: 'google-ads',
    media: 'Google',
    scope: 'MCC · 昨日消耗',
    status: 'PARTIAL',
    count: 46,
    errorSummary: '3 个账户凭证过期，已跳过'
  },
  {
    id: 'sync-3',
    at: '2026-09-18T22:10:00.000Z',
    connector: 'tiktok-ads',
    media: 'TikTok',
    scope: 'BC · 账户发现',
    status: 'FAILED',
    count: 0,
    errorSummary: 'Connector 未绑定凭证'
  },
  {
    id: 'sync-4',
    at: '2026-09-18T06:00:00.000Z',
    connector: 'meta-ads',
    media: 'Meta',
    scope: 'BM · 增量',
    status: 'SUCCEEDED',
    count: 12,
    errorSummary: null
  }
]

function auditToOperationLog(): OperationLog[] {
  return auditLogs.map((entry) => {
    const actor = appUsers.find(u => u.id === entry.actorUserId)
    return {
      id: entry.id,
      at: entry.createdAt,
      actor: actor?.displayName ?? entry.actorUserId,
      module: '平台连接 / 账户权限',
      action: entry.action,
      target: `${entry.resourceType}:${entry.resourceId}`,
      result: 'SUCCESS' as const
    }
  })
}

export const logsService: LogsService = {
  async getOperationLogs() {
    const merged = [...auditToOperationLog(), ...operationLogs]
    merged.sort((a, b) => b.at.localeCompare(a.at))
    return merged.map(item => ({ ...item }))
  },
  async getSyncLogs() {
    return syncLogs.map(item => ({ ...item }))
  }
}
