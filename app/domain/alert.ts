export type AlertSeverity = 'INFO' | 'WARNING' | 'URGENT'

/** Plan §31 — no ACKNOWLEDGED. */
export type AlertStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED'

export type AlertType =
  | 'ACCOUNT_BANNED'
  | 'ACCOUNT_RESTRICTED'
  | 'NO_SPEND_24H'
  | 'NO_SPEND_48H'
  | 'TEAM_ACCOUNT_SHORTAGE'
  | 'POOL_SHORTAGE'
  | 'PLATFORM_ASSET_RISK'
  | 'API_ACCESS_LOST'
  | 'CREDENTIAL_EXPIRED'
  | 'SYNC_FAILED'
  | 'DEMAND_OVERDUE'
  | 'CHANNEL_DELIVERY_OVERDUE'
  | 'RECONCILIATION_VARIANCE'

export const SHORTAGE_ALERT_TYPES: AlertType[] = [
  'TEAM_ACCOUNT_SHORTAGE',
  'POOL_SHORTAGE'
]

export function isShortageAlertType(type: string): boolean {
  return SHORTAGE_ALERT_TYPES.includes(type as AlertType)
}

export interface Alert {
  id: string
  type: AlertType | string
  severity: AlertSeverity
  entityType: string
  entityId: string
  title: string
  description: string
  status: AlertStatus
  assigneeUserId?: string | null
  detectedAt: string
  resolvedAt?: string | null
  relatedDemandId?: string | null
  relatedDemandItemId?: string | null
  relatedChannelOrderId?: string | null
  relatedTeamId?: string | null
  resolutionNote?: string | null
}

export interface AlertQuery {
  keyword?: string
  types?: string[]
  severities?: AlertSeverity[]
  statuses?: AlertStatus[]
  entityType?: string
  relatedDemandItemId?: string
  assigneeUserId?: string
  /** true = claimed, false = unclaimed */
  assigned?: boolean
  page?: number
  pageSize?: number
}
