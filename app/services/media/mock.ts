import { paginate } from '../../domain/common'
import type { EntityStatus } from '../../domain/common'
import type { MediaPlatform, PlatformAssetType } from '../../domain/media'
import {
  channels,
  mediaPlatforms,
  platformAssetTypes,
  platformAssets,
  accountPlatformAssetAssignments
} from '../../mocks'
import type {
  CreateMediaPlatformInput,
  CreatePlatformAssetTypeInput,
  MediaMasterQuery,
  MediaService,
  PlatformAssetListItem,
  PlatformAssetQuery,
  UpdateMediaPlatformInput,
  UpdatePlatformAssetTypeInput
} from './types'

function filterPlatformAssets(query: PlatformAssetQuery = {}) {
  let rows = [...platformAssets]

  if (query.mediaIds?.length) {
    rows = rows.filter(item => query.mediaIds!.includes(item.mediaId))
  }
  if (query.typeIds?.length) {
    rows = rows.filter(item => query.typeIds!.includes(item.typeId))
  }
  if (query.channelIds?.length) {
    rows = rows.filter(item =>
      item.sourceChannelId != null && query.channelIds!.includes(item.sourceChannelId)
    )
  }
  if (query.statuses?.length) {
    rows = rows.filter(item => query.statuses!.includes(item.status))
  }
  if (query.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    rows = rows.filter(item =>
      item.externalId.toLowerCase().includes(q)
      || (item.name ?? '').toLowerCase().includes(q)
    )
  }

  return rows
}

function linkedAccountCount(platformAssetId: string): number {
  return accountPlatformAssetAssignments.filter(
    item => item.platformAssetId === platformAssetId && item.endedAt == null
  ).length
}

function toListItem(assetId: string): PlatformAssetListItem | null {
  const asset = platformAssets.find(item => item.id === assetId)
  if (!asset) return null

  const media = mediaPlatforms.find(item => item.id === asset.mediaId)
  const type = platformAssetTypes.find(item => item.id === asset.typeId)
  const channel = asset.sourceChannelId
    ? channels.find(item => item.id === asset.sourceChannelId)
    : null

  return {
    id: asset.id,
    mediaId: asset.mediaId,
    typeId: asset.typeId,
    externalId: asset.externalId,
    name: asset.name ?? null,
    sourceChannelId: asset.sourceChannelId ?? null,
    status: asset.status,
    mediaName: media?.name ?? asset.mediaId,
    typeName: type?.name ?? asset.typeId,
    channelName: channel?.name ?? null,
    linkedAccountCount: linkedAccountCount(asset.id)
  }
}

function sortListItems(
  rows: PlatformAssetListItem[],
  sortBy?: string,
  sortOrder?: string
): PlatformAssetListItem[] {
  const order = sortOrder === 'desc' ? -1 : 1
  const key = sortBy ?? 'externalId'

  return [...rows].sort((a, b) => {
    let av: string | number | null = null
    let bv: string | number | null = null

    switch (key) {
      case 'mediaName':
        av = a.mediaName
        bv = b.mediaName
        break
      case 'typeName':
        av = a.typeName
        bv = b.typeName
        break
      case 'channelName':
        av = a.channelName
        bv = b.channelName
        break
      case 'status':
        av = a.status
        bv = b.status
        break
      case 'linkedAccountCount':
        av = a.linkedAccountCount
        bv = b.linkedAccountCount
        break
      case 'name':
        av = a.name
        bv = b.name
        break
      case 'externalId':
      default:
        av = a.externalId
        bv = b.externalId
        break
    }

    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * order
    }
    return String(av).localeCompare(String(bv)) * order
  })
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_')
}

function assertStatus(status: EntityStatus): asserts status is 'ACTIVE' | 'DISABLED' {
  if (status !== 'ACTIVE' && status !== 'DISABLED') {
    throw new Error(`Unsupported status: ${status}`)
  }
}

