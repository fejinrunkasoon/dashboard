/**
 * Smoke: master-data setup paths (channel / asset / enum / org / user).
 * Run: node_modules/.pnpm/node_modules/.bin/jiti scripts/smoke-master-data-setup.ts
 */
import { channelService } from '../app/services/channels/mock'
import { mediaService } from '../app/services/media/mock'
import { dictionaryService } from '../app/services/dictionary/mock'
import { orgAdminService } from '../app/services/access/org-admin'
import { organizationService } from '../app/services/organization/mock'

async function main() {
  const channel = await channelService.createChannel({
    code: 'SMOKE_DELTA',
    name: 'Smoke Channel Delta',
    supportedMediaIds: ['media-meta'],
    contactName: 'Smoke Ops',
    telegramReference: '@smoke_delta'
  })
  console.log('createChannel', channel.id, channel.code)

  const list = await channelService.getChannelList({ keyword: 'SMOKE_DELTA' })
  if (!list.some(item => item.id === channel.id)) {
    throw new Error('created channel not visible in channel center list')
  }
  console.log('channel list ok', list.length)

  const asset = await mediaService.createPlatformAsset({
    mediaId: 'media-meta',
    typeId: 'pat-meta-bm',
    externalId: 'smoke-bm-999',
    name: 'Smoke BM',
    sourceChannelId: channel.id
  })
  console.log('createPlatformAsset', asset.id)

  const assets = await mediaService.getPlatformAssets({ channelIds: [channel.id] })
  if (!assets.some(item => item.id === asset.id)) {
    throw new Error('created asset not resolvable by channel')
  }
  console.log('asset bindable ok')

  const enumItem = await dictionaryService.createEnumItem({
    kind: 'TAG',
    code: 'SMOKE_TAG',
    label: 'Smoke Tag'
  })
  console.log('createEnumItem', enumItem.id)

  const org = await orgAdminService.createOrganization({
    code: 'SMOKE_ORG',
    name: 'Smoke Org'
  })
  console.log('createOrganization', org.id)

  const members = await organizationService.getMembers()
  const member = members.find(m => m.status === 'ACTIVE')
  if (!member) throw new Error('no active member for user create')

  const user = await orgAdminService.createUser({
    memberId: member.id,
    organizationId: org.id,
    displayName: 'Smoke User',
    roles: ['TEAM_MEMBER']
  })
  console.log('createUser', user.id)

  const users = await orgAdminService.listUsers(org.id)
  if (!users.some(u => u.id === user.id)) {
    throw new Error('created user not listed')
  }

  console.log('SMOKE_OK')
}

main().catch((error) => {
  console.error('SMOKE_FAIL', error)
  throw error
})
