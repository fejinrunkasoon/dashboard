/** Tenant-plane platform connection — distinct from Control-plane Connector Binding. */

export type MediaConnectionStatus =
  | 'PENDING_AUTH'
  | 'ACTIVE'
  | 'REAUTH_REQUIRED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'MOCK'

export type ProviderAccessStatus =
  | 'ACCESSIBLE'
  | 'LOST'
  | 'UNKNOWN'
  | 'REVOKED'

/**
 * One OAuth (or mock) authorization by a user on behalf of an org/team.
 * Connection = data access channel; Media Account = business asset.
 */
export interface MediaConnection {
  id: string
  organizationId: string
  teamId: string
  platformId: string
  displayName: string
  authorizedByUserId: string
  status: MediaConnectionStatus
  /** Provider-side identity (e.g. Meta user / BM label). */
  providerIdentityId?: string | null
  providerIdentityName?: string | null
  scopes: string[]
  /** When true, this is a TEST ONLY mock connection (no real token). */
  isMock: boolean
  /**
   * PlatformApp that issued / owns this OAuth token.
   * Required for authorized connections; set at startConnection from default app.
   */
  platformAppId: string | null
  /** @deprecated Prefer platformAppId. Kept for one-release sync bridge. */
  legacyCredentialId?: string | null
  authorizedAt?: string | null
  expiresAt?: string | null
  lastVerifiedAt?: string | null
  lastSyncAt?: string | null
  createdAt: string
  updatedAt: string
}

/** Server-side secret stub — never returned to frontend in production. */
export interface ConnectionSecret {
  connectionId: string
  hasAccessToken: boolean
  hasRefreshToken: boolean
  tokenExpiresAt?: string | null
  secretVersion: number
  updatedAt: string
}

/**
 * N:N link between Connection and Media Account (AdAccount).
 */
export interface ConnectionAccount {
  id: string
  organizationId: string
  connectionId: string
  mediaAccountId: string
  providerAccessStatus: ProviderAccessStatus
  syncEnabled: boolean
  isPrimarySyncSource: boolean
  discoveredAt: string
  lastVerifiedAt?: string | null
  lastSuccessfulSyncAt?: string | null
  createdAt: string
  updatedAt: string
}
