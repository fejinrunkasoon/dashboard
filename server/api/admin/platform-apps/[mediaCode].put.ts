import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async (event) => {
  const mediaCode = getRouterParam(event, 'mediaCode')
  if (!mediaCode) {
    throw createError({ statusCode: 400, statusMessage: 'mediaCode required' })
  }
  const body = await readBody<{
    mediaId?: string
    appId: string
    secret?: string | null
    developerToken?: string | null
    status?: 'ACTIVE' | 'DISABLED'
  }>(event)

  if (!body?.appId?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'appId required' })
  }

  const platform = mediaAccessStore.getPlatformByCode(mediaCode)
    ?? (body.mediaId ? mediaAccessStore.getPlatformById(body.mediaId) : null)
  if (!platform) {
    throw createError({ statusCode: 404, statusMessage: `Unknown media: ${mediaCode}` })
  }

  return mediaAccessStore.upsertApp({
    mediaId: platform.id,
    appId: body.appId,
    secret: body.secret,
    developerToken: body.developerToken,
    status: body.status
  })
})