export const mediaService: MediaService = {
  async getMediaPlatforms(query: MediaMasterQuery = {}) {
    let rows = [...mediaPlatforms]
    if (query.status) {
      rows = rows.filter(item => item.status === query.status)
    }
    return rows
  },

  async getPlatformAssetTypes(mediaId, query: MediaMasterQuery = {}) {
    let rows = [...platformAssetTypes]
    if (mediaId) {
      rows = rows.filter(item => item.mediaId === mediaId)
    }
    if (query.status) {
      rows = rows.filter(item => item.status === query.status)
    }
    return rows
  },

  async getPlatformAssets(query: PlatformAssetQuery = {}) {
    return filterPlatformAssets(query)
  },

  async getPlatformAssetList(query: PlatformAssetQuery = {}) {
    const filtered = filterPlatformAssets(query)
    const items = filtered
      .map(item => toListItem(item.id))
      .filter((item): item is PlatformAssetListItem => item != null)

    const sorted = sortListItems(items, query.sortBy, query.sortOrder)
    const linked = query.linked
    const visible = linked
      ? sorted.filter(item =>
        linked === 'yes' ? item.linkedAccountCount > 0 : item.linkedAccountCount === 0
      )
      : sorted
    return paginate(visible, query.page ?? 1, query.pageSize ?? 20)
  },

  async createMediaPlatform(input: CreateMediaPlatformInput): Promise<MediaPlatform> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (mediaPlatforms.some(item => item.code === code)) {
      throw new Error(`Media platform code already exists: ${code}`)
    }

    const platform: MediaPlatform = {
      id: `media-${code.toLowerCase().replace(/_/g, '-')}`,
      code,
      name,
      logoUrl: input.logoUrl?.trim() || undefined,
      status: 'ACTIVE'
    }

    if (mediaPlatforms.some(item => item.id === platform.id)) {
      platform.id = `media-${code.toLowerCase()}-${mediaPlatforms.length + 1}`
    }

    mediaPlatforms.push(platform)
    return { ...platform }
  },

  async updateMediaPlatform(id: string, input: UpdateMediaPlatformInput): Promise<MediaPlatform> {
    const platform = mediaPlatforms.find(item => item.id === id)
    if (!platform) throw new Error(`Unknown media platform: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      platform.name = name
    }
    if (input.logoUrl !== undefined) {
      platform.logoUrl = input.logoUrl?.trim() || undefined
    }

    return { ...platform }
  },

  async setMediaPlatformStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaPlatform> {
    assertStatus(status)
    const platform = mediaPlatforms.find(item => item.id === id)
    if (!platform) throw new Error(`Unknown media platform: ${id}`)
    if (platform.status === status) return { ...platform }
    platform.status = status
    return { ...platform }
  },

  async createPlatformAssetType(input: CreatePlatformAssetTypeInput): Promise<PlatformAssetType> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!input.mediaId) throw new Error('mediaId is required')
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')

    const media = mediaPlatforms.find(item => item.id === input.mediaId)
    if (!media) throw new Error(`Unknown media platform: ${input.mediaId}`)

    if (platformAssetTypes.some(item => item.mediaId === input.mediaId && item.code === code)) {
      throw new Error(`Asset type code already exists for this media: ${code}`)
    }

    const type: PlatformAssetType = {
      id: `pat-${media.code.toLowerCase()}-${code.toLowerCase().replace(/_/g, '-')}`,
      mediaId: input.mediaId,
      code,
      name,
      status: 'ACTIVE'
    }

    if (platformAssetTypes.some(item => item.id === type.id)) {
      type.id = `pat-${media.code.toLowerCase()}-${platformAssetTypes.length + 1}`
    }

    platformAssetTypes.push(type)
    return { ...type }
  },

  async updatePlatformAssetType(id: string, input: UpdatePlatformAssetTypeInput): Promise<PlatformAssetType> {
    const type = platformAssetTypes.find(item => item.id === id)
    if (!type) throw new Error(`Unknown platform asset type: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      type.name = name
    }

    return { ...type }
  },

  async setPlatformAssetTypeStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<PlatformAssetType> {
    assertStatus(status)
    const type = platformAssetTypes.find(item => item.id === id)
    if (!type) throw new Error(`Unknown platform asset type: ${id}`)
    if (type.status === status) return { ...type }
    type.status = status
    return { ...type }
  }
}
