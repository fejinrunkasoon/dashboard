import { randomUUID } from 'node:crypto'
import { mediaAccessStore } from '#server/services/media-access-store'

/**
 * GET /api/oauth/:media/start?connectionId=
 * Redirects to Meta OAuth when META_APP credentials exist; otherwise completes mock auth.
 */
export default defineEventHandler(async (event) => {
  const media = getRouterParam(event, 'media')?.toLowerCase()
  const query = getQuery(event)
  const connectionId = String(query.connectionId || '')
  if (!media || !connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'media and connectionId required' })
  }

  const conn = mediaAccessStore.getConnection(connectionId)
  if (!conn) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })

  const platform = mediaAccessStore.getPlatformById(conn.mediaId)
  if (!platform || platform.code.toLowerCase() !== media) {
    throw createError({ statusCode: 400, statusMessage: 'Media mismatch' })
  }

  const app = conn.platformAppId ? mediaAccessStore.getAppRaw(conn.platformAppId) : null
  if (!app) throw createError({ statusCode: 400, statusMessage: 'PlatformApp missing' })

  const state = randomUUID()
  mediaAccessStore.saveOAuthState(state, connectionId, platform.code)

  const config = useRuntimeConfig()
  const baseUrl = String(query.redirectBase || process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000')
  const redirectUri = `${baseUrl}/api/oauth/${media}/callback`

  // Meta real OAuth when app secret present and media=meta and not forced mock
  if (media === 'meta' && app.secretEncrypted && query.mock !== '1') {
    const appSecret = mediaAccessStore.getAppSecret(app.id)
    // Use Graph OAuth dialog
    if (appSecret && app.appId && !app.appId.startsWith('mock-')) {
      const url = new URL('https://www.facebook.com/v21.0/dialog/oauth')
      url.searchParams.set('client_id', app.appId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('state', state)
      url.searchParams.set('scope', 'ads_read,business_management')
      return sendRedirect(event, url.toString(), 302)
    }
  }

  // Mock / stub path: complete immediately and redirect to UI
  mediaAccessStore.completeAuth(connectionId, {
    accessToken: `mock-token-${connectionId}`,
    isMock: true,
    providerIdentityId: `mock-${connectionId}`,
    providerIdentityName: 'Mock User',
    scopes: ['ads_read']
  })

  const uiRedirect = String(query.uiRedirect || `/accounts/connections?authorized=${connectionId}`)
  return sendRedirect(event, uiRedirect, 302)
})
