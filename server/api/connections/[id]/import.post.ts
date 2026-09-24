import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{
    externalAccountIds: string[]
    names?: Record<string, string>
  }>(event)

  const conn = mediaAccessStore.getConnection(id)
  if (!conn) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })

  const ids = body?.externalAccountIds ?? []
  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'externalAccountIds required' })
  }

  const imported = []
  let skippedExisting = 0

  for (const externalAccountId of ids) {
    const existing = mediaAccessStore.findAccount(
      conn.organizationId,
      conn.mediaId,
      externalAccountId
    )
    if (existing) {
      skippedExisting += 1
      imported.push(existing)
      continue
    }
    const row = mediaAccessStore.upsertAccount({
      organizationId: conn.organizationId,
      mediaId: conn.mediaId,
      externalAccountId,
      name: body.names?.[externalAccountId] ?? null
    })
    imported.push(row)
  }

  return { imported, skippedExisting }
})
