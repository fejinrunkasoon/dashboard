import type { AuditLog } from '../../domain/audit'
import { auditLogs } from '../../mocks/entities'
import type { AppendAuditInput, AuditService } from './types'

let seq = 0

export const auditService: AuditService = {
  async append(input: AppendAuditInput) {
    seq += 1
    const entry: AuditLog = {
      id: `aud-${String(seq).padStart(4, '0')}`,
      organizationId: input.organizationId,
      teamId: input.teamId ?? null,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      beforeJson: input.beforeJson ?? null,
      afterJson: input.afterJson ?? null,
      ip: null,
      userAgent: null,
      createdAt: new Date().toISOString()
    }
    auditLogs.unshift(entry)
    return { ...entry }
  },

  async list(query) {
    let rows = [...auditLogs]
    if (query?.organizationId) {
      rows = rows.filter(r => r.organizationId === query.organizationId)
    }
    if (query?.action) {
      rows = rows.filter(r => r.action === query.action)
    }
    const limit = query?.limit ?? 100
    return rows.slice(0, limit).map(r => ({ ...r }))
  }
}
