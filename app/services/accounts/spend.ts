import type { AccountSpendDaily, AccountSpendMetrics, AccountSpendWindow } from '../../domain/account'
import type { SpendDateRange } from '../../domain/common'
import { accounts } from '../../mocks/entities'
import { accountSpendDaily } from '../../mocks/spend-daily'
import {
  aggregateSpendMetrics,
  aggregateSpendWindow
} from '../../utils/spend-aggregation'

export interface AccountSpendService {
  getAccountSpendMetrics(accountId: string): Promise<AccountSpendMetrics | null>
  getAccountSpend(accountId: string, range: SpendDateRange): Promise<AccountSpendWindow | null>
  getAccountSpendDaily(accountId: string): Promise<AccountSpendDaily[]>
}

function rowsFor(accountId: string) {
  return accountSpendDaily.filter(row => row.accountId === accountId)
}

export const accountSpendService: AccountSpendService = {
  async getAccountSpendMetrics(accountId) {
    const account = accounts.find(item => item.id === accountId)
    if (!account) return null
    return aggregateSpendMetrics(accountId, account.spendLimit, rowsFor(accountId))
  },

  async getAccountSpend(accountId, range) {
    if (!accounts.some(item => item.id === accountId)) return null
    return aggregateSpendWindow(accountId, rowsFor(accountId), range)
  },

  async getAccountSpendDaily(accountId) {
    if (!accounts.some(item => item.id === accountId)) return []
    return [...rowsFor(accountId)].sort((a, b) => a.date.localeCompare(b.date))
  }
}
