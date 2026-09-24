import { META_DISCOVER_CATALOG } from './mock-catalog'
import type {
  MediaConnectorAdapter,
  ConnectorAuthorizeResult,
  ConnectorDiscoveredAccount,
  ConnectorTokenResult
} from '../adapter'

/**
 * Meta adapter (client mock catalog).
 * Real OAuth + me/adaccounts live under server/services/meta-oauth.ts
 * when NUXT_PUBLIC_MEDIA_API=live and App ID is non-mock.
 */
export const metaConnectorAdapter: MediaConnectorAdapter = {
  implKey: 'meta',

  async authorize() {
    const result: ConnectorAuthorizeResult = {
      mockCompleted: true,
      state: `mock-meta-${Date.now()}`
    }
    return result
  },

  async exchangeToken(): Promise<ConnectorTokenResult> {
    return {
      accessTokenPresent: true,
      refreshTokenPresent: false,
      expiresAt: null,
      providerIdentityId: 'meta-mock-user',
      providerIdentityName: 'Meta Mock User',
      scopes: ['ads_read']
    }
  },

  async discoverAccounts(): Promise<ConnectorDiscoveredAccount[]> {
    return META_DISCOVER_CATALOG.map(row => ({
      externalAccountId: row.externalAccountId,
      name: row.name,
      currency: row.raw?.currency ?? null,
      timezone: null,
      platformAssetExternalId: row.platformAssetExternalId,
      raw: { name: row.name, ...(row.raw ?? {}) }
    }))
  },

  async getAccount({ externalAccountId }) {
    const row = META_DISCOVER_CATALOG.find(
      r => r.externalAccountId.toLowerCase() === externalAccountId.toLowerCase()
    )
    if (!row) return null
    return {
      externalAccountId: row.externalAccountId,
      name: row.name,
      status: 'ACTIVE',
      currency: row.raw?.currency ?? null,
      timezone: null
    }
  },

  async listCampaigns() {
    return []
  },

  async getMetrics() {
    return []
  }
}
