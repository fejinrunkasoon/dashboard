import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mediaId = query.mediaId ? String(query.mediaId) : undefined
  return mediaAccessStore.listSyncJobs(mediaId)
})
