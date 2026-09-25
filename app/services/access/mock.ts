import type { AppUser } from '../../domain/access'
import {
  accountAssignments,
  accounts,
  appUsers,
  mediaConnections,
  members,
  teamAccountLinks,
  teams,
  userAccountAccesses
} from '../../mocks/entities'
import type { AccountAccessService } from './types'

function findUser(userId: string): AppUser | undefined {
  return appUsers.find(u => u.id === userId && u.status === 'ACTIVE')
}

function managedTeamIds(user: AppUser): string[] {
  const member = members.find(m => m.id === user.memberId)
  if (!member) return []
  const ids = new Set<string>([member.teamId])
  for (const team of teams) {
    if (team.leaderMemberId === user.memberId && team.status === 'ACTIVE') {
      ids.add(team.id)
    }
  }
  if (user.roles.includes('TEAM_MANAGER') || user.roles.includes('ORG_ADMIN')) {
    ids.add(member.teamId)
  }
  return [...ids]
}

function isTeamManager(user: AppUser): boolean {
  return user.roles.includes('TEAM_MANAGER')
    || teams.some(t => t.leaderMemberId === user.memberId)
}

/** Matches settings/permissions ROLE_CAPABILITIES.allocateAccount. */
export function userCanAllocateAccounts(user: AppUser): boolean {
  return user.roles.includes('PLATFORM_ADMIN')
    || user.roles.includes('ORG_ADMIN')
    || user.roles.includes('TEAM_MANAGER')
}

export function canAllocateAccountsSync(userId: string): boolean {
  const user = findUser(userId)
  if (!user) return false
  return userCanAllocateAccounts(user)
}

export function assertCanAllocateAccounts(userId: string) {
  if (!canAllocateAccountsSync(userId)) {
    throw new Error('Only PLATFORM_ADMIN, ORG_ADMIN, or TEAM_MANAGER can allocate accounts')
  }
}

/**
 * Matches settings/permissions ROLE_CAPABILITIES.changeAccountManager.
 * Reassigning 户管 is a scheduling/admin action — not TEAM_MEMBER.
 */
export function userCanChangeAccountManager(user: AppUser): boolean {
  return userCanAllocateAccounts(user)
}

export function canChangeAccountManagerSync(userId: string): boolean {
  const user = findUser(userId)
  if (!user) return false
  return userCanChangeAccountManager(user)
}

export function assertCanChangeAccountManager(userId: string) {
  if (!canChangeAccountManagerSync(userId)) {
    throw new Error('Only PLATFORM_ADMIN, ORG_ADMIN, or TEAM_MANAGER can change account manager')
  }
}

/** Matches settings/permissions ROLE_CAPABILITIES.reviewPaymentAddress. */
export function userCanReviewPaymentAddress(user: AppUser): boolean {
  return user.roles.includes('PLATFORM_ADMIN')
    || user.roles.includes('ORG_ADMIN')
}

export function canReviewPaymentAddressByMemberId(memberId: string): boolean {
  return appUsers.some(u =>
    u.memberId === memberId
    && u.status === 'ACTIVE'
    && userCanReviewPaymentAddress(u)
  )
}

export function assertCanReviewPaymentAddressByMemberId(memberId: string) {
  if (!canReviewPaymentAddressByMemberId(memberId)) {
    throw new Error('Only ORG_ADMIN or PLATFORM_ADMIN can review payment addresses')
  }
}

/**
 * Visibility rules (aligned with team accounts tab copy):
 * - ORG/PLATFORM admin → all org accounts
 * - Team Manager → all accounts currently held by managed teams
 * - Everyone → current AccountAssignment where they are the member (运营「成员」)
 * - Everyone → active UserAccountAccess (接入 / 显式授权)
 */
function collectAccessibleIds(userId: string): string[] {
  const user = findUser(userId)
  if (!user) return []

  if (user.roles.includes('ORG_ADMIN') || user.roles.includes('PLATFORM_ADMIN')) {
    return accounts
      .filter(a => (a.organizationId ?? 'org-ffj') === user.organizationId)
      .map(a => a.id)
  }

  const ids = new Set<string>()
  const managed = managedTeamIds(user)

  if (isTeamManager(user)) {
    for (const link of teamAccountLinks) {
      if (
        link.status === 'ACTIVE'
        && link.organizationId === user.organizationId
        && managed.includes(link.teamId)
      ) {
        ids.add(link.mediaAccountId)
      }
    }
    for (const asg of accountAssignments) {
      if (asg.endedAt == null && managed.includes(asg.teamId)) {
        ids.add(asg.accountId)
      }
    }
  }

  // Operational assignee shown in the「成员」column
  for (const asg of accountAssignments) {
    if (asg.endedAt == null && asg.memberId === user.memberId) {
      ids.add(asg.accountId)
    }
  }

  for (const access of userAccountAccesses) {
    if (
      access.status === 'ACTIVE'
      && access.userId === userId
      && access.organizationId === user.organizationId
    ) {
      ids.add(access.mediaAccountId)
    }
  }

  return [...ids]
}

export const accountAccessService: AccountAccessService = {
  async resolveUser(userId) {
    return findUser(userId) ?? null
  },

  async getAccessibleAccountIds(userId) {
    return collectAccessibleIds(userId)
  },

  async canViewAccount(userId, accountId) {
    return collectAccessibleIds(userId).includes(accountId)
  },

  async canManageAccount(userId, accountId) {
    const user = findUser(userId)
    if (!user) return false
    if (user.roles.includes('ORG_ADMIN') || user.roles.includes('PLATFORM_ADMIN')) {
      return true
    }
    if (!isTeamManager(user)) return false

    const managed = managedTeamIds(user)
    if (teamAccountLinks.some(
      l => l.mediaAccountId === accountId
        && l.status === 'ACTIVE'
        && managed.includes(l.teamId)
    )) {
      return true
    }
    return accountAssignments.some(
      a => a.accountId === accountId
        && a.endedAt == null
        && managed.includes(a.teamId)
    )
  },

  async canAssignAccount(userId, accountId) {
    return this.canManageAccount(userId, accountId)
  },

  async canAllocateAccounts(userId) {
    return canAllocateAccountsSync(userId)
  },

  async canChangeAccountManager(userId) {
    return canChangeAccountManagerSync(userId)
  },

  async canManageConnection(userId, connectionId) {
    const user = findUser(userId)
    if (!user) return false
    if (user.roles.includes('ORG_ADMIN') || user.roles.includes('PLATFORM_ADMIN')) {
      return true
    }
    const conn = mediaConnections.find(c => c.id === connectionId)
    if (!conn || conn.organizationId !== user.organizationId) return false
    if (conn.authorizedByUserId === userId) return true
    const managed = managedTeamIds(user)
    return isTeamManager(user) && managed.includes(conn.teamId)
  }
}

export function getAccessibleAccountIdsSync(userId: string): string[] {
  return collectAccessibleIds(userId)
}
