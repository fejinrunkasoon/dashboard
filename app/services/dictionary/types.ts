import type { EntityStatus } from '../../domain/common'

export type DictionaryEnumKind =
  | 'TRANSFER_REASON'
  | 'RECYCLE_REASON'
  | 'DISABLE_REASON'
  | 'PRIORITY'
  | 'TAG'

export interface DictionaryEnumItem {
  id: string
  kind: DictionaryEnumKind
  code: string
  label: string
  status: EntityStatus
}

export interface DictionaryService {
  getEnumItems(kind?: DictionaryEnumKind): Promise<DictionaryEnumItem[]>
  setEnumStatus(id: string, status: EntityStatus): Promise<DictionaryEnumItem>
}

export const DICTIONARY_KIND_LABELS: Record<DictionaryEnumKind, string> = {
  TRANSFER_REASON: '转移原因',
  RECYCLE_REASON: '回收原因',
  DISABLE_REASON: '停用原因',
  PRIORITY: '优先级',
  TAG: '标签'
}
