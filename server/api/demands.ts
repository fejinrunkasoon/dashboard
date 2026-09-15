import type { Demand } from '~/types'

const demands: Demand[] = [{
  id: 'DM-001',
  teamId: 1,
  teamName: 'Team A',
  productNeed: 'App A',
  mediaNeed: 'Meta',
  requestCount: 5,
  approvedCount: 3,
  allocatedCount: 1,
  remaining: 2,
  submitDate: '2026-09-10',
  priority: 'high',
  expectedDate: '2026-09-15',
  reason: 'Q4 campaign scaling',
  status: 'allocating'
}, {
  id: 'DM-002',
  teamId: 4,
  teamName: 'Team D',
  productNeed: 'Client X',
  mediaNeed: 'Google',
  requestCount: 8,
  approvedCount: 0,
  allocatedCount: 0,
  remaining: 0,
  submitDate: '2026-09-11',
  priority: 'urgent',
  expectedDate: '2026-09-13',
  reason: 'New client onboarding',
  status: 'pending'
}, {
  id: 'DM-003',
  teamId: 2,
  teamName: 'Team B',
  productNeed: 'Game C',
  mediaNeed: 'TikTok',
  requestCount: 3,
  approvedCount: 3,
  allocatedCount: 3,
  remaining: 0,
  submitDate: '2026-09-08',
  priority: 'medium',
  expectedDate: '2026-09-12',
  reason: 'Replacing banned accounts',
  status: 'completed'
}, {
  id: 'DM-004',
  teamId: 4,
  teamName: 'Team D',
  productNeed: 'App B',
  mediaNeed: 'Meta',
  requestCount: 4,
  approvedCount: 2,
  allocatedCount: 0,
  remaining: 2,
  submitDate: '2026-09-12',
  priority: 'high',
  expectedDate: '2026-09-16',
  reason: 'Insufficient accounts for current load',
  status: 'approved'
}]

export default defineEventHandler(async () => {
  return demands
})