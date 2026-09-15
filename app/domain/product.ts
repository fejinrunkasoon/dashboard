import type { EntityStatus, ProductOwnership } from './common'

export interface Customer {
  id: string
  code: string
  name: string
  status: EntityStatus
  note?: string | null
}

export interface Product {
  id: string
  code: string
  name: string
  ownershipType: ProductOwnership
  customerId?: string | null
  status: EntityStatus
  note?: string | null
}
