import type { AppRole, AppUser, Organization } from '../../domain/access'
import type { EntityStatus } from '../../domain/common'

export interface CreateOrganizationInput {
  code: string
  name: string
}

export interface UpdateOrganizationInput {
  name?: string
  code?: string
}

export interface CreateAppUserInput {
  memberId: string
  organizationId: string
  displayName: string
  roles: AppRole[]
}

export interface UpdateAppUserInput {
  displayName?: string
  memberId?: string
  organizationId?: string
  roles?: AppRole[]
}

export interface AppUserListItem extends AppUser {
  memberName: string | null
  memberCode: string | null
  organizationName: string | null
}

export interface OrgAdminService {
  getOrganizations(): Promise<Organization[]>
  getOrganizationById(id: string): Promise<Organization | null>
  createOrganization(input: CreateOrganizationInput): Promise<Organization>
  updateOrganization(id: string, input: UpdateOrganizationInput): Promise<Organization>
  setOrganizationStatus(id: string, status: EntityStatus): Promise<Organization>

  listUsers(organizationId?: string): Promise<AppUserListItem[]>
  createUser(input: CreateAppUserInput): Promise<AppUser>
  updateUser(id: string, input: UpdateAppUserInput): Promise<AppUser>
  setUserStatus(id: string, status: EntityStatus): Promise<AppUser>
}
