import { sub } from 'date-fns'
import type { Payment } from '~/types'

const payments: Payment[] = [{
  id: 1,
  channelId: 1,
  channelName: 'Channel Alpha',
  amount: 50000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { days: 15 }).toISOString(),
  status: 'confirmed',
  receipt: 'TX-0xabc123'
}, {
  id: 2,
  channelId: 1,
  channelName: 'Channel Alpha',
  amount: 100000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { days: 45 }).toISOString(),
  status: 'confirmed',
  receipt: 'TX-0xdef456'
}, {
  id: 3,
  channelId: 2,
  channelName: 'Channel Beta',
  amount: 50000,
  currency: 'USD',
  method: 'Bank Transfer',
  paymentTime: sub(new Date(), { days: 20 }).toISOString(),
  status: 'confirmed',
  receipt: 'BT-20260824'
}, {
  id: 4,
  channelId: 2,
  channelName: 'Channel Beta',
  amount: 50000,
  currency: 'USD',
  method: 'Bank Transfer',
  paymentTime: sub(new Date(), { days: 50 }).toISOString(),
  status: 'confirmed',
  receipt: 'BT-20260724'
}, {
  id: 5,
  channelId: 3,
  channelName: 'Channel Gamma',
  amount: 80000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { days: 10 }).toISOString(),
  status: 'confirmed',
  receipt: 'TX-0xghi789'
}, {
  id: 6,
  channelId: 4,
  channelName: 'Channel Delta',
  amount: 50000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { days: 30 }).toISOString(),
  status: 'confirmed',
  receipt: 'TX-0xjkl012'
}, {
  id: 7,
  channelId: 5,
  channelName: 'Channel Epsilon',
  amount: 150000,
  currency: 'USD',
  method: 'Bank Transfer',
  paymentTime: sub(new Date(), { days: 5 }).toISOString(),
  status: 'confirmed',
  receipt: 'BT-20260908'
}, {
  id: 8,
  channelId: 5,
  channelName: 'Channel Epsilon',
  amount: 100000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { days: 25 }).toISOString(),
  status: 'confirmed',
  receipt: 'TX-0xmno345'
}, {
  id: 9,
  channelId: 1,
  channelName: 'Channel Alpha',
  amount: 30000,
  currency: 'USD',
  method: 'USDT',
  paymentTime: sub(new Date(), { hours: 2 }).toISOString(),
  status: 'pending',
  receipt: null
}]

export default defineEventHandler(async () => {
  return payments
})