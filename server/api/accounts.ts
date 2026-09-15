import type { AdAccount, Media, ProductType, AssetStatus, MediaStatus } from '~/types'

const medias: Media[] = ['Meta', 'Google', 'TikTok']
const productTypes: ProductType[] = ['internal', 'external']
const assetStatuses: AssetStatus[] = ['pending', 'allocated', 'active', 'idle', 'abnormal', 'banned', 'disabled']
const mediaStatuses: MediaStatus[] = ['normal', 'restricted', 'banned']

const channelNames = ['Channel Alpha', 'Channel Beta', 'Channel Gamma', 'Channel Delta', 'Channel Epsilon']
const teamNames = ['Team A', 'Team B', 'Team C', 'Team D']
const memberNames = ['Zhang Wei', 'Li Na', 'Wang Jun', 'Chen Ming', 'Liu Yang', 'Zhao Lei', 'Sun Hao', 'Zhou Xin']
const internalProducts = ['App A', 'App B', 'Game C']
const externalProducts = ['Client X', 'Client Y', 'Client Z']

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const accounts: AdAccount[] = Array.from({ length: 50 }, (_, i) => {
  const seed = i + 1
  const r = (offset: number) => seededRandom(seed * 31 + offset)

  const media = medias[Math.floor(r(1) * medias.length)]!
  const channelIdx = Math.floor(r(2) * channelNames.length)
  const channelName = channelNames[channelIdx]!
  const channelId = channelIdx + 1

  const assetStatus = assetStatuses[Math.floor(r(3) * assetStatuses.length)]!
  const mediaStatus = assetStatus === 'banned' ? 'banned' : mediaStatuses[Math.floor(r(4) * 2)]!
  const isAllocated = assetStatus !== 'pending' && assetStatus !== 'disabled'

  const teamIdx = Math.floor(r(5) * teamNames.length)
  const memberIdx = Math.floor(r(6) * memberNames.length)
  const isInternal = r(7) > 0.5
  const productType: ProductType = isInternal ? 'internal' : 'external'
  const productName = isInternal
    ? internalProducts[Math.floor(r(8) * internalProducts.length)]!
    : externalProducts[Math.floor(r(9) * externalProducts.length)]!

  const consumed = assetStatus === 'pending' ? 0 : Math.floor(r(10) * 15000) + 500
  const daysAgo = Math.floor(r(11) * 60) + 1
  const entryDate = new Date(Date.now() - daysAgo * 86400000).toISOString()

  return {
    id: `acc-${String(i + 1).padStart(3, '0')}`,
    accountId: `act_${100000 + i}`,
    accountName: `Account ${i + 1}`,
    media,
    channelId,
    channelName,
    teamId: isAllocated ? teamIdx + 1 : null,
    teamName: isAllocated ? teamNames[teamIdx]! : null,
    memberId: isAllocated ? memberIdx + 1 : null,
    memberName: isAllocated ? memberNames[memberIdx]! : null,
    productId: isAllocated ? Math.floor(r(12) * 6) + 1 : null,
    productName: isAllocated ? productName : null,
    productType: isAllocated ? productType : null,
    assetStatus,
    mediaStatus,
    isAllocated,
    consumed,
    lastConsumedAt: consumed > 0 ? new Date(Date.now() - Math.floor(r(13) * 7) * 86400000).toISOString() : null,
    entryDate,
    usageDays: daysAgo
  }
})

export default defineEventHandler(async () => {
  return accounts
})