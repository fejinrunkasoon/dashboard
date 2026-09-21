export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function calcUsageRate(active: number, total: number): number {
  if (total === 0) return 0
  return Math.round((active / total) * 100)
}

export function calcBanRate(banned: number, total: number): number {
  if (total === 0) return 0
  return Math.round((banned / total) * 100)
}
