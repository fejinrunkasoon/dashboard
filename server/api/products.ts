import type { Product } from '~/types'

const products: Product[] = [{
  id: 1,
  name: 'App A',
  type: 'internal',
  boundAccounts: 12,
  consumed: 45000
}, {
  id: 2,
  name: 'App B',
  type: 'internal',
  boundAccounts: 8,
  consumed: 32000
}, {
  id: 3,
  name: 'Game C',
  type: 'internal',
  boundAccounts: 6,
  consumed: 28000
}, {
  id: 4,
  name: 'Client X',
  type: 'external',
  boundAccounts: 10,
  consumed: 38000
}, {
  id: 5,
  name: 'Client Y',
  type: 'external',
  boundAccounts: 7,
  consumed: 22000
}, {
  id: 6,
  name: 'Client Z',
  type: 'external',
  boundAccounts: 5,
  consumed: 15000
}]

export default defineEventHandler(async () => {
  return products
})