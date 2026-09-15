import type { DashboardOverview, AccountStructure } from '~/types'

const overview: DashboardOverview = {
  totalAccounts: 165,
  activeAccounts: 135,
  usageRate: 82,
  consumedToday: 12500,
  consumed7d: 87500,
  consumed30d: 375000,
  bannedToday: 3,
  pendingAlerts: 5,
  internalConsumed: 230000,
  externalConsumed: 145000
}

const accountStructure: AccountStructure = {
  pending: 16,
  allocated: 135,
  active: 115,
  idle: 12,
  abnormal: 5,
  banned: 14,
  disabled: 3
}

export default defineEventHandler(async () => {
  return { overview, accountStructure }
})