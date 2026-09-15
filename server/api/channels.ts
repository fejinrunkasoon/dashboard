import type { Channel } from '~/types'

const channels: Channel[] = [{
  id: 1,
  name: 'Channel Alpha',
  supportedMedia: ['Meta', 'Google'],
  contactInfo: 'alpha@example.com',
  totalAccounts: 45,
  activeAccounts: 38,
  availableAccounts: 5,
  bannedAccounts: 2,
  banRate: 4.4,
  consumed: 125000,
  totalPayment: 150000,
  balance: 25000,
  estimatedDays: 8,
  status: 'active'
}, {
  id: 2,
  name: 'Channel Beta',
  supportedMedia: ['Meta', 'TikTok'],
  contactInfo: 'beta@example.com',
  totalAccounts: 30,
  activeAccounts: 22,
  availableAccounts: 3,
  bannedAccounts: 5,
  banRate: 16.7,
  consumed: 89000,
  totalPayment: 100000,
  balance: 11000,
  estimatedDays: 5,
  status: 'active'
}, {
  id: 3,
  name: 'Channel Gamma',
  supportedMedia: ['Google', 'TikTok'],
  contactInfo: 'gamma@example.com',
  totalAccounts: 25,
  activeAccounts: 23,
  availableAccounts: 2,
  bannedAccounts: 0,
  banRate: 0,
  consumed: 67000,
  totalPayment: 80000,
  balance: 13000,
  estimatedDays: 12,
  status: 'active'
}, {
  id: 4,
  name: 'Channel Delta',
  supportedMedia: ['Meta'],
  contactInfo: 'delta@example.com',
  totalAccounts: 15,
  activeAccounts: 10,
  availableAccounts: 2,
  bannedAccounts: 3,
  banRate: 20,
  consumed: 42000,
  totalPayment: 50000,
  balance: 8000,
  estimatedDays: 6,
  status: 'active'
}, {
  id: 5,
  name: 'Channel Epsilon',
  supportedMedia: ['Meta', 'Google', 'TikTok'],
  contactInfo: 'epsilon@example.com',
  totalAccounts: 50,
  activeAccounts: 42,
  availableAccounts: 4,
  bannedAccounts: 4,
  banRate: 8,
  consumed: 210000,
  totalPayment: 250000,
  balance: 40000,
  estimatedDays: 15,
  status: 'active'
}]

export default defineEventHandler(async () => {
  return channels
})