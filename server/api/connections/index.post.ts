import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    organizationId: string
    teamId: string
    mediaId: string
    displayName?: string
    actorUserId: string
  }>(event)

  if (!body?.organizationId || !body.teamId || !body.mediaId || !body.actorUserId) {
    throw createError({ statusCode: 400, statusMessage: 'organizationId, teamId, mediaId, actorUserId required' })
  }

  const platform = mediaAccessStore.getPlatformById(body.mediaId)
  const displayName = body.displayName?.trim()
    || `${platform?.name ?? 'Media'} - ${body.actorUserId}`

  return mediaAccessStore.createConnection({
    organizationId: body.organizationId,
    teamId: body.teamId,
    mediaId: body.mediaId,
    displayName,
    authorizedByUserId: body.actorUserId
  })
})
