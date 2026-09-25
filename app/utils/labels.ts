/** Shared Chinese display labels for enums / statuses shown in the UI. */

export const ASSET_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: '可用',
  ASSIGNED: '已分配',
  IN_USE: '使用中',
  IDLE: '闲置',
  DISABLED: '停用',
  ARCHIVED: '归档'
}

export const MEDIA_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '正常',
  RESTRICTED: '受限',
  DISABLED: '停用',
  BANNED: '封禁',
  UNKNOWN: '未知'
}

export const ENTITY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '启用',
  DISABLED: '停用',
  ARCHIVED: '归档',
  PENDING_APPROVAL: '待审批'
}

export const API_ACCESS_STATUS_LABEL: Record<string, string> = {
  ACCESSIBLE: '可访问',
  LOST: '已失效',
  UNKNOWN: '未知'
}

export const DEMAND_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  APPROVED: '已审批',
  REJECTED: '已驳回',
  PARTIALLY_ALLOCATED: '部分分配',
  FULFILLED: '已满足',
  CANCELLED: '已取消',
  CLOSED: '已关闭'
}

export const DEMAND_PRIORITY_LABEL: Record<string, string> = {
  LOW: '低',
  NORMAL: '普通',
  HIGH: '高',
  URGENT: '紧急'
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待处理',
  PENDING_CONFIRM: '待确认',
  ACCEPTED: '已接单',
  REJECTED: '已拒绝',
  TIMEOUT: '已超时',
  PROCESSING: '履约中',
  PARTIAL_DELIVERED: '部分交付',
  DELIVERED: '已交付',
  PARTIAL_CLOSED: '部分关闭',
  PARSING_EXCEPTION: '解析异常',
  QUANTITY_EXCEPTION: '数量异常',
  CANCELLED: '已取消'
}

export const ALERT_TYPE_LABEL: Record<string, string> = {
  TEAM_ACCOUNT_SHORTAGE: '团队账户缺口',
  POOL_SHORTAGE: '账户池缺口',
  ACCOUNT_BANNED: '账户封禁',
  NO_SPEND_48H: '48 小时无消耗',
  DEMAND_OVERDUE: '需求逾期',
  API_ACCESS_LOST: 'API 访问失效',
  SYNC_FAILED: '同步失败',
  CREDENTIAL_EXPIRED: '凭据过期',
  RECONCILIATION_VARIANCE: '对账差异',
  CHANNEL_BALANCE_LOW: '渠道余额不足'
}

export const ALERT_SEVERITY_LABEL: Record<string, string> = {
  URGENT: '紧急',
  WARNING: '警告',
  INFO: '信息'
}

export const ALERT_STATUS_LABEL: Record<string, string> = {
  OPEN: '待处理',
  IN_PROGRESS: '处理中',
  RESOLVED: '已解决',
  IGNORED: '已忽略'
}

export const ALERT_ENTITY_TYPE_LABEL: Record<string, string> = {
  AdAccount: '广告账户',
  AccountDemand: '账户需求',
  Team: '团队',
  Channel: '渠道',
  SyncJob: '同步任务'
}

export const CREDENTIAL_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  MOCK_CONNECTED: 'Mock 已连接',
  EXPIRED: '已过期',
  REVOKED: '已吊销'
}

export const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: '平台管理员',
  ORG_ADMIN: '组织管理员',
  TEAM_MANAGER: '团队负责人',
  TEAM_MEMBER: '团队成员'
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CRYPTO: '加密货币',
  FIAT: '法币'
}

export const RECONCILIATION_STATUS_LABEL: Record<string, string> = {
  OPEN: '待确认',
  CONFIRMED: '已确认'
}

export const PREPAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  CANCELLED: '已取消'
}

export const REFUND_STATUS_LABEL: Record<string, string> = {
  PENDING: '待处理',
  CONFIRMED: '已确认',
  REJECTED: '已拒绝',
  CANCELLED: '已取消'
}

export function labelOf(map: Record<string, string>, value: string | null | undefined, fallback?: string): string {
  if (!value) return fallback ?? '—'
  return map[value] ?? fallback ?? value
}

export function optionsFromLabels(map: Record<string, string>): { label: string, value: string }[] {
  return Object.entries(map).map(([value, label]) => ({ label, value }))
}
