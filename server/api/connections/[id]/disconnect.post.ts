import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  return mediaAccessStore.disconnect(id)
})
