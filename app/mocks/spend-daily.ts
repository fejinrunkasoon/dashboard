import type { AccountSpendDaily } from '../domain/account'
import { DEFAULT_CURRENCY, enumerateDates, MOCK_TODAY, shiftDate } from '../utils/spend-aggregation'
import { accounts } from './entities'

function distributeExact(dates: string[], total: number, accountId: string): AccountSpendDaily[] {
  if (dates.length === 0 || total <= 0) return []
  const base = Math.floor(total / dates.length)
  const remainder = total - base * dates.length
  return dates.map((date, index) => ({
    accountId,
    date,
    currency: DEFAULT_CURRENCY,
    spend: base + (index === dates.length - 1 ? remainder : 0)
  }))
}

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function caseESpend(): AccountSpendDaily[] {
  const olderFrom = shiftDate(MOCK_TODAY, -89)
  const olderTo = shiftDate(MOCK_TODAY, -30)
  const midFrom = shiftDate(MOCK_TODAY, -29)
  const midTo = shiftDate(MOCK_TODAY, -7)
  const recentFrom = shiftDate(MOCK_TODAY, -6)
  const recentTo = shiftDate(MOCK_TODAY, -1)

  return [
    ...distributeExact(enumerateDates(olderFrom, olderTo), 5000, 'acc-case-e'),
    ...distributeExact(enumerateDates(midFrom, midTo), 10800, 'acc-case-e'),
    ...distributeExact(enumerateDates(recentFrom, recentTo), 3850, 'acc-case-e'),
    {
      accountId: 'acc-case-e',
      date: MOCK_TODAY,
      currency: DEFAULT_CURRENCY,
      spend: 350
    }
  ]
}

function septemberSpend(accountId: string, total: number): AccountSpendDaily[] {
  return distributeExact(enumerateDates('2026-09-01', MOCK_TODAY), total, accountId)
}

function generatedSpend(accountId: string, seed: number): AccountSpendDaily[] {
  const from = shiftDate(MOCK_TODAY, -74)
  return enumerateDates(from, MOCK_TODAY).map((date, index) => {
    const r = seeded(seed * 97 + index)
    const spend = r > 0.18 ? Math.round(40 + r * 420) : 0
    return { accountId, date, currency: DEFAULT_CURRENCY, spend }
  })
}

const specialIds = new Set(['acc-case-e', 'acc-fee-a', 'acc-fee-b'])

export const accountSpendDaily: AccountSpendDaily[] = [
  ...caseESpend(),
  ...septemberSpend('acc-fee-a', 20000),
  ...septemberSpend('acc-fee-b', 8000),
  ...accounts
    .filter(account => !specialIds.has(account.id))
    .flatMap((account, index) => generatedSpend(account.id, index + 1))
]
