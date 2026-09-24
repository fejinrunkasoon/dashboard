import type { Organization, AppUser } from '../domain/access'
import type { MediaConnection, ConnectionAccount, ConnectionSecret } from '../domain/connection'
import type { TeamAccountLink, UserAccountAccess } from '../domain/governance'
import type { AuditLog } from '../domain/audit'
import type { PlatformApp } from '../domain/platform-app'
import type {
  AccountAssignment,
  AccountChannelAssignment,
  AccountManagerAssignment,
  AccountPlatformAssetAssignment,
  AccountProductAssignment,
  AccountServiceFeePolicyAssignment,
  AdAccount
} from '../domain/account'
import type { Alert } from '../domain/alert'
import type { Channel } from '../domain/channel'
import type { ChannelAccountOrder } from '../domain/channel-order'
import type { AccountDemand, AccountDemandAllocation, AccountDemandItem } from '../domain/demand'
import type {
  ChannelPaymentAddress,
  ChannelPrepayment,
  ChannelRefund,
  ChannelReconciliation,
  ServiceFeePolicy,
  ServiceFeeTier
} from '../domain/finance'
import type {
  MediaConnectorBinding,
  MediaCredential,
  MediaFieldDefinition,
  SyncScopeConfig
} from '../domain/connector'
import type { MediaPlatform, PlatformAsset, PlatformAssetType } from '../domain/media'
import type { Member, Team } from '../domain/organization'
import type { Customer, Product } from '../domain/product'
import type { ApiAccessStatus } from '../domain/common'

const ts = {
  created: '2026-01-15T00:00:00.000Z',
  updated: '2026-09-10T00:00:00.000Z'
}

/** Default tenant for mock data. */
export const DEFAULT_ORGANIZATION_ID = 'org-ffj'

