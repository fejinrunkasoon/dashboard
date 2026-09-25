/**
 * Phase 24 — E2E Business Walkthrough Gate (Mock / Service).
 * Run: node_modules/.pnpm/node_modules/.bin/jiti scripts/phase24-e2e-walkthrough.ts
 */
import {
  accountApiAccess,
  accountAssignments,
  accountManagerAssignments,
  accountProductAssignments,
  accountSpendDaily,
  accounts,
  demandAllocations,
  demandItems
} from '../app/mocks'
import { isInAccountPool } from '../app/services/accounts/pool-eligibility'
import { accountService } from '../app/services/accounts/mock'
import { alertService } from '../app/services/alerts/mock'
import { demandService } from '../app/services/demands/mock'
import { MOCK_TODAY } from '../app/utils/spend-aggregation'

const LEADER = 'mem-wangwu'
const MEMBER = 'mem-zhangsan'
/** Audit member id for successful allocates — TEAM_MANAGER. */
const ALLOCATOR = 'mem-zhangsan'
const ALLOCATOR_USER = 'user-zhangsan'
const MEMBER_USER = 'user-lisi'
const MANAGER = 'mem-lisi'
const NON_LEADER = 'mem-lisi'

let passed = 0
let failed = 0

function ok(label: string) {
  passed += 1
  console.log(`  ✓ ${label}`)
}

function fail(label: string, detail?: unknown) {
  failed += 1
  console.error(`  ✗ ${label}`, detail ?? '')
}

async function expectReject(label: string, fn: () => Promise<unknown>, match?: RegExp) {
  try {
    await fn()
    fail(label, 'expected throw')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (match && !match.test(message)) {
      fail(label, `message mismatch: ${message}`)
      return
    }
    ok(label)
  }
}

function deliveryReply(opts: {
  externalOrderNo: string
  accounts: { name: string, id: string }[]
  claimed?: number
}) {
  const claimed = opts.claimed ?? opts.accounts.length
  const lines = opts.accounts.map(a => `${a.name} (${a.id})`).join('\n')
  return `开户申请 - 部分完成
下户ID：${opts.externalOrderNo}
平台：Facebook
账户数：${claimed}
已下户：${claimed}

${lines}

BM：
bm_e2e_1`
}

async function stepApproval() {
  console.log('\n1. Demand 审批')
  const draft = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    expectedDate: '2026-09-20',
    priority: 'P1',
    reason: 'Phase24 E2E main',
    mediaId: 'media-meta',
    productId: 'prd-app-a',
    requestedQuantity: 3,
    requirements: { timezone: 'GMT+8' },
    submit: true
  })
  if (draft.status !== 'SUBMITTED') fail('create+submit → SUBMITTED', draft.status)
  else ok('create+submit → SUBMITTED')

  const items = await demandService.getDemandItems(draft.id)
  const itemId = items[0]!.id

  await expectReject(
    '非负责人审批失败',
    () => demandService.approveDemand(draft.id, NON_LEADER),
    /team leader/i
  )

  await expectReject(
    '未审批不可 Allocate',
    () => demandService.allocate({
      demandItemId: itemId,
      accountIds: ['acc-pool-meta-2'],
      allocatedBy: ALLOCATOR,
      memberId: MEMBER,
      managerId: MANAGER,
      actorUserId: ALLOCATOR_USER
    }),
    /cannot be allocated/i
  )

  const approved = await demandService.approveDemand(draft.id, LEADER)
  if (approved.status !== 'APPROVED') fail('负责人审批 → APPROVED', approved.status)
  else ok('负责人审批 → APPROVED')

  return { demandId: draft.id, itemId, demandNo: draft.demandNo }
}

