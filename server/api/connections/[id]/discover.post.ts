import { randomUUID } from 'node:crypto'
import { mediaAccessStore } from '#server/services/media-access-store'
import { listMetaAdAccounts } from '#server/services/meta-oauth'
import { MEDIA_CODE_TO_IMPL } from '#server/utils/media-codes'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const conn = mediaAccessStore.getConnection(id)
  if (!conn) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })
  if (conn.status !== 'ACTIVE' && conn.status !== 'MOCK') {
    throw createError({ statusCode: 400, statusMessage: 'Connection not authorized' })
  }

  const platform = mediaAccessStore.getPlatformById(conn.mediaId)
  if (!platform) throw createError({ statusCode: 400, statusMessage: 'Unknown platform' })

  const implKey = MEDIA_CODE_TO_IMPL[platform.code] || platform.code.toLowerCase()
  const token = mediaAccessStore.getAccessToken(conn.id)

  let rows: Array<{
    externalAccountId: string
    name: string | null
    raw: Record<string, string>
  }> = []

  if (platform.code === 'META' && token && !token.startsWith('mock-')) {
    rows = await listMetaAdAccounts(token)
  } else if (platform.code === 'META') {
    // Mock catalog parity with frontend META_DISCOVER_CATALOG ids
    rows = [
      { externalAccountId: 'act_100001', name: '服装站_FB_01', raw: { name: '服装站_FB_01' } },
      { externalAccountId: 'act_200001', name: '服装站_FB_02', raw: { name: '服装站_FB_02' } },
      { externalAccountId: 'act_999999', name: '个人测试户', raw: { name: '个人测试户' } }
    ]
  } else {
    throw createError({
      statusCode: 501,
      statusMessage: `${platform.name} discovery not implemented yet`
    })
  }

  const discovered = rows.map((row) => {
    const existing = mediaAccessStore.findAccount(
      conn.organizationId,
      conn.mediaId,
      row.externalAccountId
    )
    return {
      externalAccountId: row.externalAccountId,
      name: row.name,
      raw: row.raw,
      matchStatus: existing ? 'ALREADY_IN_FFJ' : 'NEW',
      ffjAccountId: existing?.id ?? null
    }
  })

  const stats = {
    discovered: discovered.length,
    newCount: discovered.filter(d => d.matchStatus === 'NEW').length,
    alreadyInFfj: discovered.filter(d => d.matchStatus === 'ALREADY_IN_FFJ').length,
    conflictCount: 0,
    missingInMedia: 0,
    imported: 0
  }

  const jobId = `sjob-${randomUUID().slice(0, 8)}`
  mediaAccessStore.recordSyncJob({
    id: jobId,
    connectionId: conn.id,
    mediaId: conn.mediaId,
    platformAppId: conn.platformAppId,
    implKey,
    status: 'SUCCEEDED',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stats,
    errorMessage: null
  })

  return {
    jobId,
    connectionId: conn.id,
    discovered,
    stats: {
      discovered: stats.discovered,
      newCount: stats.newCount,
      alreadyInFfj: stats.alreadyInFfj
    }
  }
})
