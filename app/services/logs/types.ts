export type OperationLogResult = 'SUCCESS' | 'FAILED'

export interface OperationLog {
  id: string
  at: string
  actor: string
  module: string
  action: string
  target: string
  result: OperationLogResult
}

export type SyncLogStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL'

export interface ConnectorSyncLog {
  id: string
  at: string
  connector: string
  media: string
  scope: string
  status: SyncLogStatus
  count: number
  errorSummary: string | null
}

export interface LogsService {
  getOperationLogs(): Promise<OperationLog[]>
  getSyncLogs(): Promise<ConnectorSyncLog[]>
}
