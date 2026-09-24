import type { AppUser } from '../../domain/access'
import {
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
    if (user.roles.includes('ORG_ADMIN')) return true
    if (!isTeamManager(user)) return false

    const managed = managedTeamIds(user)
    return teamAccountLinks.some(
      l => l.mediaAccountId === accountId
        && l.status === 'ACTIVE'
        && managed.includes(l.teamId)
    )
  },

  async canAssignAccount(userId, accountId) {
    return this.canManageAccount(userId, accountId)
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
