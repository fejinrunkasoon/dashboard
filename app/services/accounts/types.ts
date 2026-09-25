import type {
  AccountAssignment,
  AccountChannelAssignment,
  AccountDetailBundle,
  AccountManagerAssignment,
  AccountPlatformAssetAssignment,
  AccountPoolStats,
  AccountProductAssignment,
  AccountQuery,
  AccountRelationHistory,
  AccountServiceFeePolicyAssignment,
  AccountStats,
  AccountTimelineEvent,
  AdAccount,
  AdAccountListItem
} from '../../domain/account'
import type { PagedResponse } from '../../domain/common'

export interface AssignDirectInput {
  accountIds: string[]
  teamId: string
  /** Required — aligned with demand scheduling allocate. */
  memberId: string
  /** Required — writes accountManagerAssignments. */
  managerId: string
  /** Required — writes accountProductAssignments. */
  productId: string
  reason?: string | null
  createdBy: string
  /** AppUser id — must pass canAllocateAccounts (not TEAM_MEMBER). */
  actorUserId: string
}

export interface AssignDirectResult {
  assignmentIds: string[]
  teamId: string
}

export interface TransferAccountInput {
  accountId: string
  teamId: string
  memberId?: string | null
  reason: string
  createdBy: string
}

export interface TransferAccountResult {
  assignmentId: string
  endedAssignmentId: string
}

export interface RecycleAccountInput {
  accountId: string
  reason: string
  createdBy: string
}

export interface RecycleAccountResult {
  endedAssignmentId: string
}

export interface DisableAccountInput {
  accountId: string
  reason: string
  createdBy: string
}

export interface DisableAccountResult {
  accountId: string
  endedAssignmentId: string | null
}

export interface ChangeProductInput {
  accountId: string
  productId: string
  reason?: string | null
  createdBy: string
}

export interface ChangeProductResult {
  productAssignmentId: string
}

export interface ChangeManagerInput {
  accountId: string
  managerMemberId: string
  reason?: string | null
  createdBy: string
  /** AppUser id — must pass canChangeAccountManager (not TEAM_MEMBER). */
  actorUserId: string
}

export interface ChangeManagerResult {
  managerAssignmentId: string
}

export interface ChangeFeePolicyInput {
  accountId: string
  policyId: string
  createdBy: string
}

export interface ChangeFeePolicyResult {
  feePolicyAssignmentId: string
}

export interface ChangeSpendLimitInput {
  accountId: string
  /** null clears the account-level cap */
  spendLimit: number | null
  createdBy: string
}

export interface ChangeSpendLimitResult {
  accountId: string
  spendLimit: number | null
}

export interface AccountService {
  getAccounts(query?: AccountQuery): Promise<PagedResponse<AdAccountListItem>>
  getAccountStats(query?: AccountQuery): Promise<AccountStats>
  getAccountById(id: string): Promise<AdAccountListItem | null>
  /** Raw domain entity for internal consumers; list APIs return read models. */
  getAccountEntity(id: string): Promise<AdAccount | null>
  getAccountRelationHistory(accountId: string): Promise<AccountRelationHistory | null>
  getAccountAssignments(accountId: string): Promise<AccountAssignment[]>
  getAccountManagerHistory(accountId: string): Promise<AccountManagerAssignment[]>
  getAccountProductHistory(accountId: string): Promise<AccountProductAssignment[]>
  getAccountPlatformAssetHistory(accountId: string): Promise<AccountPlatformAssetAssignment[]>
  getAccountChannelHistory(accountId: string): Promise<AccountChannelAssignment[]>
  getAccountFeePolicyHistory(accountId: string): Promise<AccountServiceFeePolicyAssignment[]>
  getAccountTimeline(accountId: string): Promise<AccountTimelineEvent[]>
  getAccountDetail(accountId: string): Promise<AccountDetailBundle | null>
  /**
   * Dynamic Account Pool view — NOT an is_pool flag.
   * Enforces: AVAILABLE + no current assignment + mediaStatus ACTIVE.
   */
  getAccountPool(query?: AccountQuery): Promise<PagedResponse<AdAccountListItem>>
  getAccountPoolStats(query?: AccountQuery): Promise<AccountPoolStats>
  /** Allocation Source: DIRECT — pool → team/member, no DemandAllocation. */
  assignDirect(input: AssignDirectInput): Promise<AssignDirectResult>
  /** End current Assignment and open a new segment. Does not change Account Manager. */
  transferAccount(input: TransferAccountInput): Promise<TransferAccountResult>
  /** End current Assignment; assetStatus → AVAILABLE (re-enter pool). */
  recycleAccount(input: RecycleAccountInput): Promise<RecycleAccountResult>
  /** End Assignment if any; assetStatus → DISABLED (not in pool). */
  disableAccount(input: DisableAccountInput): Promise<DisableAccountResult>
  changeProduct(input: ChangeProductInput): Promise<ChangeProductResult>
  changeManager(input: ChangeManagerInput): Promise<ChangeManagerResult>
  /** End current fee-policy segment and open a new one; DISABLED policies cannot bind. */
  changeFeePolicy(input: ChangeFeePolicyInput): Promise<ChangeFeePolicyResult>
  changeSpendLimit(input: ChangeSpendLimitInput): Promise<ChangeSpendLimitResult>
}
