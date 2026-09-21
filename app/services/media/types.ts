import type { EntityStatus, PagedResponse, PaginationQuery, SortQuery } from '../../domain/common'
import type { MediaPlatform, PlatformAsset, PlatformAssetType } from '../../domain/media'

export interface PlatformAssetQuery extends PaginationQuery, SortQuery {
  mediaIds?: string[]
  typeIds?: string[]
  channelIds?: string[]
  statuses?: string[]
  keyword?: string
  /** yes = linkedAccountCount > 0, no = 0 */
  linked?: 'yes' | 'no'
}

export interface PlatformAssetListItem {
  id: string
  mediaId: string
  typeId: string
  externalId: string
  name: string | null
  sourceChannelId: string | null
  status: string
  mediaName: string
  typeName: string
  channelName: string | null
  linkedAccountCount: number
}

export interface MediaMasterQuery {
  /** When set, only return rows with this status. Omit to return all (for name resolution). */
  status?: EntityStatus
}

export interface CreateMediaPlatformInput {
  code: string
  name: string
  logoUrl?: string | null
}

export interface UpdateMediaPlatformInput {
  name?: string
  logoUrl?: string | null
}

export interface CreatePlatformAssetTypeInput {
  mediaId: string
  code: string
  name: string
}

export interface UpdatePlatformAssetTypeInput {
  name?: string
}

export interface MediaService {
  getMediaPlatforms(query?: MediaMasterQuery): Promise<MediaPlatform[]>
  getPlatformAssetTypes(mediaId?: string, query?: MediaMasterQuery): Promise<PlatformAssetType[]>
  /** Raw entity list — used by channel detail / delivery bind. */
  getPlatformAssets(query?: PlatformAssetQuery): Promise<PlatformAsset[]>
  /** Account-center list read model with pagination + display fields. */
  getPlatformAssetList(query?: PlatformAssetQuery): Promise<PagedResponse<PlatformAssetListItem>>

  createMediaPlatform(input: CreateMediaPlatformInput): Promise<MediaPlatform>
  updateMediaPlatform(id: string, input: UpdateMediaPlatformInput): Promise<MediaPlatform>
  setMediaPlatformStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaPlatform>

  createPlatformAssetType(input: CreatePlatformAssetTypeInput): Promise<PlatformAssetType>
  updatePlatformAssetType(id: string, input: UpdatePlatformAssetTypeInput): Promise<PlatformAssetType>
  setPlatformAssetTypeStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<PlatformAssetType>
}