export const organizations: Organization[] = [
  {
    id: DEFAULT_ORGANIZATION_ID,
    code: 'FFJ',
    name: 'FFJ Demo Org',
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

export const appUsers: AppUser[] = [
  {
    id: 'user-wangwu',
    memberId: 'mem-wangwu',
    organizationId: DEFAULT_ORGANIZATION_ID,
    displayName: '王五',
    roles: ['TEAM_MANAGER', 'ORG_ADMIN'],
    status: 'ACTIVE'
  },
  {
    id: 'user-zhangsan',
    memberId: 'mem-zhangsan',
    organizationId: DEFAULT_ORGANIZATION_ID,
    displayName: '张三',
    roles: ['TEAM_MANAGER'],
    status: 'ACTIVE'
  },
  {
    id: 'user-lisi',
    memberId: 'mem-lisi',
    organizationId: DEFAULT_ORGANIZATION_ID,
    displayName: '李四',
    roles: ['TEAM_MEMBER'],
    status: 'ACTIVE'
  },
  {
    id: 'user-admin',
    memberId: 'mem-wangwu',
    organizationId: DEFAULT_ORGANIZATION_ID,
    displayName: 'Platform Admin',
    roles: ['PLATFORM_ADMIN', 'ORG_ADMIN'],
    status: 'ACTIVE'
  }
]

/** Mock session default — Team A member 李四 for assignment demos; switchable via useCurrentUser. */
export const DEFAULT_CURRENT_USER_ID = 'user-lisi'

export const mediaPlatforms: MediaPlatform[] = [
  { id: 'media-meta', code: 'META', name: 'Meta', status: 'ACTIVE' },
  { id: 'media-google', code: 'GOOGLE', name: 'Google', status: 'ACTIVE' },
  { id: 'media-tiktok', code: 'TIKTOK', name: 'TikTok', status: 'ACTIVE' },
  { id: 'media-snapchat', code: 'SNAPCHAT', name: 'Snapchat', status: 'ACTIVE' }
]

export const platformAssetTypes: PlatformAssetType[] = [
  { id: 'pat-meta-bm', mediaId: 'media-meta', code: 'BUSINESS_MANAGER', name: 'BM', status: 'ACTIVE' },
  { id: 'pat-google-mcc', mediaId: 'media-google', code: 'MANAGER_ACCOUNT', name: 'MCC', status: 'ACTIVE' },
  { id: 'pat-tiktok-bc', mediaId: 'media-tiktok', code: 'BUSINESS_CENTER', name: 'Business Center', status: 'ACTIVE' },
  { id: 'pat-snap-org', mediaId: 'media-snapchat', code: 'ORGANIZATION', name: 'Organization', status: 'ACTIVE' }
]

export const channels: Channel[] = [
  {
    id: 'ch-alpha',
    code: 'ALPHA',
    name: 'Channel Alpha',
    status: 'ACTIVE',
    supportedMediaIds: ['media-meta', 'media-google', 'media-tiktok'],
    contactName: 'Ada Chen',
    telegramReference: '@alpha_ops',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'ch-beta',
    code: 'BETA',
    name: 'Channel Beta',
    status: 'ACTIVE',
    supportedMediaIds: ['media-meta', 'media-snapchat'],
    contactName: 'Ben Liu',
    telegramReference: '@beta_desk',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'ch-gamma',
    code: 'GAMMA',
    name: 'Channel Gamma',
    status: 'ACTIVE',
    supportedMediaIds: ['media-google', 'media-tiktok'],
    contactName: 'Cara Wu',
    telegramReference: null,
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

export const customers: Customer[] = [
  { id: 'cus-alpha', code: 'ALPHA', name: 'Alpha', status: 'ACTIVE', note: null },
  { id: 'cus-nova', code: 'NOVA', name: 'Nova Retail', status: 'ACTIVE', note: null }
]

export const products: Product[] = [
  { id: 'prd-app-a', code: 'APP_A', name: 'Product A', ownershipType: 'INTERNAL', customerId: null, status: 'ACTIVE', note: null },
  { id: 'prd-app-b', code: 'APP_B', name: 'App B', ownershipType: 'INTERNAL', customerId: null, status: 'ACTIVE', note: null },
  { id: 'prd-alpha-shop', code: 'ALPHA_SHOP', name: 'Alpha Shop', ownershipType: 'EXTERNAL', customerId: 'cus-alpha', status: 'ACTIVE', note: null },
  { id: 'prd-nova', code: 'NOVA_ADS', name: 'Nova Ads', ownershipType: 'EXTERNAL', customerId: 'cus-nova', status: 'ACTIVE', note: null }
]

export const teams: Team[] = [
  { id: 'team-a', code: 'TEAM_A', name: 'Team A', organizationId: DEFAULT_ORGANIZATION_ID, leaderMemberId: 'mem-wangwu', status: 'ACTIVE' },
  { id: 'team-b', code: 'TEAM_B', name: 'Team B', organizationId: DEFAULT_ORGANIZATION_ID, leaderMemberId: 'mem-zhaolei', status: 'ACTIVE' },
  { id: 'team-c', code: 'TEAM_C', name: 'Team C', organizationId: DEFAULT_ORGANIZATION_ID, leaderMemberId: 'mem-sunhao', status: 'ACTIVE' }
]

export const members: Member[] = [
  { id: 'mem-zhangsan', code: 'ZHANG_SAN', name: '张三', teamId: 'team-a', status: 'ACTIVE' },
  { id: 'mem-lisi', code: 'LI_SI', name: '李四', teamId: 'team-a', status: 'ACTIVE' },
  { id: 'mem-wangwu', code: 'WANG_WU', name: '王五', teamId: 'team-a', status: 'ACTIVE' },
  { id: 'mem-zhaolei', code: 'ZHAO_LEI', name: '赵磊', teamId: 'team-b', status: 'ACTIVE' },
  { id: 'mem-chenming', code: 'CHEN_MING', name: '陈明', teamId: 'team-b', status: 'ACTIVE' },
  { id: 'mem-sunhao', code: 'SUN_HAO', name: '孙浩', teamId: 'team-c', status: 'ACTIVE' },
  { id: 'mem-zhouxin', code: 'ZHOU_XIN', name: '周欣', teamId: 'team-c', status: 'ACTIVE' }
]

export const platformAssets: PlatformAsset[] = [
  {
    id: 'pa-meta-123456',
    mediaId: 'media-meta',
    typeId: 'pat-meta-bm',
    externalId: '123456',
    name: 'FFJ BM Primary',
    sourceChannelId: 'ch-alpha',
    status: 'ACTIVE',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'pa-meta-555000',
    mediaId: 'media-meta',
    typeId: 'pat-meta-bm',
    externalId: '555000111',
    name: 'FFJ BM Secondary',
    sourceChannelId: 'ch-beta',
    status: 'ACTIVE',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'pa-google-789012',
    mediaId: 'media-google',
    typeId: 'pat-google-mcc',
    externalId: '789012',
    name: 'FFJ MCC Core',
    sourceChannelId: 'ch-alpha',
    status: 'ACTIVE',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'pa-tiktok-bc1',
    mediaId: 'media-tiktok',
    typeId: 'pat-tiktok-bc',
    externalId: 'bc_778899',
    name: 'FFJ Business Center',
    sourceChannelId: 'ch-gamma',
    status: 'ACTIVE',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'pa-snap-org1',
    mediaId: 'media-snapchat',
    typeId: 'pat-snap-org',
    externalId: 'snap_org_01',
    name: 'FFJ Snap Org',
    sourceChannelId: 'ch-beta',
    status: 'ACTIVE',
    note: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

export const serviceFeePolicies: ServiceFeePolicy[] = [
  {
    id: 'sfp-alpha-std',
    channelId: 'ch-alpha',
    code: 'ALPHA_STD',
    name: 'Alpha Standard',
    status: 'ACTIVE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    note: 'NON_PROGRESSIVE_TIER 2% / 1.5% / 1%'
  },
  {
    id: 'sfp-beta-flat',
    channelId: 'ch-beta',
    code: 'BETA_FLAT',
    name: 'Beta Flat 2%',
    status: 'ACTIVE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    note: null
  },
  {
    id: 'sfp-alpha-promo',
    channelId: 'ch-alpha',
    code: 'ALPHA_PROMO',
    name: 'Alpha Promo 1.2%',
    status: 'ACTIVE',
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
    note: 'Alternate ACTIVE policy for rebind demos'
  }
]

export const serviceFeeTiers: ServiceFeeTier[] = [
  { id: 'tier-alpha-1', policyId: 'sfp-alpha-std', minSpend: 0, maxSpend: 10000, rate: 0.02, sortOrder: 1 },
  { id: 'tier-alpha-2', policyId: 'sfp-alpha-std', minSpend: 10000, maxSpend: 50000, rate: 0.015, sortOrder: 2 },
  { id: 'tier-alpha-3', policyId: 'sfp-alpha-std', minSpend: 50000, maxSpend: null, rate: 0.01, sortOrder: 3 },
  { id: 'tier-beta-1', policyId: 'sfp-beta-flat', minSpend: 0, maxSpend: null, rate: 0.02, sortOrder: 1 },
  { id: 'tier-alpha-promo-1', policyId: 'sfp-alpha-promo', minSpend: 0, maxSpend: null, rate: 0.012, sortOrder: 1 }
]

function account(partial: AdAccount): AdAccount {
  return {
    organizationId: DEFAULT_ORGANIZATION_ID,
    ...partial
  }
}

export const accounts: AdAccount[] = [
  account({
    id: 'acc-case-e',
    externalAccountId: 'act_100001',
    name: 'Spend Demo Account',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-beta',
    timezone: 'GMT-5',
    spendLimit: 50000,
    serviceFeePolicyId: 'sfp-beta-flat',
    assetStatus: 'IN_USE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-06-01',
    firstSeenAt: '2026-06-01T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-fee-a',
    externalAccountId: 'act_200001',
    name: 'Fee Case A',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-alpha',
    timezone: 'GMT+8',
    spendLimit: 80000,
    serviceFeePolicyId: 'sfp-alpha-std',
    assetStatus: 'IN_USE',
    mediaStatus: 'ACTIVE',
    note: '9月14日支付异常，继续观察',
    receivedAt: '2026-08-20',
    firstSeenAt: '2026-08-20T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-fee-b',
    externalAccountId: 'act_200002',
    name: 'Fee Case B',
    mediaId: 'media-google',
    sourceChannelId: 'ch-alpha',
    timezone: 'GMT+8',
    spendLimit: null,
    serviceFeePolicyId: 'sfp-alpha-std',
    assetStatus: 'IN_USE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-08-22',
    firstSeenAt: '2026-08-22T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-case-d',
    externalAccountId: 'act_300001',
    name: 'Member Manager Split',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-alpha',
    timezone: 'GMT-8',
    spendLimit: 40000,
    serviceFeePolicyId: 'sfp-alpha-std',
    assetStatus: 'ASSIGNED',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-07-01',
    firstSeenAt: '2026-07-01T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-snap-1',
    externalAccountId: 'snap_400001',
    name: 'Snapchat Probe',
    mediaId: 'media-snapchat',
    sourceChannelId: 'ch-beta',
    timezone: 'GMT-8',
    spendLimit: 10000,
    serviceFeePolicyId: 'sfp-beta-flat',
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-01',
    firstSeenAt: '2026-09-01T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-idle-1',
    externalAccountId: 'act_500001',
    name: 'Idle Meta',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-beta',
    timezone: 'GMT+0',
    spendLimit: 20000,
    serviceFeePolicyId: 'sfp-beta-flat',
    assetStatus: 'IDLE',
    mediaStatus: 'RESTRICTED',
    note: '渠道通知该BM近期不稳定',
    receivedAt: '2026-05-10',
    firstSeenAt: '2026-05-10T00:00:00.000Z',
    lastSyncAt: '2026-09-12T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-tiktok-1',
    externalAccountId: 'tt_600001',
    name: 'TikTok In Use',
    mediaId: 'media-tiktok',
    sourceChannelId: 'ch-gamma',
    timezone: 'GMT+8',
    spendLimit: 25000,
    serviceFeePolicyId: null,
    assetStatus: 'IN_USE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-08-01',
    firstSeenAt: '2026-08-01T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-banned-1',
    externalAccountId: 'act_700001',
    name: 'Banned Meta',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-alpha',
    timezone: 'GMT+8',
    spendLimit: 15000,
    serviceFeePolicyId: 'sfp-alpha-std',
    assetStatus: 'DISABLED',
    mediaStatus: 'BANNED',
    note: null,
    receivedAt: '2026-04-12',
    firstSeenAt: '2026-04-12T00:00:00.000Z',
    lastSyncAt: '2026-09-08T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  // Phase 4 — Account Pool inventory (AVAILABLE, no current assignment)
  account({
    id: 'acc-pool-meta-1',
    externalAccountId: 'act_800001',
    name: 'Pool Meta NY',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-alpha',
    timezone: 'GMT-5',
    spendLimit: 30000,
    serviceFeePolicyId: 'sfp-alpha-std',
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-05',
    firstSeenAt: '2026-09-05T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-pool-meta-2',
    externalAccountId: 'act_800002',
    name: 'Pool Meta SH',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-beta',
    timezone: 'GMT+8',
    spendLimit: 20000,
    serviceFeePolicyId: 'sfp-beta-flat',
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-08',
    firstSeenAt: '2026-09-08T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-pool-google-1',
    externalAccountId: 'g_800003',
    name: 'Pool Google SG',
    mediaId: 'media-google',
    sourceChannelId: 'ch-gamma',
    timezone: 'GMT+8',
    spendLimit: 25000,
    serviceFeePolicyId: null,
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-10',
    firstSeenAt: '2026-09-10T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-pool-tiktok-1',
    externalAccountId: 'tt_800004',
    name: 'Pool TikTok LA',
    mediaId: 'media-tiktok',
    sourceChannelId: 'ch-gamma',
    timezone: 'GMT-8',
    spendLimit: 15000,
    serviceFeePolicyId: null,
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-12',
    firstSeenAt: '2026-09-12T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }),
  account({
    id: 'acc-pool-snap-2',
    externalAccountId: 'snap_800005',
    name: 'Pool Snapchat LA',
    mediaId: 'media-snapchat',
    sourceChannelId: 'ch-beta',
    timezone: 'GMT-8',
    spendLimit: 12000,
    serviceFeePolicyId: 'sfp-beta-flat',
    assetStatus: 'AVAILABLE',
    mediaStatus: 'ACTIVE',
    note: null,
    receivedAt: '2026-09-14',
    firstSeenAt: '2026-09-14T00:00:00.000Z',
    lastSyncAt: '2026-09-16T08:00:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  })
]

export const accountApiAccess: Record<string, ApiAccessStatus> = {
  'acc-case-e': 'ACCESSIBLE',
  'acc-fee-a': 'ACCESSIBLE',
  'acc-fee-b': 'ACCESSIBLE',
  'acc-case-d': 'ACCESSIBLE',
  'acc-snap-1': 'ACCESSIBLE',
  'acc-idle-1': 'LOST',
  'acc-tiktok-1': 'ACCESSIBLE',
  'acc-banned-1': 'LOST',
  'acc-pool-meta-1': 'LOST',
  'acc-pool-meta-2': 'ACCESSIBLE',
  'acc-pool-google-1': 'ACCESSIBLE',
  'acc-pool-tiktok-1': 'ACCESSIBLE',
  'acc-pool-snap-2': 'ACCESSIBLE'
}

export const accountAssignments: AccountAssignment[] = [
  {
    id: 'asg-case-d-old',
    accountId: 'acc-case-d',
    teamId: 'team-b',
    memberId: 'mem-chenming',
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: '2026-08-15T00:00:00.000Z',
    reason: 'Initial assign',
    createdBy: 'mem-wangwu'
  },
  {
    id: 'asg-case-d-cur',
    accountId: 'acc-case-d',
    teamId: 'team-a',
    memberId: 'mem-zhangsan',
    startedAt: '2026-08-15T00:00:00.000Z',
    endedAt: null,
    reason: 'Transfer to 张三',
    createdBy: 'mem-wangwu'
  },
  {
    id: 'asg-case-e',
    accountId: 'acc-case-e',
    teamId: 'team-b',
    memberId: 'mem-zhaolei',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-zhaolei'
  },
  {
    id: 'asg-fee-a',
    accountId: 'acc-fee-a',
    teamId: 'team-a',
    memberId: 'mem-wangwu',
    startedAt: '2026-08-21T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'asg-fee-b',
    accountId: 'acc-fee-b',
    teamId: 'team-a',
    memberId: 'mem-wangwu',
    startedAt: '2026-08-22T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'asg-idle-1',
    accountId: 'acc-idle-1',
    teamId: 'team-c',
    memberId: 'mem-zhouxin',
    startedAt: '2026-05-12T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  },
  {
    id: 'asg-tiktok-1',
    accountId: 'acc-tiktok-1',
    teamId: 'team-c',
    memberId: 'mem-sunhao',
    startedAt: '2026-08-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  },
  // Phase 5 — Ban Rate demo: banned account still under team current assignment
  {
    id: 'asg-banned-1',
    accountId: 'acc-banned-1',
    teamId: 'team-a',
    memberId: 'mem-lisi',
    startedAt: '2026-04-12T00:00:00.000Z',
    endedAt: null,
    reason: 'Banned while assigned',
    createdBy: 'mem-wangwu'
  }
]

export const accountManagerAssignments: AccountManagerAssignment[] = [
  {
    id: 'mgr-case-d',
    accountId: 'acc-case-d',
    managerMemberId: 'mem-lisi',
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: null,
    reason: '户管保持李四',
    createdBy: 'mem-wangwu'
  },
  {
    id: 'mgr-case-e',
    accountId: 'acc-case-e',
    managerMemberId: 'mem-chenming',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-zhaolei'
  },
  {
    id: 'mgr-fee-a',
    accountId: 'acc-fee-a',
    managerMemberId: 'mem-lisi',
    startedAt: '2026-08-21T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'mgr-fee-b',
    accountId: 'acc-fee-b',
    managerMemberId: 'mem-lisi',
    startedAt: '2026-08-22T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'mgr-idle-1',
    accountId: 'acc-idle-1',
    managerMemberId: 'mem-sunhao',
    startedAt: '2026-05-12T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  },
  {
    id: 'mgr-tiktok-1',
    accountId: 'acc-tiktok-1',
    managerMemberId: 'mem-zhouxin',
    startedAt: '2026-08-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  }
]

export const accountProductAssignments: AccountProductAssignment[] = [
  {
    id: 'prd-asg-case-d',
    accountId: 'acc-case-d',
    productId: 'prd-app-a',
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-wangwu'
  },
  {
    id: 'prd-asg-case-e',
    accountId: 'acc-case-e',
    productId: 'prd-nova',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-zhaolei'
  },
  {
    id: 'prd-asg-fee-a',
    accountId: 'acc-fee-a',
    productId: 'prd-alpha-shop',
    startedAt: '2026-08-21T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'prd-asg-fee-b',
    accountId: 'acc-fee-b',
    productId: 'prd-app-a',
    startedAt: '2026-08-22T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'prd-asg-tiktok-1',
    accountId: 'acc-tiktok-1',
    productId: 'prd-app-b',
    startedAt: '2026-08-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  }
]

export const accountPlatformAssetAssignments: AccountPlatformAssetAssignment[] = [
  {
    id: 'paa-case-d-old',
    accountId: 'acc-case-d',
    platformAssetId: 'pa-meta-555000',
    startedAt: '2026-07-01T00:00:00.000Z',
    endedAt: '2026-09-01T00:00:00.000Z',
    reason: 'Moved BM',
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-case-d-cur',
    accountId: 'acc-case-d',
    platformAssetId: 'pa-meta-123456',
    startedAt: '2026-09-01T00:00:00.000Z',
    endedAt: null,
    reason: 'Current BM 123456',
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-fee-a',
    accountId: 'acc-fee-a',
    platformAssetId: 'pa-meta-123456',
    startedAt: '2026-08-21T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-fee-b',
    accountId: 'acc-fee-b',
    platformAssetId: 'pa-google-789012',
    startedAt: '2026-08-22T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-case-e',
    accountId: 'acc-case-e',
    platformAssetId: 'pa-meta-555000',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-chenming'
  },
  {
    id: 'paa-snap-1',
    accountId: 'acc-snap-1',
    platformAssetId: 'pa-snap-org1',
    startedAt: '2026-09-01T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-chenming'
  },
  {
    id: 'paa-idle-1',
    accountId: 'acc-idle-1',
    platformAssetId: 'pa-meta-555000',
    startedAt: '2026-05-12T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-sunhao'
  },
  {
    id: 'paa-tiktok-1',
    accountId: 'acc-tiktok-1',
    platformAssetId: 'pa-tiktok-bc1',
    startedAt: '2026-08-02T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-zhouxin'
  },
  {
    id: 'paa-banned-1',
    accountId: 'acc-banned-1',
    platformAssetId: 'pa-meta-123456',
    startedAt: '2026-04-12T00:00:00.000Z',
    endedAt: null,
    reason: null,
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-pool-meta-1',
    accountId: 'acc-pool-meta-1',
    platformAssetId: 'pa-meta-123456',
    startedAt: '2026-09-05T00:00:00.000Z',
    endedAt: null,
    reason: 'Pool stock',
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-pool-meta-2',
    accountId: 'acc-pool-meta-2',
    platformAssetId: 'pa-meta-555000',
    startedAt: '2026-09-08T00:00:00.000Z',
    endedAt: null,
    reason: 'Pool stock',
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-pool-google-1',
    accountId: 'acc-pool-google-1',
    platformAssetId: 'pa-google-789012',
    startedAt: '2026-09-10T00:00:00.000Z',
    endedAt: null,
    reason: 'Pool stock',
    createdBy: 'mem-lisi'
  },
  {
    id: 'paa-pool-tiktok-1',
    accountId: 'acc-pool-tiktok-1',
    platformAssetId: 'pa-tiktok-bc1',
    startedAt: '2026-09-12T00:00:00.000Z',
    endedAt: null,
    reason: 'Pool stock',
    createdBy: 'mem-zhouxin'
  },
  {
    id: 'paa-pool-snap-2',
    accountId: 'acc-pool-snap-2',
    platformAssetId: 'pa-snap-org1',
    startedAt: '2026-09-14T00:00:00.000Z',
    endedAt: null,
    reason: 'Pool stock',
    createdBy: 'mem-chenming'
  }
]

export const accountChannelAssignments: AccountChannelAssignment[] = accounts.map(item => ({
  id: `cha-${item.id}`,
  accountId: item.id,
  channelId: item.sourceChannelId,
  startedAt: item.receivedAt ? `${item.receivedAt}T00:00:00.000Z` : ts.created,
  endedAt: null,
  reason: 'Source channel'
}))

export const accountServiceFeePolicyAssignments: AccountServiceFeePolicyAssignment[] = accounts
  .filter(item => item.serviceFeePolicyId)
  .map(item => ({
    id: `sfpa-${item.id}`,
    accountId: item.id,
    policyId: item.serviceFeePolicyId!,
    startedAt: item.receivedAt ? `${item.receivedAt}T00:00:00.000Z` : ts.created,
    endedAt: null
  }))

export const demands: AccountDemand[] = [
  {
    id: 'dmd-001',
    demandNo: 'DM-202609-001',
    teamId: 'team-a',
    requesterUserId: 'mem-wangwu',
    expectedDate: '2026-09-20',
    priority: 'HIGH',
    reason: 'Q4 scaling',
    status: 'PARTIALLY_ALLOCATED',
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-14T00:00:00.000Z'
  },
  {
    id: 'dmd-002',
    demandNo: 'DM-202609-002',
    teamId: 'team-c',
    requesterUserId: 'mem-sunhao',
    expectedDate: '2026-09-18',
    priority: 'URGENT',
    reason: 'Snap inventory shortage',
    status: 'APPROVED',
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-13T00:00:00.000Z'
  },
  {
    id: 'dmd-003',
    demandNo: 'DM-202609-003',
    teamId: 'team-a',
    requesterUserId: 'mem-lisi',
    expectedDate: '2026-09-22',
    priority: 'NORMAL',
    reason: '待负责人审批',
    status: 'SUBMITTED',
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z'
  }
]

export const demandItems: AccountDemandItem[] = [
  {
    id: 'dmdi-001',
    demandId: 'dmd-001',
    mediaId: 'media-meta',
    productId: 'prd-app-a',
    requestedQuantity: 5,
    approvedQuantity: 3,
    requirements: { timezone: 'GMT-5' }
  },
  {
    id: 'dmdi-002',
    demandId: 'dmd-002',
    mediaId: 'media-snapchat',
    productId: 'prd-app-b',
    requestedQuantity: 2,
    approvedQuantity: 2,
    requirements: { timezone: 'GMT-8' }
  },
  {
    id: 'dmdi-003',
    demandId: 'dmd-003',
    mediaId: 'media-meta',
    productId: 'prd-app-a',
    requestedQuantity: 2,
    approvedQuantity: 0,
    requirements: { timezone: 'GMT-5' }
  }
]

export const demandAllocations: AccountDemandAllocation[] = [
  {
    id: 'dmdal-001',
    demandItemId: 'dmdi-001',
    accountId: 'acc-case-d',
    assignmentId: 'asg-case-d-cur',
    allocatedAt: '2026-09-14T00:00:00.000Z',
    allocatedBy: 'mem-lisi'
  }
]

export const channelAccountOrders: ChannelAccountOrder[] = [
  {
    id: 'ord-001',
    orderNo: 'CO-202609-001',
    externalOrderNo: '827',
    channelId: 'ch-beta',
    mediaId: 'media-snapchat',
    relatedDemandItemId: 'dmdi-002',
    requestedQuantity: 2,
    deliveredQuantity: 1,
    timezone: 'GMT-8',
    requirements: { timezone: 'GMT-8' },
    status: 'PARTIAL_DELIVERED',
    partialReminderTime: '10:00',
    inquiryMessageId: 'tg-msg-seed-001',
    acceptedAt: '2026-09-13T01:00:00.000Z',
    acceptedBy: 'supplier-bot',
    rejectReason: null,
    requestedAt: '2026-09-13T00:00:00.000Z',
    completedAt: null
  },
  {
    id: 'ord-002',
    orderNo: 'CO-202609-002',
    externalOrderNo: '901',
    channelId: 'ch-alpha',
    mediaId: 'media-meta',
    relatedDemandItemId: 'dmdi-001',
    requestedQuantity: 3,
    deliveredQuantity: 0,
    timezone: 'GMT-5',
    requirements: { timezone: 'GMT-5' },
    status: 'PENDING',
    partialReminderTime: null,
    inquiryMessageId: null,
    acceptedAt: null,
    acceptedBy: null,
    rejectReason: null,
    requestedAt: '2026-09-15T00:00:00.000Z',
    completedAt: null
  },
  {
    id: 'ord-003',
    orderNo: 'CO-202609-003',
    externalOrderNo: '910',
    channelId: 'ch-alpha',
    mediaId: 'media-meta',
    relatedDemandItemId: 'dmdi-001',
    requestedQuantity: 7,
    deliveredQuantity: 0,
    timezone: 'GMT+7',
    requirements: { timezone: 'GMT+7', type: '外接', need: '加白', product: 'WJ-3' },
    status: 'PENDING_CONFIRM',
    partialReminderTime: null,
    inquiryMessageId: 'tg-msg-seed-003',
    acceptedAt: null,
    acceptedBy: null,
    rejectReason: null,
    requestedAt: '2026-09-17T00:00:00.000Z',
    completedAt: null
  }
]

export const alerts: Alert[] = [
  {
    id: 'al-001',
    type: 'ACCOUNT_BANNED',
    severity: 'URGENT',
    entityType: 'AdAccount',
    entityId: 'acc-banned-1',
    title: '账户封禁',
    description: 'act_700001 被媒体封禁。',
    status: 'OPEN',
    assigneeUserId: null,
    detectedAt: '2026-09-08T04:00:00.000Z',
    resolvedAt: null,
    relatedDemandId: null,
    relatedDemandItemId: null,
    relatedChannelOrderId: null,
    relatedTeamId: null,
    resolutionNote: null
  },
  {
    id: 'al-002',
    type: 'NO_SPEND_48H',
    severity: 'WARNING',
    entityType: 'AdAccount',
    entityId: 'acc-idle-1',
    title: '48小时无消耗',
    description: 'Idle Meta 已超过48小时无消耗。',
    status: 'IN_PROGRESS',
    assigneeUserId: 'mem-sunhao',
    detectedAt: '2026-09-14T00:00:00.000Z',
    resolvedAt: null,
    relatedDemandId: null,
    relatedDemandItemId: null,
    relatedChannelOrderId: null,
    relatedTeamId: null,
    resolutionNote: null
  },
  {
    id: 'al-003',
    type: 'POOL_SHORTAGE',
    severity: 'WARNING',
    entityType: 'AccountDemand',
    entityId: 'dmd-002',
    title: '账户池库存不足',
    description: 'Snapchat 库存无法满足 Team C 需求 DM-202609-002（Shortage 2）。',
    status: 'IN_PROGRESS',
    assigneeUserId: 'mem-lisi',
    detectedAt: '2026-09-13T02:00:00.000Z',
    resolvedAt: null,
    relatedDemandId: 'dmd-002',
    relatedDemandItemId: 'dmdi-002',
    relatedChannelOrderId: 'ord-001',
    relatedTeamId: 'team-c',
    resolutionNote: null
  },
  {
    id: 'al-004',
    type: 'TEAM_ACCOUNT_SHORTAGE',
    severity: 'WARNING',
    entityType: 'Team',
    entityId: 'team-a',
    title: '团队账户不足',
    description: 'Team A 需求 DM-202609-001 Meta 仍有 Shortage，需继续分配或补库。',
    status: 'OPEN',
    assigneeUserId: null,
    detectedAt: '2026-09-14T06:00:00.000Z',
    resolvedAt: null,
    relatedDemandId: 'dmd-001',
    relatedDemandItemId: 'dmdi-001',
    relatedChannelOrderId: null,
    relatedTeamId: 'team-a',
    resolutionNote: null
  },
  {
    id: 'al-005',
    type: 'DEMAND_OVERDUE',
    severity: 'INFO',
    entityType: 'AccountDemand',
    entityId: 'dmd-002',
    title: '需求逾期',
    description: 'DM-202609-002 期望交付日已过，仍未完全满足。',
    status: 'OPEN',
    assigneeUserId: null,
    detectedAt: '2026-09-19T00:00:00.000Z',
    resolvedAt: null,
    relatedDemandId: 'dmd-002',
    relatedDemandItemId: 'dmdi-002',
    relatedChannelOrderId: null,
    relatedTeamId: 'team-c',
    resolutionNote: null
  }
]

export const channelPaymentAddresses: ChannelPaymentAddress[] = [
  {
    id: 'cpa-alpha-usdt',
    channelId: 'ch-alpha',
    type: 'CRYPTO',
    label: 'USDT-TRC20',
    addressPayload: 'TXyzAlpha7kQp9mNv2wR8sHd4jLf6uBc1e',
    status: 'ACTIVE',
    approverTeamId: 'team-a',
    submittedByMemberId: 'mem-lisi',
    reviewedByMemberId: 'mem-wangwu',
    reviewedAt: ts.created,
    reviewNote: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'cpa-alpha-bank',
    channelId: 'ch-alpha',
    type: 'FIAT',
    label: '对公户 USD',
    addressPayload: 'Bank of HK · ****8891 · Alpha Media Ltd',
    status: 'ACTIVE',
    approverTeamId: 'team-a',
    submittedByMemberId: 'mem-lisi',
    reviewedByMemberId: 'mem-wangwu',
    reviewedAt: ts.created,
    reviewNote: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'cpa-beta-usdt',
    channelId: 'ch-beta',
    type: 'CRYPTO',
    label: 'USDT-ERC20',
    addressPayload: '0xBetaAa11Bb22Cc33Dd44Ee55Ff6677889900AaBb',
    status: 'ACTIVE',
    approverTeamId: 'team-b',
    submittedByMemberId: 'mem-lisi',
    reviewedByMemberId: 'mem-zhaolei',
    reviewedAt: ts.created,
    reviewNote: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'cpa-gamma-bank',
    channelId: 'ch-gamma',
    type: 'FIAT',
    label: '对公户 USD',
    addressPayload: 'DBS SG · ****4420 · Gamma Ads Pte',
    status: 'ACTIVE',
    approverTeamId: 'team-c',
    submittedByMemberId: 'mem-lisi',
    reviewedByMemberId: 'mem-sunhao',
    reviewedAt: ts.created,
    reviewNote: null,
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'cpa-gamma-pending',
    channelId: 'ch-gamma',
    type: 'CRYPTO',
    label: 'USDT-TRC20 (待审)',
    addressPayload: 'TPendingGammaAddrNotSelectableYet001',
    status: 'PENDING_APPROVAL',
    approverTeamId: 'team-c',
    submittedByMemberId: 'mem-lisi',
    reviewedByMemberId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: ts.updated,
    updatedAt: ts.updated
  }
]

export const channelReconciliations: ChannelReconciliation[] = []

export const channelPrepayments: ChannelPrepayment[] = [
  {
    id: 'pay-001',
    paymentNo: 'PP-202608-001',
    channelId: 'ch-alpha',
    paymentAddressId: 'cpa-alpha-bank',
    productOwnership: 'INTERNAL',
    amount: 50000,
    currency: 'USD',
    status: 'CONFIRMED',
    paidAt: '2026-08-01T00:00:00.000Z',
    confirmedAt: '2026-08-02T00:00:00.000Z',
    note: null,
    createdAt: '2026-08-01T00:00:00.000Z'
  }
]

export const channelRefunds: ChannelRefund[] = [
  {
    id: 'ref-001',
    refundNo: 'RF-202609-001',
    channelId: 'ch-gamma',
    amount: 2000,
    currency: 'USD',
    reason: 'Unused prepayment after pausing a line',
    status: 'PENDING',
    requestedAt: '2026-09-10T00:00:00.000Z',
    confirmedAt: null,
    note: null,
    createdAt: '2026-09-10T00:00:00.000Z'
  }
]

/** Media access refactor — PlatformApp seeds (system-level App per media). */
export const platformApps: PlatformApp[] = [
  {
    id: 'papp-meta-01',
    mediaId: 'media-meta',
    appId: 'mock-meta-app-id',
    hasSecret: true,
    hasDeveloperToken: false,
    status: 'ACTIVE',
    isDefault: true,
    redirectUriHint: '/api/oauth/meta/callback',
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'papp-google-01',
    mediaId: 'media-google',
    appId: 'mock-google-client-id',
    hasSecret: true,
    hasDeveloperToken: true,
    status: 'ACTIVE',
    isDefault: true,
    redirectUriHint: '/api/oauth/google/callback',
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

/** @deprecated Kept for demand-field / legacy sync bridge during transition. */
export const mediaConnectorBindings: MediaConnectorBinding[] = [
  {
    id: 'mcb-meta',
    mediaId: 'media-meta',
    implKey: 'meta',
    assetTypeIds: ['pat-meta-bm'],
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'mcb-google',
    mediaId: 'media-google',
    implKey: 'google',
    assetTypeIds: ['pat-google-mcc'],
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'mcb-tiktok',
    mediaId: 'media-tiktok',
    implKey: 'tiktok',
    assetTypeIds: ['pat-tiktok-bc'],
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  },
  {
    id: 'mcb-snapchat',
    mediaId: 'media-snapchat',
    implKey: 'snapchat',
    assetTypeIds: ['pat-snap-org'],
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

/** Hardcoded DEMAND hints for ApplyAccountDemandModal (no UI config). */
export const mediaFieldDefinitions: MediaFieldDefinition[] = [
  {
    id: 'mfd-meta-bm-hint',
    mediaId: 'media-meta',
    usage: 'DEMAND',
    key: 'preferredBmHint',
    label: 'Preferred BM hint',
    fieldType: 'text',
    required: false,
    status: 'ACTIVE',
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

/** @deprecated Prefer PlatformApp + MediaConnection. */
export const mediaCredentials: MediaCredential[] = []

/** @deprecated */
export const syncScopeConfigs: SyncScopeConfig[] = []

/** Tenant-plane MediaConnection — platformAppId required for authorized rows. */
export const mediaConnections: MediaConnection[] = [
  {
    id: 'conn-meta-wangwu',
    organizationId: DEFAULT_ORGANIZATION_ID,
    teamId: 'team-a',
    platformId: 'media-meta',
    displayName: 'Meta - 王五',
    authorizedByUserId: 'user-wangwu',
    status: 'MOCK',
    providerIdentityId: 'meta-user-wangwu',
    providerIdentityName: '王五 (Mock)',
    scopes: ['ads_read'],
    isMock: true,
    platformAppId: 'papp-meta-01',
    legacyCredentialId: null,
    authorizedAt: '2026-09-15T10:00:00.000Z',
    expiresAt: null,
    lastVerifiedAt: '2026-09-20T08:00:00.000Z',
    lastSyncAt: '2026-09-20T08:05:00.000Z',
    createdAt: ts.created,
    updatedAt: ts.updated
  }
]

export const connectionSecrets: ConnectionSecret[] = [
  {
    connectionId: 'conn-meta-wangwu',
    hasAccessToken: true,
    hasRefreshToken: false,
    tokenExpiresAt: null,
    secretVersion: 1,
    updatedAt: ts.updated
  }
]

export const connectionAccounts: ConnectionAccount[] = [
  {
    id: 'ca-meta-100001',
    organizationId: DEFAULT_ORGANIZATION_ID,
    connectionId: 'conn-meta-wangwu',
    mediaAccountId: 'acc-case-e',
    providerAccessStatus: 'ACCESSIBLE',
    syncEnabled: true,
    isPrimarySyncSource: true,
    discoveredAt: '2026-09-15T10:05:00.000Z',
    lastVerifiedAt: '2026-09-20T08:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-20T08:05:00.000Z',
    createdAt: '2026-09-15T10:05:00.000Z',
    updatedAt: ts.updated
  },
  {
    id: 'ca-meta-200001',
    organizationId: DEFAULT_ORGANIZATION_ID,
    connectionId: 'conn-meta-wangwu',
    mediaAccountId: 'acc-fee-a',
    providerAccessStatus: 'ACCESSIBLE',
    syncEnabled: true,
    isPrimarySyncSource: true,
    discoveredAt: '2026-09-15T10:05:00.000Z',
    lastVerifiedAt: '2026-09-20T08:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-20T08:05:00.000Z',
    createdAt: '2026-09-15T10:05:00.000Z',
    updatedAt: ts.updated
  }
]

export const teamAccountLinks: TeamAccountLink[] = [
  {
    id: 'tal-case-e',
    organizationId: DEFAULT_ORGANIZATION_ID,
    teamId: 'team-a',
    mediaAccountId: 'acc-case-e',
    status: 'ACTIVE',
    assignedByUserId: 'user-wangwu',
    assignedAt: '2026-09-15T10:10:00.000Z',
    endedAt: null
  },
  {
    id: 'tal-fee-a',
    organizationId: DEFAULT_ORGANIZATION_ID,
    teamId: 'team-a',
    mediaAccountId: 'acc-fee-a',
    status: 'ACTIVE',
    assignedByUserId: 'user-wangwu',
    assignedAt: '2026-09-15T10:10:00.000Z',
    endedAt: null
  }
]

export const userAccountAccesses: UserAccountAccess[] = [
  {
    id: 'uaa-case-e-wangwu',
    organizationId: DEFAULT_ORGANIZATION_ID,
    mediaAccountId: 'acc-case-e',
    userId: 'user-wangwu',
    assignmentType: 'IMPORTED_BY',
    assignedByUserId: 'user-wangwu',
    assignedAt: '2026-09-15T10:10:00.000Z',
    status: 'ACTIVE',
    endedAt: null
  },
  {
    id: 'uaa-fee-a-wangwu',
    organizationId: DEFAULT_ORGANIZATION_ID,
    mediaAccountId: 'acc-fee-a',
    userId: 'user-wangwu',
    assignmentType: 'IMPORTED_BY',
    assignedByUserId: 'user-wangwu',
    assignedAt: '2026-09-15T10:10:00.000Z',
    status: 'ACTIVE',
    endedAt: null
  },
  {
    id: 'uaa-case-e-lisi',
    organizationId: DEFAULT_ORGANIZATION_ID,
    mediaAccountId: 'acc-case-e',
    userId: 'user-lisi',
    assignmentType: 'ASSIGNED',
    assignedByUserId: 'user-wangwu',
    assignedAt: '2026-09-16T09:00:00.000Z',
    status: 'ACTIVE',
    endedAt: null
  }
]

export const auditLogs: AuditLog[] = []

