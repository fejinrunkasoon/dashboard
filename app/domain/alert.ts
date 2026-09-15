export type AlertSeverity = 'INFO' | 'WARNING' | 'URGENT'

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED'

export interface Alert {
  id: string
  type: string
  severity: AlertSeverity
  entityType: string
  entityId: string
  title: string
  description: string
  status: AlertStatus
  assigneeUserId?: string | null
  detectedAt: string
  resolvedAt?: string | null
}

export interface AlertQuery {
  keyword?: string
  types?: string[]
  severities?: AlertSeverity[]
  statuses?: AlertStatus[]
  entityType?: string
  page?: number
  pageSize?: number
}
