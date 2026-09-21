import {
  accountProductAssignments,
  customers,
  products
} from '../../mocks'
import type { Customer, Product } from '../../domain/product'
import type { EntityStatus } from '../../domain/common'
import type {
  CreateCustomerInput,
  CreateProductInput,
  ProductListItem,
  ProductQuery,
  ProductService,
  UpdateCustomerInput,
  UpdateProductInput
} from './types'

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_')
}

function assertStatus(status: EntityStatus) {
  if (status !== 'ACTIVE' && status !== 'DISABLED' && status !== 'ARCHIVED') {
    throw new Error(`Invalid status: ${status}`)
  }
}

function boundCount(productId: string): number {
  return accountProductAssignments.filter(
    item => item.productId === productId && item.endedAt == null
  ).length
}

function toListItem(product: Product): ProductListItem {
  const customer = product.customerId
    ? customers.find(item => item.id === product.customerId)
    : null
  return {
    ...product,
    customerName: customer?.name ?? null,
    boundAccountCount: boundCount(product.id)
  }
}

export const productService: ProductService = {
  async getProducts(query: ProductQuery = {}) {
    let rows = [...products]

    if (query.ownershipType) {
      rows = rows.filter(item => item.ownershipType === query.ownershipType)
    }
    if (query.customerIds?.length) {
      rows = rows.filter(item =>
        item.customerId != null && query.customerIds!.includes(item.customerId)
      )
    }
    if (query.status) {
      rows = rows.filter(item => item.status === query.status)
    }
    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      rows = rows.filter(item =>
        item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
      )
    }

    return rows
  },

  async getProductList(query: ProductQuery = {}) {
    const rows = await this.getProducts(query)
    return rows.map(toListItem)
  },

  async getProductById(id) {
    return products.find(item => item.id === id) ?? null
  },

  async getCustomers(status) {
    if (!status) return [...customers]
    return customers.filter(item => item.status === status)
  },

  async getCustomerById(id) {
    return customers.find(item => item.id === id) ?? null
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (products.some(item => item.code === code)) {
      throw new Error(`Product code already exists: ${code}`)
    }

    if (input.ownershipType === 'EXTERNAL') {
      if (!input.customerId) throw new Error('外接产品必须关联客户')
      const customer = customers.find(item => item.id === input.customerId)
      if (!customer) throw new Error(`Unknown customer: ${input.customerId}`)
      if (customer.status !== 'ACTIVE') throw new Error('只能关联启用中的客户')
    }

    const product: Product = {
      id: `prd-${code.toLowerCase().replace(/_/g, '-')}`,
      code,
      name,
      ownershipType: input.ownershipType,
      customerId: input.ownershipType === 'EXTERNAL' ? input.customerId! : null,
      status: 'ACTIVE',
      note: input.note?.trim() || null
    }

    if (products.some(item => item.id === product.id)) {
      product.id = `prd-${code.toLowerCase()}-${products.length + 1}`
    }

    products.push(product)
    return { ...product }
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const product = products.find(item => item.id === id)
    if (!product) throw new Error(`Unknown product: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      product.name = name
    }
    if (input.note !== undefined) {
      product.note = input.note?.trim() || null
    }
    if (input.customerId !== undefined) {
      if (product.ownershipType !== 'EXTERNAL') {
        throw new Error('自家产品不能关联客户')
      }
      if (!input.customerId) throw new Error('外接产品必须关联客户')
      const customer = customers.find(item => item.id === input.customerId)
      if (!customer) throw new Error(`Unknown customer: ${input.customerId}`)
      if (customer.status !== 'ACTIVE' && input.customerId !== product.customerId) {
        throw new Error('只能关联启用中的客户')
      }
      product.customerId = input.customerId
    }

    return { ...product }
  },

  async setProductStatus(id: string, status: EntityStatus): Promise<Product> {
    assertStatus(status)
    const product = products.find(item => item.id === id)
    if (!product) throw new Error(`Unknown product: ${id}`)
    product.status = status
    return { ...product }
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (customers.some(item => item.code === code)) {
      throw new Error(`Customer code already exists: ${code}`)
    }

    const customer: Customer = {
      id: `cus-${code.toLowerCase().replace(/_/g, '-')}`,
      code,
      name,
      status: 'ACTIVE',
      note: input.note?.trim() || null
    }

    if (customers.some(item => item.id === customer.id)) {
      customer.id = `cus-${code.toLowerCase()}-${customers.length + 1}`
    }

    customers.push(customer)
    return { ...customer }
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const customer = customers.find(item => item.id === id)
    if (!customer) throw new Error(`Unknown customer: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      customer.name = name
    }
    if (input.note !== undefined) {
      customer.note = input.note?.trim() || null
    }

    return { ...customer }
  },

  async setCustomerStatus(id: string, status: EntityStatus): Promise<Customer> {
    assertStatus(status)
    const customer = customers.find(item => item.id === id)
    if (!customer) throw new Error(`Unknown customer: ${id}`)
    customer.status = status
    return { ...customer }
  }
}
