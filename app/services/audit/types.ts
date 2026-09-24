import type { AuditAction, AuditLog } from '../../domain/audit'

export interface AppendAuditInput {
  organizationId: string
  teamId?: string | null
  actorUserId: string
  action: AuditAction
  resourceType: string
  resourceId: string
  beforeJson?: string | null
  afterJson?: string | null
}

export interface AuditService {
  append(input: AppendAuditInput): Promise<AuditLog>
  list(query?: { organizationId?: string, action?: AuditAction, limit?: number }): Promise<AuditLog[]>
}
