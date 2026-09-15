import type { Team } from '~/types'

const teams: Team[] = [{
  id: 1,
  name: 'Team A',
  leaderId: 1,
  leaderName: 'Zhang Wei',
  memberCount: 5,
  totalAccounts: 18,
  activeAccounts: 15,
  idleAccounts: 2,
  usageRate: 83,
  consumed: 52000,
  internalConsumed: 35000,
  externalConsumed: 17000,
  banRate: 5,
  pendingDemand: 2,
  unmetDemand: 5,
  estimatedGap: 3
}, {
  id: 2,
  name: 'Team B',
  leaderId: 5,
  leaderName: 'Liu Yang',
  memberCount: 4,
  totalAccounts: 14,
  activeAccounts: 10,
  idleAccounts: 3,
  usageRate: 71,
  consumed: 38000,
  internalConsumed: 22000,
  externalConsumed: 16000,
  banRate: 7,
  pendingDemand: 1,
  unmetDemand: 3,
  estimatedGap: 2
}, {
  id: 3,
  name: 'Team C',
  leaderId: 8,
  leaderName: 'Zhou Xin',
  memberCount: 6,
  totalAccounts: 22,
  activeAccounts: 20,
  idleAccounts: 1,
  usageRate: 91,
  consumed: 78000,
  internalConsumed: 50000,
  externalConsumed: 28000,
  banRate: 3,
  pendingDemand: 0,
  unmetDemand: 0,
  estimatedGap: 0
}, {
  id: 4,
  name: 'Team D',
  leaderId: 3,
  leaderName: 'Wang Jun',
  memberCount: 3,
  totalAccounts: 10,
  activeAccounts: 6,
  idleAccounts: 3,
  usageRate: 60,
  consumed: 25000,
  internalConsumed: 15000,
  externalConsumed: 10000,
  banRate: 10,
  pendingDemand: 3,
  unmetDemand: 8,
  estimatedGap: 5
}]

export default defineEventHandler(async () => {
  return teams
})