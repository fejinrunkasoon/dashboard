/**
 * Technical debt: money fields use JavaScript number for this prototype.
 * Formal settlement must use PostgreSQL NUMERIC. Do not treat float math as ledger truth.
 */

export type EntityStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'

export type ProductOwnership = 'INTERNAL' | 'EXTERNAL'

export type AccountAssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_USE'
  | 'IDLE'
  | 'DISABLED'
  | 'ARCHIVED'

export type AccountMediaStatus =
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'DISABLED'
  | 'BANNED'
  | 'UNKNOWN'

export type ApiAccessStatus = 'ACCESSIBLE' | 'LOST' | 'UNKNOWN'

export type SortOrder = 'asc' | 'desc'

export interface PaginationQuery {
  page?: number
  pageSize?: number
}

export interface SortQuery {
  sortBy?: string
  sortOrder?: SortOrder
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PagedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface SpendDateRange {
  from: string
  to: string
}

export function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20
): PagedResponse<T> {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, Math.min(200, pageSize))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeSize))
  const current = Math.min(safePage, totalPages)
  const start = (current - 1) * safeSize

  return {
    data: items.slice(start, start + safeSize),
    pagination: {
      page: current,
      pageSize: safeSize,
      total,
      totalPages
    }
  }
}
