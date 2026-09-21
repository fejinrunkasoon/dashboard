import type {
  Alert,
  AlertQuery,
  AlertType
} from '../../domain/alert'
import type { PagedResponse } from '../../domain/common'

export interface EnsureShortageAlertInput {
  kind: 'TEAM_ACCOUNT_SHORTAGE' | 'POOL_SHORTAGE'
  teamId: string
  demandId: string
  demandItemId: string
  demandNo: string
  shortage: number
  poolMatchCount: number
  remainingQuantity: number
  mediaId?: string
  relatedChannelOrderId?: string | null
}

export interface AlertService {
  getAlerts(query?: AlertQuery): Promise<PagedResponse<Alert>>
  getAlertById(id: string): Promise<Alert | null>
  getOpenCount(): Promise<number>
  acknowledge(id: string, assigneeUserId: string): Promise<Alert>
  resolve(id: string, note?: string): Promise<Alert>
  ignore(id: string, note?: string): Promise<Alert>
  reopen(id: string): Promise<Alert>
  ensureShortageAlert(input: EnsureShortageAlertInput): Promise<Alert>
  reportCredentialLost(accountId: string): Promise<Alert>
  /** FFJ 有而媒体发现无 — STEP 21 reconcile. */
  ensureApiAccessLostAlert(accountId: string): Promise<Alert>
  reportSyncFailed(jobId: string, message: string): Promise<Alert>
  resolveShortageAlertsForDemandItem(demandItemId: string): Promise<number>
}
