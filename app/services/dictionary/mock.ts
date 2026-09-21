import type { EntityStatus } from '../../domain/common'
import type {
  DictionaryEnumItem,
  DictionaryEnumKind,
  DictionaryService
} from './types'

const enumItems: DictionaryEnumItem[] = [
  { id: 'enum-tr-rebalance', kind: 'TRANSFER_REASON', code: 'REBALANCE', label: '资源调配', status: 'ACTIVE' },
  { id: 'enum-tr-handover', kind: 'TRANSFER_REASON', code: 'HANDOVER', label: '人员交接', status: 'ACTIVE' },
  { id: 'enum-tr-other', kind: 'TRANSFER_REASON', code: 'OTHER', label: '其他', status: 'ACTIVE' },
  { id: 'enum-rc-idle', kind: 'RECYCLE_REASON', code: 'IDLE', label: '长期闲置', status: 'ACTIVE' },
  { id: 'enum-rc-pool', kind: 'RECYCLE_REASON', code: 'RETURN_POOL', label: '退回池', status: 'ACTIVE' },
  { id: 'enum-rc-quality', kind: 'RECYCLE_REASON', code: 'QUALITY', label: '质量问题', status: 'DISABLED' },
  { id: 'enum-ds-banned', kind: 'DISABLE_REASON', code: 'BANNED', label: '媒体封禁', status: 'ACTIVE' },
  { id: 'enum-ds-expired', kind: 'DISABLE_REASON', code: 'EXPIRED', label: '合同到期', status: 'ACTIVE' },
  { id: 'enum-ds-manual', kind: 'DISABLE_REASON', code: 'MANUAL', label: '人工停用', status: 'ACTIVE' },
  { id: 'enum-pr-low', kind: 'PRIORITY', code: 'LOW', label: '低', status: 'ACTIVE' },
  { id: 'enum-pr-normal', kind: 'PRIORITY', code: 'NORMAL', label: '普通', status: 'ACTIVE' },
  { id: 'enum-pr-high', kind: 'PRIORITY', code: 'HIGH', label: '高', status: 'ACTIVE' },
  { id: 'enum-pr-urgent', kind: 'PRIORITY', code: 'URGENT', label: '紧急', status: 'ACTIVE' },
  { id: 'enum-tag-vip', kind: 'TAG', code: 'VIP', label: 'VIP', status: 'ACTIVE' },
  { id: 'enum-tag-test', kind: 'TAG', code: 'TEST', label: '测试', status: 'ACTIVE' },
  { id: 'enum-tag-seasonal', kind: 'TAG', code: 'SEASONAL', label: '旺季', status: 'DISABLED' }
]

export const dictionaryService: DictionaryService = {
  async getEnumItems(kind?: DictionaryEnumKind) {
    if (!kind) return enumItems.map(item => ({ ...item }))
    return enumItems.filter(item => item.kind === kind).map(item => ({ ...item }))
  },

  async setEnumStatus(id: string, status: EntityStatus) {
    const item = enumItems.find(row => row.id === id)
    if (!item) throw new Error(`Unknown enum item: ${id}`)
    item.status = status
    return { ...item }
  }
}
