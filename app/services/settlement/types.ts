import type {
  AccountMonthlySettlement,
  ChannelMonthlySettlementSummary,
  SettlementQuery
} from '../../domain/finance'

export interface ChannelSettlementService {
  getAccountMonthlySettlements(query: SettlementQuery): Promise<AccountMonthlySettlement[]>
  getChannelMonthlySummary(query: SettlementQuery): Promise<ChannelMonthlySettlementSummary | null>
}
