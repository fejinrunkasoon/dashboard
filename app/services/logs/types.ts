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

export type SyncLogStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL' | 'RUNNING' | 'PENDING'

export interface ConnectorSyncLog {
  id: string
  at: string
  connector: string
  media: string
  mediaId: string
  scope: string
  status: SyncLogStatus
  count: number
  errorSummary: string | null
}

export interface OperationLogQuery {
  module?: string
  result?: OperationLogResult
  actor?: string
  keyword?: string
}

export interface SyncLogListQuery {
  mediaId?: string
  status?: SyncLogStatus
  keyword?: string
}

export interface LogsService {
  getOperationLogs(query?: OperationLogQuery): Promise<OperationLog[]>
  getSyncLogs(query?: SyncLogListQuery): Promise<ConnectorSyncLog[]>
  listOperationModules(): Promise<string[]>
}
