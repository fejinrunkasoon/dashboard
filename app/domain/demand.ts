export type AccountDemandStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIALLY_ALLOCATED'
  | 'FULFILLED'
  | 'REJECTED'
  | 'CANCELLED'

export type DemandPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface AccountDemand {
  id: string
  demandNo: string
  teamId: string
  requesterUserId: string
  expectedDate?: string | null
  priority: DemandPriority
  reason?: string | null
  status: AccountDemandStatus
  createdAt: string
  updatedAt: string
}

export interface AccountDemandItem {
  id: string
  demandId: string
  mediaId: string
  productId?: string | null
  requestedQuantity: number
  approvedQuantity: number
  requirements: Record<string, unknown>
}

export interface AccountDemandAllocation {
  id: string
  demandItemId: string
  accountId: string
  assignmentId?: string | null
  allocatedAt: string
  allocatedBy: string
}

export interface DemandQuery {
  keyword?: string
  teamIds?: string[]
  statuses?: AccountDemandStatus[]
  page?: number
  pageSize?: number
}
