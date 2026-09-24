/** Audit trail — who did what (distinct from Sync Log). */

export type AuditAction =
  | 'CONNECT_PLATFORM'
  | 'REAUTHORIZE_CONNECTION'
  | 'DISCONNECT_PLATFORM'
  | 'DISCOVER_ACCOUNT'
  | 'IMPORT_ACCOUNT'
  | 'ASSIGN_ACCOUNT'
  | 'UNASSIGN_ACCOUNT'
  | 'ENABLE_SYNC'
  | 'DISABLE_SYNC'
  | 'CHANGE_PRIMARY_CONNECTION'
  | 'ARCHIVE_ACCOUNT'

export interface AuditLog {
  id: string
  organizationId: string
  teamId?: string | null
  actorUserId: string
  action: AuditAction
  resourceType: string
  resourceId: string
  beforeJson?: string | null
  afterJson?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
}
