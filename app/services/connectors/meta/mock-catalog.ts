/**
 * Meta Discovery Mock catalog — STEP 21.
 * Entries are "media-side visible" under Meta Ops credential.
 * Intentionally omits some ACCESSIBLE FFJ Meta accounts (e.g. act_300001)
 * so reconcile can raise API_ACCESS_LOST.
 */

export interface MetaDiscoveredCatalogRow {
  externalAccountId: string
  name: string
  platformAssetExternalId: string | null
  /** Extra raw keys for ACCOUNT_MAP demos. */
  raw?: Record<string, string>
}

export const META_DISCOVER_CATALOG: MetaDiscoveredCatalogRow[] = [
  {
    externalAccountId: 'act_100001',
    name: 'Spend Demo Account (Media)',
    platformAssetExternalId: '123456'
  },
  {
    externalAccountId: 'act_200001',
    name: 'Fee Case A (Media)',
    platformAssetExternalId: '555000111'
  },
  {
    externalAccountId: 'act_800002',
    name: 'Pool Meta LA (Media)',
    platformAssetExternalId: '123456'
  },
  {
    externalAccountId: 'act_sync_new_001',
    name: 'Sync Import Alpha',
    platformAssetExternalId: '123456',
    raw: { name: 'Sync Import Alpha', currency: 'USD' }
  },
  {
    externalAccountId: 'act_sync_new_002',
    name: 'Sync Import Beta',
    platformAssetExternalId: '555000111',
    raw: { name: 'Sync Import Beta', currency: 'USD' }
  },
  {
    externalAccountId: 'act_sync_new_003',
    name: 'Sync Import Gamma',
    platformAssetExternalId: '123456',
    raw: { name: 'Sync Import Gamma' }
  },
  {
    externalAccountId: 'act_sync_new_004',
    name: 'Sync Import Delta',
    platformAssetExternalId: null,
    raw: { name: 'Sync Import Delta' }
  }
]
