import type { MediaConnectorAdapter, ConnectorAuthorizeResult, ConnectorTokenResult } from '../adapter'

export class ConnectorNotImplementedError extends Error {
  readonly code = 'notImplemented' as const
  constructor(implKey: string) {
    super(`Connector ${implKey} discovery is not implemented yet`)
    this.name = 'ConnectorNotImplementedError'
  }
}

function stubAdapter(implKey: string, displayName: string): MediaConnectorAdapter {
  return {
    implKey,
    async authorize(): Promise<ConnectorAuthorizeResult> {
      return { mockCompleted: true, state: `mock-${implKey}-${Date.now()}` }
    },
    async exchangeToken(): Promise<ConnectorTokenResult> {
      return {
        accessTokenPresent: true,
        refreshTokenPresent: false,
        expiresAt: null,
        providerIdentityId: `${implKey}-mock`,
        providerIdentityName: `${displayName} Mock`,
        scopes: ['ads_read']
      }
    },
    async discoverAccounts() {
      throw new ConnectorNotImplementedError(implKey)
    },
    async getAccount() {
      return null
    },
    async listCampaigns() {
      return []
    },
    async getMetrics() {
      return []
    }
  }
}

export const googleConnectorAdapter = stubAdapter('google', 'Google')
export const tiktokConnectorAdapter = stubAdapter('tiktok', 'TikTok')
export const snapchatConnectorAdapter = stubAdapter('snapchat', 'Snapchat')
