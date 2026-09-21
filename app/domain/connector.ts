import type { EntityStatus } from './common'

/** Capability flags for a code-registered connector implementation. */
export type MediaConnectorCapability = 'DISCOVERY' | 'SPEND' | 'STATUS'

/**
 * Read-only definition from the code registry.
 * Users cannot invent a new API implementation from the UI.
 */
export interface MediaConnectorDefinition {
  implKey: string
  displayName: string
  capabilities: MediaConnectorCapability[]
}

export interface MediaConnectorBinding {
  id: string
  mediaId: string
  implKey: string
  assetTypeIds: string[]
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export type MediaFieldUsage = 'DEMAND' | 'ACCOUNT_MAP'

export type MediaFieldType = 'text' | 'select'

export interface MediaFieldOption {
  label: string
  value: string
}

export interface MediaFieldDefinition {
  id: string
  mediaId: string
  usage: MediaFieldUsage
  key: string
  label: string
  fieldType: MediaFieldType
  required: boolean
  options?: MediaFieldOption[]
  /** External / media-side field key for ACCOUNT_MAP (config only). */
  sourceKey?: string | null
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export type MediaCredentialStatus =
  | 'DRAFT'
  | 'MOCK_CONNECTED'
  | 'EXPIRED'
  | 'REVOKED'

/**
 * Mock credential — never stores token / secret.
 * Real OAuth is STEP 30.
 */
export interface MediaCredential {
  id: string
  connectorBindingId: string
  label: string
  status: MediaCredentialStatus
  createdAt: string
  updatedAt: string
}

/** Sync scope is configuration only; no job execution in STEP 20. */
export interface SyncScopeConfig {
  id: string
  credentialId: string
  discoverAccounts: boolean
  syncSpend: boolean
  syncStatus: boolean
  assetTypeIds: string[]
  updatedAt: string
}
