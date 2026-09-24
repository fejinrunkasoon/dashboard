import type { AppRole, AppUser, Organization } from '../../domain/access'
import type { EntityStatus } from '../../domain/common'
import {
  appUsers,
  members,
  organizations
} from '../../mocks/entities'
import type {
  AppUserListItem,
  CreateAppUserInput,
  CreateOrganizationInput,
  OrgAdminService,
  UpdateAppUserInput,
  UpdateOrganizationInput
} from './org-admin-types'

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_')
}

function assertStatus(status: EntityStatus) {
  if (status !== 'ACTIVE' && status !== 'DISABLED' && status !== 'ARCHIVED') {
    throw new Error(`Invalid status: ${status}`)
  }
}

function nowIso() {
  return new Date().toISOString()
}

const VALID_ROLES: AppRole[] = [
  'ORG_ADMIN',
  'TEAM_MANAGER',
  'TEAM_MEMBER',
  'PLATFORM_ADMIN'
]

function assertRoles(roles: AppRole[]) {
  if (!roles.length) throw new Error('at least one role is required')
  for (const role of roles) {
    if (!VALID_ROLES.includes(role)) throw new Error(`Invalid role: ${role}`)
  }
}

function toUserListItem(user: AppUser): AppUserListItem {
  const member = members.find(item => item.id === user.memberId)
  const org = organizations.find(item => item.id === user.organizationId)
  return {
    ...user,
    memberName: member?.name ?? null,
    memberCode: member?.code ?? null,
    organizationName: org?.name ?? null
  }
}

export const orgAdminService: OrgAdminService = {
  async getOrganizations() {
    return organizations.map(item => ({ ...item }))
  },

  async getOrganizationById(id) {
    const org = organizations.find(item => item.id === id)
    return org ? { ...org } : null
  },

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (organizations.some(item => item.code === code)) {
      throw new Error(`Organization code already exists: ${code}`)
    }

    const stamp = nowIso()
    let id = `org-${code.toLowerCase().replace(/_/g, '-')}`
    if (organizations.some(item => item.id === id)) {
      id = `org-${code.toLowerCase()}-${organizations.length + 1}`
    }

    const org: Organization = {
      id,
      code,
      name,
      status: 'ACTIVE',
      createdAt: stamp,
      updatedAt: stamp
    }
    organizations.push(org)
    return { ...org }
  },

  async updateOrganization(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = organizations.find(item => item.id === id)
    if (!org) throw new Error(`Unknown organization: ${id}`)

    if (input.code !== undefined) {
      const code = normalizeCode(input.code)
      if (!code) throw new Error('code is required')
      if (organizations.some(item => item.code === code && item.id !== id)) {
        throw new Error(`Organization code already exists: ${code}`)
      }
      org.code = code
    }
    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      org.name = name
    }
    org.updatedAt = nowIso()
    return { ...org }
  },

  async setOrganizationStatus(id: string, status: EntityStatus): Promise<Organization> {
    assertStatus(status)
    const org = organizations.find(item => item.id === id)
    if (!org) throw new Error(`Unknown organization: ${id}`)
    org.status = status
    org.updatedAt = nowIso()
    return { ...org }
  },

  async listUsers(organizationId?: string): Promise<AppUserListItem[]> {
    let rows = [...appUsers]
    if (organizationId) {
      rows = rows.filter(item => item.organizationId === organizationId)
    }
    return rows.map(toUserListItem)
  },

  async createUser(input: CreateAppUserInput): Promise<AppUser> {
    const displayName = input.displayName?.trim()
    if (!displayName) throw new Error('displayName is required')
    if (!input.memberId) throw new Error('memberId is required')
    if (!input.organizationId) throw new Error('organizationId is required')
    assertRoles(input.roles)

    const member = members.find(item => item.id === input.memberId)
    if (!member) throw new Error(`Unknown member: ${input.memberId}`)
    const org = organizations.find(item => item.id === input.organizationId)
    if (!org) throw new Error(`Unknown organization: ${input.organizationId}`)

    if (appUsers.some(
      item => item.memberId === input.memberId && item.organizationId === input.organizationId
    )) {
      throw new Error('AppUser already exists for this member in the organization')
    }

    let id = `user-${member.code.toLowerCase().replace(/_/g, '-')}`
    if (appUsers.some(item => item.id === id)) {
      id = `${id}-${appUsers.length + 1}`
    }

    const user: AppUser = {
      id,
      memberId: input.memberId,
      organizationId: input.organizationId,
      displayName,
      roles: [...input.roles],
      status: 'ACTIVE'
    }
    appUsers.push(user)
    return { ...user, roles: [...user.roles] }
  },

  async updateUser(id: string, input: UpdateAppUserInput): Promise<AppUser> {
    const user = appUsers.find(item => item.id === id)
    if (!user) throw new Error(`Unknown app user: ${id}`)

    if (input.displayName !== undefined) {
      const displayName = input.displayName.trim()
      if (!displayName) throw new Error('displayName is required')
      user.displayName = displayName
    }
    if (input.memberId !== undefined) {
      const member = members.find(item => item.id === input.memberId)
      if (!member) throw new Error(`Unknown member: ${input.memberId}`)
      user.memberId = input.memberId
    }
    if (input.organizationId !== undefined) {
      const org = organizations.find(item => item.id === input.organizationId)
      if (!org) throw new Error(`Unknown organization: ${input.organizationId}`)
      user.organizationId = input.organizationId
    }
    if (input.roles !== undefined) {
      assertRoles(input.roles)
      user.roles = [...input.roles]
    }
    return { ...user, roles: [...user.roles] }
  },

  async setUserStatus(id: string, status: EntityStatus): Promise<AppUser> {
    assertStatus(status)
    const user = appUsers.find(item => item.id === id)
    if (!user) throw new Error(`Unknown app user: ${id}`)
    user.status = status
    return { ...user, roles: [...user.roles] }
  }
}
