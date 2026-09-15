import type { EntityStatus } from './common'

export interface Channel {
  id: string
  code: string
  name: string
  status: EntityStatus
  supportedMediaIds: string[]
  contactName?: string | null
  telegramReference?: string | null
  note?: string | null
  createdAt: string
  updatedAt: string
}