async function stepAllocateAndGuards(itemId: string) {
  console.log('\n2. 池内 Allocate + 守卫')

  if (isInAccountPool('acc-banned-1')) fail('BANNED 不得在 Matching Pool')
  else ok('BANNED 不在 Matching Pool')

  await expectReject(
    'BANNED 不可 Allocate',
    () => demandService.allocate({
      demandItemId: itemId,
      accountIds: ['acc-banned-1'],
      allocatedBy: ALLOCATOR,
      memberId: MEMBER,
      managerId: MANAGER,
      actorUserId: ALLOCATOR_USER
    }),
    /not in the allocatable pool/i
  )

  await expectReject(
    'TEAM_MEMBER 不可 Allocate',
    () => demandService.allocate({
      demandItemId: itemId,
      accountIds: ['acc-pool-meta-2'],
      allocatedBy: NON_LEADER,
      memberId: MEMBER,
      managerId: MANAGER,
      actorUserId: MEMBER_USER
    }),
    /TEAM_MANAGER can allocate/i
  )

  await expectReject(
    'TEAM_MEMBER 不可 DIRECT 分配',
    () => accountService.assignDirect({
      accountIds: ['acc-pool-google-1'],
      teamId: 'team-a',
      memberId: MEMBER,
      managerId: MANAGER,
      productId: 'prd-app-a',
      reason: 'member should fail',
      createdBy: NON_LEADER,
      actorUserId: MEMBER_USER
    }),
    /TEAM_MANAGER can allocate/i
  )

  // LOST credential path on a separate GMT-5 demand (seed acc-pool-meta-1 is LOST)
  const lostDemand = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    expectedDate: '2026-09-22',
    priority: 'P2',
    reason: 'Phase24 LOST credential allocate',
    mediaId: 'media-meta',
    productId: 'prd-app-a',
    requestedQuantity: 1,
    requirements: { timezone: 'GMT-5' },
    submit: true
  })
  await demandService.approveDemand(lostDemand.id, LEADER)
  const lostItem = (await demandService.getDemandItems(lostDemand.id))[0]!
  if (accountApiAccess['acc-pool-meta-1'] !== 'LOST') {
    fail('seed acc-pool-meta-1 should be LOST')
  } else {
    ok('种子池户 Credential LOST 仍在 Matching Pool')
  }

  await alertService.reportCredentialLost('acc-pool-meta-1')
  const lostAlloc = await demandService.allocate({
    demandItemId: lostItem.id,
    accountIds: ['acc-pool-meta-1'],
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  if (lostAlloc.demand.status !== 'FULFILLED') fail('LOST 户仍可分配', lostAlloc.demand.status)
  else ok('LOST 户确认后仍可分配')

  const credAlerts = await alertService.getAlerts({
    types: ['CREDENTIAL_EXPIRED'],
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 50
  })
  if (!credAlerts.data.some(a => a.entityId === 'acc-pool-meta-1')) {
    fail('应写出 CREDENTIAL_EXPIRED Alert')
  } else {
    ok('CREDENTIAL_EXPIRED Alert 已写出')
  }

  // Main path: allocate GMT+8 pool account
  const result = await demandService.allocate({
    demandItemId: itemId,
    accountIds: ['acc-pool-meta-2'],
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  if (result.demand.status !== 'PARTIALLY_ALLOCATED') {
    fail('主链 Allocate → PARTIALLY_ALLOCATED', result.demand.status)
  } else {
    ok('主链 Allocate → PARTIALLY_ALLOCATED')
  }

  const assignment = accountAssignments.find(
    a => a.accountId === 'acc-pool-meta-2' && a.endedAt == null
  )
  const manager = accountManagerAssignments.find(
    a => a.accountId === 'acc-pool-meta-2' && a.endedAt == null
  )
  const product = accountProductAssignments.find(
    a => a.accountId === 'acc-pool-meta-2' && a.endedAt == null
  )
  if (
    assignment?.teamId === 'team-a'
    && assignment.memberId === MEMBER
    && manager?.managerMemberId === MANAGER
    && product?.productId === 'prd-app-a'
  ) {
    ok('四关系一次写齐（Team/Member/Product/户管）')
  } else {
    fail('四关系未写齐', { assignment, manager, product })
  }

  return { lostDemandId: lostDemand.id, lostItemId: lostItem.id }
}

async function stepShortageOrder(itemId: string, demandNo: string) {
  console.log('\n3. Shortage 建单')

  const rows = await demandService.getSchedulingDemandItems()
  const row = rows.find(r => r.itemId === itemId)
  if (!row || row.shortage <= 0) {
    fail('调度行应有 Shortage', row)
    throw new Error('no shortage')
  }
  ok(`Shortage = ${row.shortage}（remaining ${row.remainingQuantity}, pool ${row.poolMatchCount}）`)

  const alerts = await alertService.getAlerts({
    types: ['POOL_SHORTAGE', 'TEAM_ACCOUNT_SHORTAGE'],
    relatedDemandItemId: itemId,
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 20
  })
  if (!alerts.data.length) fail('应产生 Shortage Alert')
  else ok(`Shortage Alert: ${alerts.data[0]!.type}`)

  await expectReject(
    '无 Demand 不可建 Order',
    () => demandService.createChannelAccountOrder({
      channelId: 'ch-alpha',
      mediaId: 'media-meta',
      requestedQuantity: 1,
      externalOrderNo: 'E2E-NO-DEMAND',
      relatedDemandItemId: ''
    } as never),
    /relatedDemandItemId/i
  )

  // Also reject unknown demand item
  await expectReject(
    '未知 Demand Item 不可建 Order',
    () => demandService.createChannelAccountOrder({
      channelId: 'ch-alpha',
      mediaId: 'media-meta',
      requestedQuantity: 1,
      externalOrderNo: 'E2E-BAD-ITEM',
      relatedDemandItemId: 'dmdi-does-not-exist'
    }),
    /Unknown demand item/i
  )

  const externalOrderNo = `E2E-${demandNo}`
  const order = await demandService.createChannelAccountOrder({
    channelId: 'ch-alpha',
    mediaId: 'media-meta',
    requestedQuantity: row.shortage,
    externalOrderNo,
    relatedDemandItemId: itemId,
    timezone: 'GMT+8'
  })
  if (!order.externalOrderNo || order.relatedDemandItemId !== itemId) {
    fail('Order 须挂 Demand + externalOrderNo', order)
  } else {
    ok(`建单 ${order.orderNo} / external=${order.externalOrderNo}`)
  }

  return { orderId: order.id, externalOrderNo, shortageQty: row.shortage }
}

async function stepMockTelegram(orderId: string, externalOrderNo: string, itemId: string) {
  console.log('\n4. 模拟 TG → 入库（≠ Allocate）')

  await demandService.sendMockInquiry(orderId)
  await demandService.acceptMockInquiry(orderId)

  const partial = await demandService.submitMockDeliveryReply(
    orderId,
    deliveryReply({
      externalOrderNo,
      accounts: [{ name: 'E2E Partial One', id: 'act_e2e_partial_001' }],
      claimed: 1
    })
  )
  if (!partial.validation.ok) fail('部分交付 Reply 校验', partial.validation)
  else ok('部分交付 Reply 校验通过')

  const confirmed1 = await demandService.confirmDeliveryFromDraft(orderId)
  if (confirmed1.order.status !== 'PARTIAL_DELIVERED') {
    fail('部分入库 → PARTIAL_DELIVERED', confirmed1.order.status)
  } else {
    ok('部分入库 → PARTIAL_DELIVERED')
  }

  const first = confirmed1.accounts[0]!
  if (first.assetStatus !== 'AVAILABLE' || first.sourceChannelId !== 'ch-alpha') {
    fail('入库户须 AVAILABLE + sourceChannelId', first)
  } else {
    ok('入库户 AVAILABLE + sourceChannelId')
  }
  if (accountAssignments.some(a => a.accountId === first.id && a.endedAt == null)) {
    fail('Confirm Delivery 禁止自动 Allocate')
  } else {
    ok('Confirm Delivery 后无进行中 Assignment')
  }

  const item = demandItems.find(i => i.id === itemId)!
  const demand = await demandService.getDemandById(item.demandId)
  const allocatedBefore = demandAllocations.filter(a => a.demandItemId === itemId).length
  if (demand?.status !== 'PARTIALLY_ALLOCATED' || allocatedBefore !== 1) {
    fail('入库后 Demand 仍未因交付而增加分配', {
      status: demand?.status,
      allocatedBefore
    })
  } else {
    ok('入库 ≠ 分配（Demand 仍为部分分配、allocated=1）')
  }

  // Continue with overflow: need 1 more for order, send 2 → overflow into pool
  const cont = await demandService.submitMockDeliveryReply(
    orderId,
    deliveryReply({
      externalOrderNo,
      accounts: [
        { name: 'E2E Continue', id: 'act_e2e_cont_002' },
        { name: 'E2E Overflow', id: 'act_e2e_over_003' }
      ],
      claimed: 2
    })
  )
  if (!cont.validation.ok) fail('续交+超交 Reply 校验', cont.validation)
  else if (!cont.validation.warnings.some(w => w.code === 'OVERFLOW')) {
    fail('应有 OVERFLOW 警告', cont.validation.warnings)
  } else {
    ok('续交 Reply 带 OVERFLOW 警告')
  }

  const confirmed2 = await demandService.confirmDeliveryFromDraft(orderId)
  if (confirmed2.order.status !== 'DELIVERED') {
    fail('续交至满 → DELIVERED', confirmed2.order.status)
  } else {
    ok('续交至满 → DELIVERED')
  }
  if (confirmed2.order.deliveredQuantity !== 2) {
    fail('超交不增加 deliveredQuantity 超申请', confirmed2.order.deliveredQuantity)
  } else {
    ok('deliveredQuantity=申请量；超交户另计入库')
  }

  const overflow = confirmed2.accounts.find(a => a.externalAccountId === 'act_e2e_over_003')
  if (!overflow || overflow.assetStatus !== 'AVAILABLE' || !isInAccountPool(overflow.id)) {
    fail('超交户进 Pool 不挂 Demand', overflow)
  } else {
    ok('超交户进 Matching Pool')
  }

  // Cancel after delivery → PARTIAL_CLOSED would need partial; for DELIVERED cancel may fail.
  // Plan: 已交付取消不撤回已入库户 — exercise via a fresh partial order cancel.
  const cancelProbe = await demandService.createChannelAccountOrder({
    channelId: 'ch-alpha',
    mediaId: 'media-meta',
    requestedQuantity: 2,
    externalOrderNo: 'E2E-CANCEL-PROBE',
    relatedDemandItemId: itemId,
    timezone: 'GMT+8'
  })
  await demandService.sendMockInquiry(cancelProbe.id)
  await demandService.acceptMockInquiry(cancelProbe.id)
  await demandService.submitMockDeliveryReply(
    cancelProbe.id,
    deliveryReply({
      externalOrderNo: 'E2E-CANCEL-PROBE',
      accounts: [{ name: 'Cancel Keep', id: 'act_e2e_cancel_keep' }],
      claimed: 1
    })
  )
  const keepResult = await demandService.confirmDeliveryFromDraft(cancelProbe.id)
  const keepId = keepResult.accountIds[0]!
  const closed = await demandService.cancelChannelAccountOrder(cancelProbe.id)
  if (closed.status !== 'PARTIAL_CLOSED') fail('已交付取消 → PARTIAL_CLOSED', closed.status)
  else ok('已交付取消 → PARTIAL_CLOSED')
  const keepAccount = accounts.find(a => a.id === keepId)
  if (!keepAccount || keepAccount.assetStatus !== 'AVAILABLE') {
    fail('已交付取消不得撤回入库户', keepAccount)
  } else {
    ok('已交付取消不撤回入库户')
  }

  return {
    intakeIds: [
      ...confirmed1.accountIds,
      ...confirmed2.accountIds.filter(id => {
        const acc = accounts.find(a => a.id === id)
        return acc?.externalAccountId !== 'act_e2e_over_003'
      })
    ].filter(id => id !== keepId),
    // Prefer the two accounts that fill the shortage (partial + continue), not overflow/cancel
    fillAccountIds: [
      confirmed1.accountIds[0]!,
      confirmed2.accounts.find(a => a.externalAccountId === 'act_e2e_cont_002')!.id
    ]
  }
}

async function stepReallocate(itemId: string, fillAccountIds: string[]) {
  console.log('\n5. 再 Allocate 闭合 Demand')

  const result = await demandService.allocate({
    demandItemId: itemId,
    accountIds: fillAccountIds,
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  if (result.demand.status !== 'FULFILLED') fail('再 Allocate → FULFILLED', result.demand.status)
  else ok('再 Allocate → FULFILLED')

  const openShortage = await alertService.getAlerts({
    types: ['POOL_SHORTAGE', 'TEAM_ACCOUNT_SHORTAGE'],
    relatedDemandItemId: itemId,
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 10
  })
  if (openShortage.data.length) fail('Shortage Alert 应已 resolve', openShortage.data)
  else ok('Shortage Alert 已 resolveShortageAlertsForDemandItem')
}

async function stepIdleRecycle() {
  console.log('\n6. 闲置回收（独立 Demand）')

  // Seed three AVAILABLE Meta GMT+0 accounts via order intake path would need demand;
  // mutate timezone on freshly created accounts after intakeAdAccount is heavy —
  // use Google pool account + create demands per scenario with matching timezone.

  // FULFILLED cannot be cancelled — use qty=2 + allocate 1 → PARTIALLY_ALLOCATED.

  // --- spend: no recycle ---
  const spendDemand = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    priority: 'P2',
    reason: 'Phase24 idle spend',
    mediaId: 'media-google',
    productId: 'prd-app-a',
    requestedQuantity: 2,
    requirements: { timezone: 'GMT+8' },
    submit: true
  })
  await demandService.approveDemand(spendDemand.id, LEADER)
  const spendItem = (await demandService.getDemandItems(spendDemand.id))[0]!
  await demandService.allocate({
    demandItemId: spendItem.id,
    accountIds: ['acc-pool-google-1'],
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  accountSpendDaily.push({
    accountId: 'acc-pool-google-1',
    date: MOCK_TODAY,
    currency: 'USD',
    spend: 12
  })
  const spendCancel = await demandService.cancelDemand(spendDemand.id)
  if (
    spendCancel.autoRecycledAccountIds.length === 0
    && !spendCancel.pendingManualAccountIds.includes('acc-pool-google-1')
  ) {
    ok('有消耗不回收')
  } else {
    fail('有消耗不应回收', spendCancel)
  }
  if (!accountAssignments.some(a => a.accountId === 'acc-pool-google-1' && a.endedAt == null)) {
    fail('有消耗户应仍保持 Assignment')
  } else {
    ok('有消耗户 Assignment 仍进行中')
  }

  // --- auto >1 day ---
  const autoDemand = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    priority: 'P2',
    reason: 'Phase24 idle auto',
    mediaId: 'media-tiktok',
    productId: 'prd-app-a',
    requestedQuantity: 2,
    requirements: { timezone: 'GMT-8' },
    submit: true
  })
  await demandService.approveDemand(autoDemand.id, LEADER)
  const autoItem = (await demandService.getDemandItems(autoDemand.id))[0]!
  await demandService.allocate({
    demandItemId: autoItem.id,
    accountIds: ['acc-pool-tiktok-1'],
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  const autoAlloc = demandAllocations.find(
    a => a.demandItemId === autoItem.id && a.accountId === 'acc-pool-tiktok-1'
  )
  if (autoAlloc) autoAlloc.allocatedAt = '2026-09-10T12:00:00.000Z'
  // Seed spend spans Sep; clear post-allocate spend so idle clock applies.
  for (let i = accountSpendDaily.length - 1; i >= 0; i -= 1) {
    const row = accountSpendDaily[i]!
    if (row.accountId === 'acc-pool-tiktok-1' && row.date >= '2026-09-10') {
      accountSpendDaily.splice(i, 1)
    }
  }
  const autoCancel = await demandService.cancelDemand(autoDemand.id)
  if (!autoCancel.autoRecycledAccountIds.includes('acc-pool-tiktok-1')) {
    fail('闲置 >1 天应自动回收', autoCancel)
  } else {
    ok('闲置 >1 天自动回 Pool')
  }
  if (!isInAccountPool('acc-pool-tiktok-1')) fail('自动回收后应回到 Matching Pool')
  else ok('自动回收户可再出现在 Matching Pool')

  // --- manual ≤1 day ---
  const manualDemand = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    priority: 'P2',
    reason: 'Phase24 idle manual',
    mediaId: 'media-snapchat',
    productId: 'prd-app-a',
    requestedQuantity: 2,
    requirements: { timezone: 'GMT-8' },
    submit: true
  })
  await demandService.approveDemand(manualDemand.id, LEADER)
  const manualItem = (await demandService.getDemandItems(manualDemand.id))[0]!
  await demandService.allocate({
    demandItemId: manualItem.id,
    accountIds: ['acc-pool-snap-2'],
    allocatedBy: ALLOCATOR,
    memberId: MEMBER,
    managerId: MANAGER,
    actorUserId: ALLOCATOR_USER
  })
  for (let i = accountSpendDaily.length - 1; i >= 0; i -= 1) {
    const row = accountSpendDaily[i]!
    if (row.accountId === 'acc-pool-snap-2' && row.date >= MOCK_TODAY) {
      accountSpendDaily.splice(i, 1)
    }
  }
  const manualCancel = await demandService.cancelDemand(manualDemand.id)
  if (!manualCancel.pendingManualAccountIds.includes('acc-pool-snap-2')) {
    fail('闲置 ≤1 天应待人工确认', manualCancel)
  } else {
    ok('闲置 ≤1 天进入 pendingManual')
  }
  const recycled = await demandService.confirmManualIdleRecycle(manualDemand.id)
  if (!recycled.includes('acc-pool-snap-2')) fail('confirmManualIdleRecycle 应回收', recycled)
  else ok('人工确认批量回收')
  if (!isInAccountPool('acc-pool-snap-2')) fail('人工回收后应回 Matching Pool')
  else ok('人工回收户可再出现在 Matching Pool')
}

async function stepAlertActions(itemId: string) {
  console.log('\n7. Alert 动作')

  // Create a fresh shortage demand so we have an OPEN alert to acknowledge
  const demand = await demandService.createDemand({
    teamId: 'team-a',
    requesterUserId: MEMBER,
    priority: 'P1',
    reason: 'Phase24 alert actions',
    mediaId: 'media-meta',
    productId: 'prd-app-a',
    requestedQuantity: 50,
    requirements: { timezone: 'GMT+8' },
    submit: true
  })
  await demandService.approveDemand(demand.id, LEADER)
  const alertItem = (await demandService.getDemandItems(demand.id))[0]!
  await demandService.getSchedulingDemandItems()

  const list = await alertService.getAlerts({
    types: ['POOL_SHORTAGE', 'TEAM_ACCOUNT_SHORTAGE'],
    relatedDemandItemId: alertItem.id,
    statuses: ['OPEN'],
    pageSize: 10
  })
  const alert = list.data[0]
  if (!alert?.relatedDemandItemId) {
    fail('Shortage 待办须带 relatedDemandItemId（可跳调度/建单）')
    return
  }
  ok('Shortage 待办带 relatedDemandItemId → 可跳 /accounts/scheduling')

  const ack = await alertService.acknowledge(alert.id, ALLOCATOR)
  if (ack.status !== 'IN_PROGRESS') fail('acknowledge → IN_PROGRESS', ack.status)
  else ok('acknowledge → IN_PROGRESS')

  const resolved = await alertService.resolve(alert.id, 'Phase24 walkthrough')
  if (resolved.status !== 'RESOLVED') fail('resolve → RESOLVED', resolved.status)
  else ok('resolve → RESOLVED')

  // Credential alert must still coexist (from step 2)
  const cred = await alertService.getAlerts({
    types: ['CREDENTIAL_EXPIRED'],
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 50
  })
  if (!cred.data.some(a => a.entityId === 'acc-pool-meta-1')) {
    fail('Credential Alert 与 Shortage 并存、未互相覆盖')
  } else {
    ok('Credential Alert 与 Shortage 并存')
  }

  // Main-path itemId already fulfilled — open alerts should be gone
  const mainOpen = await alertService.getAlerts({
    relatedDemandItemId: itemId,
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 10
  })
  if (mainOpen.data.some(a => a.type === 'POOL_SHORTAGE' || a.type === 'TEAM_ACCOUNT_SHORTAGE')) {
    fail('主链 Shortage 不应仍 OPEN')
  } else {
    ok('主链 Shortage 已关闭')
  }

  // Touch accountService so pool reads stay consistent for any follow-up
  const pool = await accountService.getAccountPool({ mediaIds: ['media-meta'], pageSize: 5 })
  if (!Array.isArray(pool.data)) fail('getAccountPool 可读')
  else ok('账户池查询仍可用')
}

async function main() {
  console.log('Phase 24 E2E Walkthrough Gate')
  console.log(`MOCK_TODAY=${MOCK_TODAY}`)

  const { itemId, demandNo } = await stepApproval()
  await stepAllocateAndGuards(itemId)
  const { orderId, externalOrderNo } = await stepShortageOrder(itemId, demandNo)
  const { fillAccountIds } = await stepMockTelegram(orderId, externalOrderNo, itemId)
  await stepReallocate(itemId, fillAccountIds)
  await stepIdleRecycle()
  await stepAlertActions(itemId)

  console.log(`\n结果: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
  console.log('GATE PASS — 允许进入 Phase 25 ERD')
}

main().catch((error) => {
  console.error('Walkthrough crashed:', error)
  process.exit(1)
})
