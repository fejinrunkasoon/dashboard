import { paginate } from '../../domain/common'
import { isShortageAlertType } from '../../domain/alert'
import type { Alert, AlertQuery } from '../../domain/alert'
import { alerts } from '../../mocks'
import type {
  AlertService,
  EnsureShortageAlertInput
} from './types'

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS'])

function nowIso() {
  return new Date().toISOString()
}

function requireAlert(id: string): Alert {
  const alert = alerts.find(item => item.id === id)
  if (!alert) throw new Error(`Unknown alert: ${id}`)
  return alert
}

function cloneAlert(alert: Alert): Alert {
  return { ...alert }
}

function filterAlerts(query: AlertQuery = {}): Alert[] {
  let rows = [...alerts]

  if (query.types?.length) {
    rows = rows.filter(item => query.types!.includes(item.type))
  }
  if (query.severities?.length) {
    rows = rows.filter(item => query.severities!.includes(item.severity))
  }
  if (query.statuses?.length) {
    rows = rows.filter(item => query.statuses!.includes(item.status))
  }
  if (query.entityType) {
    rows = rows.filter(item => item.entityType === query.entityType)
  }
  if (query.relatedDemandItemId) {
    rows = rows.filter(item => item.relatedDemandItemId === query.relatedDemandItemId)
  }
  if (query.assigneeUserId) {
    rows = rows.filter(item => item.assigneeUserId === query.assigneeUserId)
  }
  if (query.assigned === true) {
    rows = rows.filter(item => Boolean(item.assigneeUserId))
  } else if (query.assigned === false) {
    rows = rows.filter(item => !item.assigneeUserId)
  }
  if (query.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    rows = rows.filter(item =>
      item.title.toLowerCase().includes(q)
      || item.description.toLowerCase().includes(q)
      || item.type.toLowerCase().includes(q)
    )
  }

  rows.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
  return rows
}

function findOpenShortageByItem(demandItemId: string): Alert | undefined {
  return alerts.find(item =>
    item.relatedDemandItemId === demandItemId
    && isShortageAlertType(item.type)
    && OPEN_STATUSES.has(item.status)
  )
}

