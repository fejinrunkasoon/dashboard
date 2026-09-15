import type { Reconciliation } from '~/types'

const reconciliation: Reconciliation[] = [{
  id: 1,
  channelId: 1,
  channelName: 'Channel Alpha',
  billingPeriod: '2026-08',
  channelBill: 52100,
  systemConsumption: 50000,
  difference: 2100,
  differenceRate: 4.2,
  status: 'disputed',
  reason: 'Exchange rate fluctuation during billing period'
}, {
  id: 2,
  channelId: 2,
  channelName: 'Channel Beta',
  billingPeriod: '2026-08',
  channelBill: 43500,
  systemConsumption: 43000,
  difference: 500,
  differenceRate: 1.2,
  status: 'confirmed',
  reason: 'Minor timing difference in consumption recording'
}, {
  id: 3,
  channelId: 3,
  channelName: 'Channel Gamma',
  billingPeriod: '2026-08',
  channelBill: 33200,
  systemConsumption: 33000,
  difference: 200,
  differenceRate: 0.6,
  status: 'confirmed',
  reason: null
}, {
  id: 4,
  channelId: 4,
  channelName: 'Channel Delta',
  billingPeriod: '2026-08',
  channelBill: 20800,
  systemConsumption: 20000,
  difference: 800,
  differenceRate: 4.0,
  status: 'pending',
  reason: null
}, {
  id: 5,
  channelId: 5,
  channelName: 'Channel Epsilon',
  billingPeriod: '2026-08',
  channelBill: 105000,
  systemConsumption: 105000,
  difference: 0,
  differenceRate: 0,
  status: 'confirmed',
  reason: null
}]

export default defineEventHandler(async () => {
  return reconciliation
})