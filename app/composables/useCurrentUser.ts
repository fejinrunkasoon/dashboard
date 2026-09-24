import type { AppUser } from '~/domain'
import {
  DEFAULT_CURRENT_USER_ID,
  DEFAULT_ORGANIZATION_ID,
  appUsers,
  members,
  teams
} from '~/mocks/entities'

const STORAGE_KEY = 'ffj-current-user-id'

/**
 * Mock session — switchable current user for Tenant-plane demos.
 * Default: 李四 (TEAM_MEMBER) so assignment visibility is testable.
 */
export function useCurrentUser() {
  const userId = useState<string>('current-user-id', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && appUsers.some(u => u.id === stored)) return stored
    }
    return DEFAULT_CURRENT_USER_ID
  })

  const user = computed<AppUser | null>(() =>
    appUsers.find(u => u.id === userId.value && u.status === 'ACTIVE') ?? null
  )

  const member = computed(() => {
    const u = user.value
    if (!u) return null
    return members.find(m => m.id === u.memberId) ?? null
  })

  const team = computed(() => {
    const m = member.value
    if (!m) return null
    return teams.find(t => t.id === m.teamId) ?? null
  })

  const organizationId = computed(
    () => user.value?.organizationId ?? DEFAULT_ORGANIZATION_ID
  )

  const isOrgAdmin = computed(() =>
    Boolean(user.value?.roles.includes('ORG_ADMIN'))
  )

  const isPlatformAdmin = computed(() =>
    Boolean(user.value?.roles.includes('PLATFORM_ADMIN'))
  )

  const isTeamManager = computed(() => {
    const u = user.value
    if (!u) return false
    if (u.roles.includes('TEAM_MANAGER') || u.roles.includes('ORG_ADMIN')) return true
    return teams.some(t => t.leaderMemberId === u.memberId)
  })

  function setUser(id: string) {
    if (!appUsers.some(u => u.id === id)) return
    userId.value = id
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, id)
  }

  const switchableUsers = computed(() =>
    appUsers.filter(u => u.status === 'ACTIVE' && u.id !== 'user-admin')
  )

  return {
    userId,
    user,
    member,
    team,
    organizationId,
    isOrgAdmin,
    isPlatformAdmin,
    isTeamManager,
    setUser,
    switchableUsers,
    DEFAULT_ORGANIZATION_ID
  }
}
