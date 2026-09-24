import { addDays, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import type { AccountSpendDaily, AccountSpendMetrics, AccountSpendWindow } from '../domain/account'
import type { SpendDateRange } from '../domain/common'
import type { Period } from '~/types'
import { remainingLimit } from './service-fee-calculator'

/** Monday-start week bucket, or calendar month / day. */
export function periodBucketStart(dateStr: string, period: Period): string {
  const date = parseISO(dateStr)
  if (period === 'weekly') {
    return toDateString(startOfWeek(date, { weekStartsOn: 1 }))
  }
  if (period === 'monthly') {
    return toDateString(startOfMonth(date))
  }
  return dateStr
}

/** Axis / tooltip label for a spend bucket (uses actual covered days when partial). */
export function formatPeriodBucketLabel(
  period: Period,
  bucketStart: string,
  coveredFrom: string,
  coveredTo: string
): string {
  const from = parseISO(coveredFrom)
  const to = parseISO(coveredTo)
  if (period === 'monthly') {
    return format(parseISO(bucketStart), 'MMM yyyy')
  }
  if (period === 'weekly') {
    if (coveredFrom === coveredTo) return format(from, 'd MMM')
    if (from.getMonth() === to.getMonth()) {
      return `${format(from, 'd')}–${format(to, 'd MMM')}`
    }
    return `${format(from, 'd MMM')} – ${format(to, 'd MMM')}`
  }
  return format(from, 'd MMM')
}

export const MOCK_TODAY = '2026-09-16'
export const DEFAULT_CURRENCY = 'USD'

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDate(value: string): Date {
  return parseISO(value)
}

export function shiftDate(base: string, days: number): string {
  return toDateString(addDays(parseISO(base), days))
}

/** Inclusive day count between YYYY-MM-DD bounds (min 1). */
export function daysInRange(from: string, to: string): number {
  const start = parseISO(from)
  const end = parseISO(to)
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return Math.max(1, diff)
}

export function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = []
  let cursor = parseISO(from)
  const end = parseISO(to)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toDateString(cursor))
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function sumSpend(rows: AccountSpendDaily[], range?: SpendDateRange): number {
  return rows.reduce((total, row) => {
    if (range && (row.date < range.from || row.date > range.to)) return total
    return total + row.spend
  }, 0)
}

export function aggregateSpendMetrics(
  accountId: string,
  spendLimit: number | null | undefined,
  rows: AccountSpendDaily[],
  today = MOCK_TODAY,
  currency = DEFAULT_CURRENCY
): AccountSpendMetrics {
  const amountSpent = sumSpend(rows)
  const todaySpend = sumSpend(rows, { from: today, to: today })
  const spend7d = sumSpend(rows, { from: shiftDate(today, -6), to: today })
  const spend30d = sumSpend(rows, { from: shiftDate(today, -29), to: today })
  const lastRow = [...rows].filter(row => row.spend > 0).sort((a, b) => b.date.localeCompare(a.date))[0]

  return {
    accountId,
    currency,
    spendLimit: spendLimit ?? null,
    amountSpent,
    remainingLimit: remainingLimit(spendLimit, amountSpent),
    todaySpend,
    spend7d,
    spend30d,
    lastSpendAt: lastRow ? `${lastRow.date}T00:00:00.000Z` : null
  }
}

export function aggregateSpendWindow(
  accountId: string,
  rows: AccountSpendDaily[],
  range: SpendDateRange,
  currency = DEFAULT_CURRENCY
): AccountSpendWindow {
  return {
    accountId,
    from: range.from,
    to: range.to,
    spend: sumSpend(rows, range),
    currency
  }
}

export function monthRange(year: number, month: number): SpendDateRange {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = shiftDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`, -1)
  return { from, to }
}