export const alertService: AlertService = {
  async getAlerts(query: AlertQuery = {}) {
    return paginate(filterAlerts(query), query.page ?? 1, query.pageSize ?? 20)
  },

  async getAlertById(id) {
    return alerts.find(item => item.id === id) ?? null
  },

  async getOpenCount() {
    return alerts.filter(item => OPEN_STATUSES.has(item.status)).length
  },

  async acknowledge(id, assigneeUserId) {
    const alert = requireAlert(id)
    if (alert.status !== 'OPEN' && alert.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot acknowledge alert in status ${alert.status}`)
    }
    if (!assigneeUserId?.trim()) {
      throw new Error('assigneeUserId is required')
    }
    alert.status = 'IN_PROGRESS'
    alert.assigneeUserId = assigneeUserId.trim()
    return cloneAlert(alert)
  },

  async resolve(id, note) {
    const alert = requireAlert(id)
    if (alert.status === 'RESOLVED' || alert.status === 'IGNORED') {
      throw new Error(`Alert already closed as ${alert.status}`)
    }
    alert.status = 'RESOLVED'
    alert.resolvedAt = nowIso()
    alert.resolutionNote = note?.trim() || null
    return cloneAlert(alert)
  },

  async ignore(id, note) {
    const alert = requireAlert(id)
    if (alert.status === 'RESOLVED' || alert.status === 'IGNORED') {
      throw new Error(`Alert already closed as ${alert.status}`)
    }
    alert.status = 'IGNORED'
    alert.resolvedAt = nowIso()
    alert.resolutionNote = note?.trim() || null
    return cloneAlert(alert)
  },

  async reopen(id) {
    const alert = requireAlert(id)
    if (alert.status !== 'RESOLVED' && alert.status !== 'IGNORED') {
      throw new Error(`Cannot reopen alert in status ${alert.status}`)
    }
    alert.status = 'OPEN'
    alert.resolvedAt = null
    alert.resolutionNote = null
    alert.assigneeUserId = null
    return cloneAlert(alert)
  },

  async ensureShortageAlert(input: EnsureShortageAlertInput) {
    if (input.shortage <= 0) {
      throw new Error('shortage must be > 0 to ensure shortage alert')
    }

    const existing = findOpenShortageByItem(input.demandItemId)
    const description
      = `${input.demandNo} Shortage ${input.shortage}`
        + `（剩余 ${input.remainingQuantity}，池匹配 ${input.poolMatchCount}）`

    if (existing) {
      existing.type = input.kind
      existing.description = description
      existing.relatedDemandId = input.demandId
      existing.relatedDemandItemId = input.demandItemId
      existing.relatedTeamId = input.teamId
      if (input.relatedChannelOrderId !== undefined) {
        existing.relatedChannelOrderId = input.relatedChannelOrderId
      }
      if (input.kind === 'TEAM_ACCOUNT_SHORTAGE') {
        existing.entityType = 'Team'
        existing.entityId = input.teamId
        existing.title = '团队账户不足'
      } else {
        existing.entityType = 'AccountDemand'
        existing.entityId = input.demandId
        existing.title = '账户池库存不足'
      }
      return cloneAlert(existing)
    }

    const alert: Alert = {
      id: `al-shortage-${input.demandItemId}`,
      type: input.kind,
      severity: 'WARNING',
      entityType: input.kind === 'TEAM_ACCOUNT_SHORTAGE' ? 'Team' : 'AccountDemand',
      entityId: input.kind === 'TEAM_ACCOUNT_SHORTAGE' ? input.teamId : input.demandId,
      title: input.kind === 'TEAM_ACCOUNT_SHORTAGE' ? '团队账户不足' : '账户池库存不足',
      description,
      status: 'OPEN',
      assigneeUserId: null,
      detectedAt: nowIso(),
      resolvedAt: null,
      relatedDemandId: input.demandId,
      relatedDemandItemId: input.demandItemId,
      relatedChannelOrderId: input.relatedChannelOrderId ?? null,
      relatedTeamId: input.teamId,
      resolutionNote: null
    }
    alerts.push(alert)
    return cloneAlert(alert)
  },

  async reportCredentialLost(accountId) {
    const existing = alerts.find(item =>
      item.type === 'CREDENTIAL_EXPIRED'
      && item.entityId === accountId
      && OPEN_STATUSES.has(item.status)
    )
    if (existing) return cloneAlert(existing)
    const alert: Alert = {
      id: `al-cred-${accountId}-${alerts.length + 1}`,
      type: 'CREDENTIAL_EXPIRED',
      severity: 'WARNING',
      entityType: 'AdAccount',
      entityId: accountId,
      title: '凭据需重连',
      description: `账户 ${accountId} 的 API 访问已丢失。分配已继续，请有权限的人重连 Credential。`,
      status: 'OPEN',
      assigneeUserId: null,
      detectedAt: nowIso(),
      resolvedAt: null,
      relatedDemandId: null,
      relatedDemandItemId: null,
      relatedChannelOrderId: null,
      relatedTeamId: null,
      resolutionNote: null
    }
    alerts.push(alert)
    return cloneAlert(alert)
  },

  async ensureApiAccessLostAlert(accountId) {
    const existing = alerts.find(item =>
      item.type === 'API_ACCESS_LOST'
      && item.entityId === accountId
      && OPEN_STATUSES.has(item.status)
    )
    if (existing) return cloneAlert(existing)
    const alert: Alert = {
      id: `al-api-lost-${accountId}-${alerts.length + 1}`,
      type: 'API_ACCESS_LOST',
      severity: 'WARNING',
      entityType: 'AdAccount',
      entityId: accountId,
      title: '媒体侧不存在',
      description: `账户 ${accountId} 在 FFJ 中存在，但最近一次 Media Sync 未发现。请人工审核（导入异常 / 权限范围 / 已删户）。`,
      status: 'OPEN',
      assigneeUserId: null,
      detectedAt: nowIso(),
      resolvedAt: null,
      relatedDemandId: null,
      relatedDemandItemId: null,
      relatedChannelOrderId: null,
      relatedTeamId: null,
      resolutionNote: null
    }
    alerts.push(alert)
    return cloneAlert(alert)
  },

  async reportSyncFailed(jobId, message) {
    const existing = alerts.find(item =>
      item.type === 'SYNC_FAILED'
      && item.entityId === jobId
      && OPEN_STATUSES.has(item.status)
    )
    if (existing) {
      existing.description = message
      return cloneAlert(existing)
    }
    const alert: Alert = {
      id: `al-sync-fail-${jobId}`,
      type: 'SYNC_FAILED',
      severity: 'URGENT',
      entityType: 'SyncJob',
      entityId: jobId,
      title: '媒体同步失败',
      description: message,
      status: 'OPEN',
      assigneeUserId: null,
      detectedAt: nowIso(),
      resolvedAt: null,
      relatedDemandId: null,
      relatedDemandItemId: null,
      relatedChannelOrderId: null,
      relatedTeamId: null,
      resolutionNote: null
    }
    alerts.push(alert)
    return cloneAlert(alert)
  },

  async resolveShortageAlertsForDemandItem(demandItemId) {
    let count = 0
    const ts = nowIso()
    for (const alert of alerts) {
      if (
        alert.relatedDemandItemId === demandItemId
        && isShortageAlertType(alert.type)
        && OPEN_STATUSES.has(alert.status)
      ) {
        alert.status = 'RESOLVED'
        alert.resolvedAt = ts
        alert.resolutionNote = 'Shortage cleared after allocate'
        count += 1
      }
    }
    return count
  },

  async ensureChannelBalanceAlerts(channelId, summaries, threshold) {
    const ts = nowIso()
    const enabled = new Set(threshold.enabledTags)

    for (const summary of summaries) {
      const alertId = `al-balance-${channelId}-${summary.ownership}`
      const existing = alerts.find(
        item => item.id === alertId || (
          item.type === 'CHANNEL_BALANCE_LOW'
          && item.entityId === channelId
          && item.description.includes(summary.ownership)
          && OPEN_STATUSES.has(item.status)
        )
      )

      if (!enabled.has(summary.ownership)) {
        if (existing && OPEN_STATUSES.has(existing.status)) {
          existing.status = 'RESOLVED'
          existing.resolvedAt = ts
          existing.resolutionNote = 'Tag not monitored'
        }
        continue
      }

      const absHit = threshold.absoluteBalanceBelow != null
        && summary.remaining < threshold.absoluteBalanceBelow
      const runwayHit = threshold.daysOfRunwayBelow != null
        && summary.runwayDays != null
        && summary.runwayDays < threshold.daysOfRunwayBelow
      const breached = absHit || runwayHit

      const tagLabel = summary.ownership === 'INTERNAL' ? '自家' : '外接'
      const description
        = `${tagLabel}池剩余 ${summary.remaining.toFixed(2)}`
          + (summary.runwayDays != null
            ? ` · 预计可用 ${summary.runwayDays.toFixed(1)} 天`
            : '')
          + (absHit ? ` · 低于金额阈值 ${threshold.absoluteBalanceBelow}` : '')
          + (runwayHit ? ` · 低于天数阈值 ${threshold.daysOfRunwayBelow}` : '')

      if (!breached) {
        if (existing && OPEN_STATUSES.has(existing.status)) {
          existing.status = 'RESOLVED'
          existing.resolvedAt = ts
          existing.resolutionNote = 'Balance recovered above threshold'
        }
        continue
      }

      if (existing) {
        existing.description = description
        existing.severity = threshold.severity
        existing.title = `渠道余额不足（${tagLabel}）`
        continue
      }

      alerts.push({
        id: alertId,
        type: 'CHANNEL_BALANCE_LOW',
        severity: threshold.severity,
        entityType: 'Channel',
        entityId: channelId,
        title: `渠道余额不足（${tagLabel}）`,
        description,
        status: 'OPEN',
        assigneeUserId: null,
        detectedAt: ts,
        resolvedAt: null,
        relatedDemandId: null,
        relatedDemandItemId: null,
        relatedChannelOrderId: null,
        relatedTeamId: null,
        resolutionNote: null
      })
    }
  }
}
