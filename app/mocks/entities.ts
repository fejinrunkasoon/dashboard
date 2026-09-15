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
import type { ChannelPrepayment, ChannelRefund, ServiceFeePolicy, ServiceFeeTier } from '../domain/finance'
import type { MediaPlatform, PlatformAsset, PlatformAssetType } from '../domain/media'
import type { Member, Team } from '../domain/organization'
import type { Customer, Product } from '../domain/product'
import type { ApiAccessStatus } from '../domain/common'

const ts = {
  created: '2026-01-15T00:00:00.000Z',
  updated: '2026-09-10T00:00:00.000Z'
}

export const mediaPlatforms: MediaPlatform[] = [
  { id: 'media-meta', code: 'META', name: 'Meta', status: 'ACTIVE' },
  { id: 'media-google', code: 'GOOGLE', name: 'Google', status: 'ACTIVE' },
  { id: 'media-tiktok', code: 'TIKTOK', name: 'TikTok', status: 'ACTIVE' },
  { id: 'media-snapchat', code: 'SNAPCHAT', name: 'Snapchat', status: 'ACTIVE' }
]

export const platformAssetTypes: PlatformAssetType[] = [
  { id: 'pat-meta-bm', mediaId: 'media-meta', code: 'BUSINESS_MANAGER', name: 'BM' },
  { id: 'pat-google-mcc', mediaId: 'media-google', code: 'MANAGER_ACCOUNT', name: 'MCC' },
  { id: 'pat-tiktok-bc', mediaId: 'media-tiktok', code: 'BUSINESS_CENTER', name: 'Business Center' },
  { id: 'pat-snap-org', mediaId: 'media-snapchat', code: 'ORGANIZATION', name: 'Organization' }
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
  { id: 'team-a', code: 'TEAM_A', name: 'Team A', leaderMemberId: 'mem-wangwu', status: 'ACTIVE' },
  { id: 'team-b', code: 'TEAM_B', name: 'Team B', leaderMemberId: 'mem-zhaolei', status: 'ACTIVE' },
  { id: 'team-c', code: 'TEAM_C', name: 'Team C', leaderMemberId: 'mem-sunhao', status: 'ACTIVE' }
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
  }
]

export const serviceFeeTiers: ServiceFeeTier[] = [
  { id: 'tier-alpha-1', policyId: 'sfp-alpha-std', minSpend: 0, maxSpend: 10000, rate: 0.02, sortOrder: 1 },
  { id: 'tier-alpha-2', policyId: 'sfp-alpha-std', minSpend: 10000, maxSpend: 50000, rate: 0.015, sortOrder: 2 },
  { id: 'tier-alpha-3', policyId: 'sfp-alpha-std', minSpend: 50000, maxSpend: null, rate: 0.01, sortOrder: 3 },
  { id: 'tier-beta-1', policyId: 'sfp-beta-flat', minSpend: 0, maxSpend: null, rate: 0.02, sortOrder: 1 }
]

function account(partial: AdAccount): AdAccount {
  return partial
}

export const accounts: AdAccount[] = [
  account({
    id: 'acc-case-e',
    externalAccountId: 'act_100001',
    name: 'Spend Demo Account',
    mediaId: 'media-meta',
    sourceChannelId: 'ch-beta',
    timezone: 'America/New_York',
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
    timezone: 'Asia/Shanghai',
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
    timezone: 'Asia/Shanghai',
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
    timezone: 'America/Los_Angeles',
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
    timezone: 'America/Los_Angeles',
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
    timezone: 'Europe/London',
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
    timezone: 'Asia/Singapore',
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
    timezone: 'Asia/Shanghai',
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
  'acc-banned-1': 'LOST'
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
    requirements: { timezone: 'America/New_York' }
  },
  {
    id: 'dmdi-002',
    demandId: 'dmd-002',
    mediaId: 'media-snapchat',
    productId: 'prd-app-b',
    requestedQuantity: 2,
    approvedQuantity: 2,
    requirements: { timezone: 'America/Los_Angeles' }
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
    channelId: 'ch-beta',
    mediaId: 'media-snapchat',
    relatedDemandItemId: 'dmdi-002',
    requestedQuantity: 2,
    deliveredQuantity: 1,
    timezone: 'America/Los_Angeles',
    requirements: { timezone: 'America/Los_Angeles' },
    status: 'PARTIALLY_DELIVERED',
    requestedAt: '2026-09-13T00:00:00.000Z',
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
    resolvedAt: null
  },
  {
    id: 'al-002',
    type: 'NO_SPEND_48H',
    severity: 'WARNING',
    entityType: 'AdAccount',
    entityId: 'acc-idle-1',
    title: '48小时无消耗',
    description: 'Idle Meta 已超过48小时无消耗。',
    status: 'ACKNOWLEDGED',
    assigneeUserId: 'mem-sunhao',
    detectedAt: '2026-09-14T00:00:00.000Z',
    resolvedAt: null
  },
  {
    id: 'al-003',
    type: 'POOL_SHORTAGE',
    severity: 'WARNING',
    entityType: 'AccountDemand',
    entityId: 'dmd-002',
    title: '库存不足',
    description: 'Snapchat 库存无法满足 Team C 需求。',
    status: 'IN_PROGRESS',
    assigneeUserId: 'mem-lisi',
    detectedAt: '2026-09-13T02:00:00.000Z',
    resolvedAt: null
  }
]

export const channelPrepayments: ChannelPrepayment[] = [
  {
    id: 'pay-001',
    paymentNo: 'PP-202608-001',
    channelId: 'ch-alpha',
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
