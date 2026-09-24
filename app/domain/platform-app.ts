import type { EntityStatus } from './common'

/**
 * System-level (or future BYO) media application credentials.
 * One default app per media in MVP; model allows 1:N via isDefault.
 * Secrets never round-trip to the frontend in plaintext after save.
 */
export type PlatformAppStatus = EntityStatus

export interface PlatformApp {
  id: string
  mediaId: string
  /** Provider application id (Meta App ID, Google OAuth client id, TikTok app_id). */
  appId: string
  /** True when a secret is stored server-side (never expose the value). */
  hasSecret: boolean
  /** Google Ads developer token present (encrypted server-side). */
  hasDeveloperToken: boolean
  status: PlatformAppStatus
  isDefault: boolean
  /** OAuth redirect URI shown to admins (computed / configured). */
  redirectUriHint?: string | null
  createdAt: string
  updatedAt: string
}

/** Admin write payload — secret/developerToken only sent when rotating. */
export interface PlatformAppUpsertInput {
  mediaId: string
  appId: string
  /** Omit or empty to keep existing secret. */
  secret?: string | null
  developerToken?: string | null
  status?: PlatformAppStatus
  isDefault?: boolean
}

/** Connectable platform row for Tenant-plane UI. */
export interface ConnectablePlatform {
  mediaId: string
  code: string
  name: string
  logoUrl?: string | null
  platformEnabled: boolean
  appConfigured: boolean
  platformAppId: string | null
  /** False when adapter is stub-only (Google/TikTok/Snapchat until wired). */
  discoveryReady: boolean
}
