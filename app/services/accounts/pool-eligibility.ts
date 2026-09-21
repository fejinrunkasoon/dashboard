import { accountAssignments, accounts } from '../../mocks/entities'

export function hasCurrentAssignment(accountId: string): boolean {
  return accountAssignments.some(item => item.accountId === accountId && item.endedAt == null)
}

/**
 * Pool eligibility — single place to adjust later (e.g. IDLE without assignment).
 * Team Center "Idle" = team-held IDLE accounts; do NOT conflate with pool membership.
 */
export function isInAccountPool(accountId: string): boolean {
  const account = accounts.find(item => item.id === accountId)
  if (!account) return false
  if (account.assetStatus !== 'AVAILABLE') return false
  if (account.mediaStatus === 'BANNED') return false
  if (account.mediaStatus !== 'ACTIVE') return false
  if (hasCurrentAssignment(accountId)) return false
  return true
}
