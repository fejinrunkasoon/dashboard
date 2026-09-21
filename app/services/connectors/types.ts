import type { EntityStatus } from '../../domain/common'
import type {
  MediaConnectorBinding,
  MediaConnectorDefinition,
  MediaCredential,
  MediaCredentialStatus,
  MediaFieldDefinition,
  MediaFieldOption,
  MediaFieldType,
  MediaFieldUsage,
  SyncScopeConfig
} from '../../domain/connector'
import type { DemandRequirementFieldDef } from '../../domain/demand-requirement-fields'

export interface CreateConnectorBindingInput {
  mediaId: string
  implKey: string
  assetTypeIds: string[]
}

export interface UpdateConnectorBindingInput {
  implKey?: string
  assetTypeIds?: string[]
}

export interface CreateMediaFieldInput {
  mediaId: string
  usage: MediaFieldUsage
  key: string
  label: string
  fieldType: MediaFieldType
  required?: boolean
  options?: MediaFieldOption[]
  sourceKey?: string | null
}

export interface UpdateMediaFieldInput {
  label?: string
  fieldType?: MediaFieldType
  required?: boolean
  options?: MediaFieldOption[]
  sourceKey?: string | null
}

export interface CreateMediaCredentialInput {
  connectorBindingId: string
  label: string
}

export interface UpdateSyncScopeInput {
  discoverAccounts?: boolean
  syncSpend?: boolean
  syncStatus?: boolean
  assetTypeIds?: string[]
}

export interface ConnectorBindingListItem extends MediaConnectorBinding {
  mediaName: string
  mediaStatus: EntityStatus
  implDisplayName: string
  assetTypeNames: string[]
  credentialCount: number
}

export interface ConnectorService {
  listDefinitions(): Promise<MediaConnectorDefinition[]>

  listBindings(): Promise<ConnectorBindingListItem[]>
  getBinding(id: string): Promise<MediaConnectorBinding | null>
  createBinding(input: CreateConnectorBindingInput): Promise<MediaConnectorBinding>
  updateBinding(id: string, input: UpdateConnectorBindingInput): Promise<MediaConnectorBinding>
  setBindingStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaConnectorBinding>

  listFields(mediaId: string, usage?: MediaFieldUsage): Promise<MediaFieldDefinition[]>
  createField(input: CreateMediaFieldInput): Promise<MediaFieldDefinition>
  updateField(id: string, input: UpdateMediaFieldInput): Promise<MediaFieldDefinition>
  setFieldStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaFieldDefinition>

  /** ACTIVE DEMAND fields for a media — consumed by Apply Account Demand form. */
  getDemandFields(mediaId: string): Promise<DemandRequirementFieldDef[]>

  listCredentials(connectorBindingId: string): Promise<MediaCredential[]>
  createCredential(input: CreateMediaCredentialInput): Promise<MediaCredential>
  setCredentialStatus(id: string, status: MediaCredentialStatus): Promise<MediaCredential>

  getSyncScope(credentialId: string): Promise<SyncScopeConfig | null>
  upsertSyncScope(credentialId: string, input: UpdateSyncScopeInput): Promise<SyncScopeConfig>
}
