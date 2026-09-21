import type { EntityStatus } from './common'

export interface MediaPlatform {
  id: string
  code: string
  name: string
  logoUrl?: string
  status: EntityStatus
}

export interface PlatformAssetType {
  id: string
  mediaId: string
  code: string
  name: string
  status: EntityStatus
}

export interface PlatformAsset {
  id: string
  mediaId: string
  typeId: string
  externalId: string
  name?: string | null
  sourceChannelId?: string | null
  status: string
  note?: string | null
  createdAt: string
  updatedAt: string
}
