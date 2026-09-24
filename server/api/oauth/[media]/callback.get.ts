import { mediaAccessStore } from '#server/services/media-access-store'
import { exchangeMetaCode, listMetaAdAccounts } from '#server/services/meta-oauth'

export default defineEventHandler(async (event) => {
  const media = getRouterParam(event, 'media')?.toLowerCase()
  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  const error = query.error ? String(query.error) : null

  if (!media) throw createError({ statusCode: 400, statusMessage: 'media required' })

  const config = useRuntimeConfig()
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const uiFail = `${baseUrl}/accounts/connections?oauth=error`

  if (error) {
    return sendRedirect(event, `${uiFail}&reason=${encodeURIComponent(error)}`, 302)
  }

  const st = mediaAccessStore.takeOAuthState(state)
  if (!st) {
    return sendRedirect(event, `${uiFail}&reason=invalid_state`, 302)
  }

  const conn = mediaAccessStore.getConnection(st.connectionId)
  if (!conn?.platformAppId) {
    return sendRedirect(event, `${uiFail}&reason=connection_missing`, 302)
  }

  const app = mediaAccessStore.getAppRaw(conn.platformAppId)
  const appSecret = mediaAccessStore.getAppSecret(conn.platformAppId)
  if (!app || !appSecret) {
    return sendRedirect(event, `${uiFail}&reason=app_secret_missing`, 302)
  }

  const redirectUri = `${baseUrl}/api/oauth/${media}/callback`

  if (media === 'meta') {
    try {
      const token = await exchangeMetaCode({
        appId: app.appId,
        appSecret,
        code,
        redirectUri
      })
      mediaAccessStore.completeAuth(conn.id, {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
        providerIdentityId: token.userId,
        providerIdentityName: token.userId,
        scopes: ['ads_read', 'business_management'],
        isMock: false
      })
      // Warm discovery cache optional — discover endpoint will call list
      void listMetaAdAccounts(token.accessToken)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'token_exchange_failed'
      return sendRedirect(event, `${uiFail}&reason=${encodeURIComponent(msg)}`, 302)
    }
  } else {
    mediaAccessStore.completeAuth(conn.id, {
      accessToken: `stub-${media}-${conn.id}`,
      isMock: true,
      scopes: ['ads_read']
    })
  }

  return sendRedirect(event, `${baseUrl}/accounts/connections?authorized=${conn.id}`, 302)
})
