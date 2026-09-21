import type { Customer, Product } from '../../domain/product'
import type { EntityStatus, ProductOwnership } from '../../domain/common'

export interface ProductQuery {
  ownershipType?: ProductOwnership
  customerIds?: string[]
  keyword?: string
  status?: EntityStatus
}

export interface ProductListItem extends Product {
  customerName: string | null
  boundAccountCount: number
}

export interface CreateProductInput {
  code: string
  name: string
  ownershipType: ProductOwnership
  customerId?: string | null
  note?: string | null
}

export interface UpdateProductInput {
  name?: string
  customerId?: string | null
  note?: string | null
}

export interface CreateCustomerInput {
  code: string
  name: string
  note?: string | null
}

export interface UpdateCustomerInput {
  name?: string
  note?: string | null
}

export interface ProductService {
  getProducts(query?: ProductQuery): Promise<Product[]>
  getProductList(query?: ProductQuery): Promise<ProductListItem[]>
  getProductById(id: string): Promise<Product | null>
  getCustomers(status?: EntityStatus): Promise<Customer[]>
  getCustomerById(id: string): Promise<Customer | null>
  createProduct(input: CreateProductInput): Promise<Product>
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>
  setProductStatus(id: string, status: EntityStatus): Promise<Product>
  createCustomer(input: CreateCustomerInput): Promise<Customer>
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer>
  setCustomerStatus(id: string, status: EntityStatus): Promise<Customer>
}
