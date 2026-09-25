import { channelService } from '../app/services/channels/mock'
import { accountService } from '../app/services/accounts/mock'
import { channelSettlementService } from '../app/services/settlement/mock'
import { alerts } from '../app/mocks/entities'
import { assertServiceFeeTiers } from '../app/utils/service-fee-calculator'

async function main() {
  const results: string[] = []
  const ok = (m: string) => results.push(`OK ${m}`)
  const fail = (m: string) => {
    throw new Error(m)
  }

  try {
    await channelService.createPrepayment({
      channelId: 'ch-gamma',
      paymentAddressId: 'cpa-gamma-pending',
      productOwnership: 'INTERNAL',
      amount: 100
    })
    fail('pending address should reject prepayment')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('ACTIVE')) fail(`unexpected: ${msg}`)
    ok('pending address cannot prepay')
  }

  try {
    await channelService.approvePaymentAddress('cpa-gamma-pending', { actorMemberId: 'mem-lisi' })
    fail('non-admin should fail')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('ORG_ADMIN') && !msg.includes('PLATFORM_ADMIN')) fail(`unexpected: ${msg}`)
    ok('non-admin cannot approve')
  }

  try {
    await channelService.approvePaymentAddress('cpa-gamma-pending', { actorMemberId: 'mem-sunhao' })
    fail('team leader without admin role should fail')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('ORG_ADMIN') && !msg.includes('PLATFORM_ADMIN')) fail(`unexpected: ${msg}`)
    ok('team leader cannot approve without admin role')
  }

  await channelService.approvePaymentAddress('cpa-gamma-pending', { actorMemberId: 'mem-wangwu' })
  const pay = await channelService.createPrepayment({
    channelId: 'ch-gamma',
    paymentAddressId: 'cpa-gamma-pending',
    productOwnership: 'EXTERNAL',
    amount: 1500,
    createdBy: 'mem-lisi'
  })
  if (pay.status !== 'CONFIRMED') fail('pay not confirmed')
  ok('approve then prepay works')

  try {
    assertServiceFeeTiers([
      { minSpend: 0, maxSpend: 1000, rate: 0.02, sortOrder: 1 },
      { minSpend: 2000, maxSpend: null, rate: 0.01, sortOrder: 2 }
    ])
    fail('gap should reject')
  } catch {
    ok('tier gap rejected')
  }

  await channelService.disableServiceFeePolicy('sfp-alpha-promo', { actorMemberId: 'mem-lisi' })
  try {
    await accountService.changeFeePolicy({
      accountId: 'acc-fee-a',
      policyId: 'sfp-alpha-promo',
      createdBy: 'mem-lisi'
    })
    fail('disabled policy should reject bind')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('ACTIVE')) fail(`unexpected: ${msg}`)
    ok('disabled policy cannot bind')
  }

  const newPolicy = await channelService.createServiceFeePolicy({
    channelId: 'ch-alpha',
    code: 'ALPHA_REBIND',
    name: 'Alpha Rebind',
    tiers: [{ minSpend: 0, maxSpend: null, rate: 0.018, sortOrder: 1 }],
    actorMemberId: 'mem-lisi'
  })

  const before = await channelSettlementService.getAccountMonthlySettlements({
    channelId: 'ch-alpha',
    year: 2026,
    month: 9
  })
  const feeABefore = before.find(r => r.accountId === 'acc-fee-a')
  if (!feeABefore || feeABefore.serviceFeePolicyId !== 'sfp-alpha-std') {
    fail('expected alpha std before rebind')
  }

  await accountService.changeFeePolicy({
    accountId: 'acc-fee-a',
    policyId: newPolicy.id,
    createdBy: 'mem-lisi'
  })

  const history = await accountService.getAccountFeePolicyHistory('acc-fee-a')
  const current = history.find(h => h.endedAt == null)
  const ended = history.filter(h => h.endedAt != null)
  if (!current || current.policyId !== newPolicy.id) fail('current segment wrong')
  if (!ended.some(h => h.policyId === 'sfp-alpha-std')) fail('old segment not ended')
  ok('rebind opens new segment')

  const after = await channelSettlementService.getAccountMonthlySettlements({
    channelId: 'ch-alpha',
    year: 2026,
    month: 9
  })
  const feeAAfter = after.find(r => r.accountId === 'acc-fee-a')
  // Settlement midpoint is month day-1; mid-month rebind must not rewrite Sep books.
  if (!feeAAfter || feeAAfter.serviceFeePolicyId !== 'sfp-alpha-std') {
    fail('sep settlement must keep policy active at month midpoint')
  }
  ok('sep settlement unchanged after mid-month rebind')

  const summaryBefore = await channelSettlementService.getChannelMonthlySummary({
    channelId: 'ch-alpha',
    year: 2026,
    month: 9
  })
  const refund = await channelService.createRefund({
    channelId: 'ch-alpha',
    amount: 100,
    reason: 'test',
    createdBy: 'mem-lisi'
  })
  await channelService.confirmRefund(refund.id, { actorMemberId: 'mem-lisi' })
  const summaryAfter = await channelSettlementService.getChannelMonthlySummary({
    channelId: 'ch-alpha',
    year: 2026,
    month: 9
  })
  if (summaryBefore!.settlementCost !== summaryAfter!.settlementCost) {
    fail('refund changed settlement')
  }
  ok('refund confirm leaves settlement unchanged')

  const system = summaryAfter!.mediaSpend
  const recon = await channelService.createReconciliation({
    channelId: 'ch-alpha',
    year: 2026,
    month: 9,
    channelBillMediaSpend: system * 1.2,
    note: 'bill higher',
    actorMemberId: 'mem-lisi'
  })
  if (recon.status !== 'OPEN') fail('recon not open')
  const alert = alerts.find(a => a.type === 'RECONCILIATION_VARIANCE' && a.entityId === 'ch-alpha')
  if (!alert) fail('missing recon alert')
  ok('reconciliation variance alert written')

  await channelService.confirmReconciliation(recon.id, { actorMemberId: 'mem-lisi' })
  ok('reconciliation confirmed')

  console.log(results.join('\n'))
  console.log('ALL PASSED')
}

main().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})
