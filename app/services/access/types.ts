import type { AppUser } from '../../domain/access'

export interface AccountAccessService {
  getAccessibleAccountIds(userId: string): Promise<string[]>
  canViewAccount(userId: string, accountId: string): Promise<boolean>
  canManageAccount(userId: string, accountId: string): Promise<boolean>
  /**
   * Assign user visibility on an already-managed account (Account Access panel).
   * Distinct from pool / Demand allocate.
   */
  canAssignAccount(userId: string, accountId: string): Promise<boolean>
  /**
   * Role capability `allocateAccount`: PLATFORM_ADMIN / ORG_ADMIN / TEAM_MANAGER.
   * Gates pool DIRECT assign and Demand allocate — not TEAM_MEMBER.
   */
  canAllocateAccounts(userId: string): Promise<boolean>
  /**
   * Role capability `changeAccountManager`: same roles as allocateAccount.
   * Gates list/detail/batch「更换户管」— not TEAM_MEMBER.
   */
  canChangeAccountManager(userId: string): Promise<boolean>
  canManageConnection(userId: string, connectionId: string): Promise<boolean>
  resolveUser(userId: string): Promise<AppUser | null>
}
