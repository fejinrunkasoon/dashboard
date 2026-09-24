import { mediaAccessStore } from '#server/services/media-access-store'

export default defineEventHandler(async () => {
  return mediaAccessStore.listApps()
})
