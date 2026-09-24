import type { AppUser } from '../../domain/access'

export interface AccountAccessService {
  getAccessibleAccountIds(userId: string): Promise<string[]>
  canViewAccount(userId: string, accountId: string): Promise<boolean>
  canManageAccount(userId: string, accountId: string): Promise<boolean>
  canAssignAccount(userId: string, accountId: string): Promise<boolean>
  canManageConnection(userId: string, connectionId: string): Promise<boolean>
  resolveUser(userId: string): Promise<AppUser | null>
}
