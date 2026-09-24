/**
 * Media Connector Adapter contract — Provider differences stay inside adapters.
 * Real OAuth / API calls are not implemented yet (Mock / TEST ONLY).
 */

export interface ConnectorAuthorizeResult {
  authorizationUrl?: string
  /** Mock path: skip redirect and complete immediately. */
  mockCompleted?: boolean
  state?: string
}

export interface ConnectorTokenResult {
  accessTokenPresent: boolean
  refreshTokenPresent: boolean
  expiresAt?: string | null
  providerIdentityId?: string | null
  providerIdentityName?: string | null
  scopes: string[]
}

export interface ConnectorDiscoveredAccount {
  externalAccountId: string
  name: string | null
  currency?: string | null
  timezone?: string | null
  platformAssetExternalId?: string | null
  raw: Record<string, string>
}

export interface ConnectorAccountSnapshot {
  externalAccountId: string
  name: string | null
  status: string
  currency?: string | null
  timezone?: string | null
}

export interface ConnectorCampaignRow {
  externalCampaignId: string
  name: string
  status: string
}

export interface ConnectorMetricsRow {
  date: string
  spend: number
  impressions: number
  clicks: number
  currency: string
}

/**
 * Unified adapter surface for Meta / Google / TikTok / Snapchat.
 * Control Plane registers implKey → adapter; Tenant Plane calls via Connection.
 */
export interface MediaConnectorAdapter {
  implKey: string
  /** Start OAuth (or mock). State must be bound server-side. */
  authorize(input: {
    organizationId: string
    teamId: string
    userId: string
    redirectUri: string
  }): Promise<ConnectorAuthorizeResult>
  /** Exchange code for tokens — tokens never returned to frontend. */
  exchangeToken(input: {
    code: string
    state: string
  }): Promise<ConnectorTokenResult>
  discoverAccounts(input: {
    connectionId: string
  }): Promise<ConnectorDiscoveredAccount[]>
  getAccount(input: {
    connectionId: string
    externalAccountId: string
  }): Promise<ConnectorAccountSnapshot | null>
  listCampaigns(input: {
    connectionId: string
    externalAccountId: string
  }): Promise<ConnectorCampaignRow[]>
  listAdGroups?(input: {
    connectionId: string
    externalAccountId: string
  }): Promise<{ externalAdGroupId: string, name: string, status: string }[]>
  listAds?(input: {
    connectionId: string
    externalAccountId: string
  }): Promise<{ externalAdId: string, name: string, status: string }[]>
  getMetrics(input: {
    connectionId: string
    externalAccountId: string
    from: string
    to: string
  }): Promise<ConnectorMetricsRow[]>
}
