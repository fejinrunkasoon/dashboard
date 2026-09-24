/**
 * Meta Marketing API helpers — read-only account listing.
 * Docs: Ad Account + OAuth; ads_read scope.
 */

export interface MetaTokenResult {
  accessToken: string
  expiresAt: string | null
  userId: string | null
}

export interface MetaAdAccountRow {
  externalAccountId: string
  name: string | null
  accountStatus: number | null
  currency: string | null
  raw: Record<string, string>
}

export async function exchangeMetaCode(input: {
  appId: string
  appSecret: string
  code: string
  redirectUri: string
}): Promise<MetaTokenResult> {
  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  url.searchParams.set('client_id', input.appId)
  url.searchParams.set('client_secret', input.appSecret)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('code', input.code)

  const res = await fetch(url.toString())
  const data = await res.json() as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || `Meta token exchange failed (${res.status})`)
  }

  let userId: string | null = null
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(data.access_token)}`
    )
    const me = await meRes.json() as { id?: string, name?: string }
    userId = me.id ?? null
  } catch {
    userId = null
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    expiresAt,
    userId
  }
}

export async function listMetaAdAccounts(accessToken: string): Promise<MetaAdAccountRow[]> {
  const url = new URL('https://graph.facebook.com/v21.0/me/adaccounts')
  url.searchParams.set('fields', 'account_id,name,account_status,currency')
  url.searchParams.set('limit', '200')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString())
  const data = await res.json() as {
    data?: Array<{
      account_id?: string
      id?: string
      name?: string
      account_status?: number
      currency?: string
    }>
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(data.error?.message || `Meta adaccounts failed (${res.status})`)
  }

  return (data.data ?? []).map((row) => {
    const accountId = row.account_id || (row.id?.replace(/^act_/, '') ?? '')
    const external = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    return {
      externalAccountId: external,
      name: row.name ?? null,
      accountStatus: row.account_status ?? null,
      currency: row.currency ?? null,
      raw: {
        name: row.name ?? '',
        currency: row.currency ?? '',
        account_status: String(row.account_status ?? '')
      }
    }
  })
}
