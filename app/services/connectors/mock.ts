import type { EntityStatus } from '../../domain/common'
import type {
  MediaConnectorBinding,
  MediaCredential,
  MediaCredentialStatus,
  MediaFieldDefinition,
  SyncScopeConfig
} from '../../domain/connector'
import type { DemandRequirementFieldDef } from '../../domain/demand-requirement-fields'
import {
  mediaConnectorBindings,
  mediaCredentials,
  mediaFieldDefinitions,
  mediaPlatforms,
  platformAssetTypes,
  syncScopeConfigs
} from '../../mocks'
import { getConnectorDefinition, MEDIA_CONNECTOR_REGISTRY } from './registry'
import type {
  ConnectorBindingListItem,
  ConnectorService,
  CreateConnectorBindingInput,
  CreateMediaCredentialInput,
  CreateMediaFieldInput,
  UpdateConnectorBindingInput,
  UpdateMediaFieldInput,
  UpdateSyncScopeInput
} from './types'

function nowIso() {
  return new Date().toISOString()
}

function assertStatus(status: EntityStatus): asserts status is 'ACTIVE' | 'DISABLED' {
  if (status !== 'ACTIVE' && status !== 'DISABLED') {
    throw new Error(`Unsupported status: ${status}`)
  }
}

function requireActiveMedia(mediaId: string) {
  const media = mediaPlatforms.find(item => item.id === mediaId)
  if (!media) throw new Error(`Unknown media platform: ${mediaId}`)
  if (media.status !== 'ACTIVE') {
    throw new Error(`Media platform is not ACTIVE: ${media.code}`)
  }
  return media
}

function validateAssetTypeIds(mediaId: string, assetTypeIds: string[]) {
  if (!assetTypeIds.length) throw new Error('At least one asset type is required')
  const unique = [...new Set(assetTypeIds)]
  for (const typeId of unique) {
    const type = platformAssetTypes.find(item => item.id === typeId)
    if (!type) throw new Error(`Unknown platform asset type: ${typeId}`)
    if (type.mediaId !== mediaId) {
      throw new Error(`Asset type ${type.code} does not belong to this media`)
    }
    if (type.status !== 'ACTIVE') {
      throw new Error(`Asset type is not ACTIVE: ${type.code}`)
    }
  }
  return unique
}

function requireImplKey(implKey: string) {
  const def = getConnectorDefinition(implKey)
  if (!def) throw new Error(`Unknown connector implementation: ${implKey}`)
  return def
}

function normalizeKey(key: string) {
  return key.trim()
}

function toBindingListItem(binding: MediaConnectorBinding): ConnectorBindingListItem {
  const media = mediaPlatforms.find(item => item.id === binding.mediaId)
  const def = getConnectorDefinition(binding.implKey)
  const typeNames = binding.assetTypeIds.map((id) => {
    const type = platformAssetTypes.find(item => item.id === id)
    return type?.name ?? id
  })
  const credentialCount = mediaCredentials.filter(
    item => item.connectorBindingId === binding.id
  ).length

  return {
    ...binding,
    mediaName: media?.name ?? binding.mediaId,
    mediaStatus: media?.status ?? 'DISABLED',
    implDisplayName: def?.displayName ?? binding.implKey,
    assetTypeNames: typeNames,
    credentialCount
  }
}

function toDemandFieldDef(field: MediaFieldDefinition): DemandRequirementFieldDef {
  return {
    key: field.key,
    label: field.label,
    type: field.fieldType,
    required: field.required,
    options: field.options
  }
}

export const connectorService: ConnectorService = {
  async listDefinitions() {
    return MEDIA_CONNECTOR_REGISTRY.map(item => ({ ...item, capabilities: [...item.capabilities] }))
  },

  async listBindings() {
    return mediaConnectorBindings.map(toBindingListItem)
  },

  async getBinding(id) {
    const binding = mediaConnectorBindings.find(item => item.id === id)
    return binding ? { ...binding, assetTypeIds: [...binding.assetTypeIds] } : null
  },

  async createBinding(input: CreateConnectorBindingInput): Promise<MediaConnectorBinding> {
    requireActiveMedia(input.mediaId)
    const def = requireImplKey(input.implKey)
    const assetTypeIds = validateAssetTypeIds(input.mediaId, input.assetTypeIds)

    const existingActive = mediaConnectorBindings.find(
      item => item.mediaId === input.mediaId && item.status === 'ACTIVE'
    )
    if (existingActive) {
      throw new Error(`Media already has an ACTIVE connector binding (${existingActive.implKey})`)
    }

    const stamp = nowIso()
    const binding: MediaConnectorBinding = {
      id: `mcb-${input.mediaId.replace(/^media-/, '')}-${mediaConnectorBindings.length + 1}`,
      mediaId: input.mediaId,
      implKey: def.implKey,
      assetTypeIds,
      status: 'ACTIVE',
      createdAt: stamp,
      updatedAt: stamp
    }
    mediaConnectorBindings.push(binding)
    return { ...binding, assetTypeIds: [...binding.assetTypeIds] }
  },

  async updateBinding(id: string, input: UpdateConnectorBindingInput): Promise<MediaConnectorBinding> {
    const binding = mediaConnectorBindings.find(item => item.id === id)
    if (!binding) throw new Error(`Unknown connector binding: ${id}`)

    if (input.implKey !== undefined) {
      const def = requireImplKey(input.implKey)
      binding.implKey = def.implKey
    }
    if (input.assetTypeIds !== undefined) {
      binding.assetTypeIds = validateAssetTypeIds(binding.mediaId, input.assetTypeIds)
    }
    binding.updatedAt = nowIso()
    return { ...binding, assetTypeIds: [...binding.assetTypeIds] }
  },

  async setBindingStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaConnectorBinding> {
    assertStatus(status)
    const binding = mediaConnectorBindings.find(item => item.id === id)
    if (!binding) throw new Error(`Unknown connector binding: ${id}`)

    if (status === 'ACTIVE') {
      requireActiveMedia(binding.mediaId)
      const other = mediaConnectorBindings.find(
        item => item.mediaId === binding.mediaId && item.status === 'ACTIVE' && item.id !== id
      )
      if (other) {
        throw new Error(`Media already has an ACTIVE connector binding (${other.implKey})`)
      }
      validateAssetTypeIds(binding.mediaId, binding.assetTypeIds)
    }

    binding.status = status
    binding.updatedAt = nowIso()
    return { ...binding, assetTypeIds: [...binding.assetTypeIds] }
  },

  async listFields(mediaId, usage) {
    return mediaFieldDefinitions
      .filter(item => item.mediaId === mediaId && (usage == null || item.usage === usage))
      .map(item => ({
        ...item,
        options: item.options ? item.options.map(o => ({ ...o })) : undefined
      }))
  },

  async createField(input: CreateMediaFieldInput): Promise<MediaFieldDefinition> {
    requireActiveMedia(input.mediaId)
    const key = normalizeKey(input.key)
    const label = input.label?.trim()
    if (!key) throw new Error('key is required')
    if (!label) throw new Error('label is required')
    if (input.usage !== 'DEMAND' && input.usage !== 'ACCOUNT_MAP') {
      throw new Error(`Unsupported field usage: ${input.usage}`)
    }
    if (input.fieldType !== 'text' && input.fieldType !== 'select') {
      throw new Error(`Unsupported field type: ${input.fieldType}`)
    }
    if (input.fieldType === 'select' && !(input.options?.length)) {
      throw new Error('select fields require at least one option')
    }

    const dup = mediaFieldDefinitions.find(
      item => item.mediaId === input.mediaId && item.usage === input.usage && item.key === key
    )
    if (dup) throw new Error(`Field key already exists for this media + usage: ${key}`)

    const stamp = nowIso()
    const field: MediaFieldDefinition = {
      id: `mfd-${input.mediaId.replace(/^media-/, '')}-${key}-${mediaFieldDefinitions.length + 1}`,
      mediaId: input.mediaId,
      usage: input.usage,
      key,
      label,
      fieldType: input.fieldType,
      required: Boolean(input.required),
      options: input.options?.map(o => ({ ...o })),
      sourceKey: input.sourceKey?.trim() || null,
      status: 'ACTIVE',
      createdAt: stamp,
      updatedAt: stamp
    }
    mediaFieldDefinitions.push(field)
    return {
      ...field,
      options: field.options ? field.options.map(o => ({ ...o })) : undefined
    }
  },

  async updateField(id: string, input: UpdateMediaFieldInput): Promise<MediaFieldDefinition> {
    const field = mediaFieldDefinitions.find(item => item.id === id)
    if (!field) throw new Error(`Unknown media field: ${id}`)

    if (input.label !== undefined) {
      const label = input.label.trim()
      if (!label) throw new Error('label is required')
      field.label = label
    }
    if (input.fieldType !== undefined) {
      if (input.fieldType !== 'text' && input.fieldType !== 'select') {
        throw new Error(`Unsupported field type: ${input.fieldType}`)
      }
      field.fieldType = input.fieldType
    }
    if (input.required !== undefined) field.required = Boolean(input.required)
    if (input.options !== undefined) {
      field.options = input.options.map(o => ({ ...o }))
    }
    if (input.sourceKey !== undefined) {
      field.sourceKey = input.sourceKey?.trim() || null
    }
    if (field.fieldType === 'select' && !(field.options?.length)) {
      throw new Error('select fields require at least one option')
    }

    field.updatedAt = nowIso()
    return {
      ...field,
      options: field.options ? field.options.map(o => ({ ...o })) : undefined
    }
  },

  async setFieldStatus(id: string, status: 'ACTIVE' | 'DISABLED'): Promise<MediaFieldDefinition> {
    assertStatus(status)
    const field = mediaFieldDefinitions.find(item => item.id === id)
    if (!field) throw new Error(`Unknown media field: ${id}`)
    field.status = status
    field.updatedAt = nowIso()
    return {
      ...field,
      options: field.options ? field.options.map(o => ({ ...o })) : undefined
    }
  },

  async getDemandFields(mediaId: string): Promise<DemandRequirementFieldDef[]> {
    return mediaFieldDefinitions
      .filter(item => item.mediaId === mediaId && item.usage === 'DEMAND' && item.status === 'ACTIVE')
      .map(toDemandFieldDef)
  },

  async listCredentials(connectorBindingId) {
    return mediaCredentials
      .filter(item => item.connectorBindingId === connectorBindingId)
      .map(item => ({ ...item }))
  },

  async createCredential(input: CreateMediaCredentialInput): Promise<MediaCredential> {
    const binding = mediaConnectorBindings.find(item => item.id === input.connectorBindingId)
    if (!binding) throw new Error(`Unknown connector binding: ${input.connectorBindingId}`)
    if (binding.status !== 'ACTIVE') {
      throw new Error('Cannot create credential on a DISABLED binding')
    }

    const label = input.label?.trim()
    if (!label) throw new Error('label is required')

    const stamp = nowIso()
    const credential: MediaCredential = {
      id: `mcred-${binding.id}-${mediaCredentials.length + 1}`,
      connectorBindingId: binding.id,
      label,
      status: 'DRAFT',
      createdAt: stamp,
      updatedAt: stamp
    }
    mediaCredentials.push(credential)
    return { ...credential }
  },

  async setCredentialStatus(id: string, status: MediaCredentialStatus): Promise<MediaCredential> {
    const allowed: MediaCredentialStatus[] = ['DRAFT', 'MOCK_CONNECTED', 'EXPIRED', 'REVOKED']
    if (!allowed.includes(status)) throw new Error(`Unsupported credential status: ${status}`)

    const credential = mediaCredentials.find(item => item.id === id)
    if (!credential) throw new Error(`Unknown media credential: ${id}`)

    const binding = mediaConnectorBindings.find(item => item.id === credential.connectorBindingId)
    if (!binding) throw new Error(`Unknown connector binding: ${credential.connectorBindingId}`)

    if (status === 'MOCK_CONNECTED' && binding.status !== 'ACTIVE') {
      throw new Error('Cannot mark credential MOCK_CONNECTED when binding is DISABLED')
    }

    credential.status = status
    credential.updatedAt = nowIso()
    return { ...credential }
  },

  async getSyncScope(credentialId) {
    const scope = syncScopeConfigs.find(item => item.credentialId === credentialId)
    return scope
      ? { ...scope, assetTypeIds: [...scope.assetTypeIds] }
      : null
  },

  async upsertSyncScope(credentialId: string, input: UpdateSyncScopeInput): Promise<SyncScopeConfig> {
    const credential = mediaCredentials.find(item => item.id === credentialId)
    if (!credential) throw new Error(`Unknown media credential: ${credentialId}`)

    const binding = mediaConnectorBindings.find(item => item.id === credential.connectorBindingId)
    if (!binding) throw new Error(`Unknown connector binding: ${credential.connectorBindingId}`)

    let scope = syncScopeConfigs.find(item => item.credentialId === credentialId)
    const stamp = nowIso()

    if (!scope) {
      const assetTypeIds = input.assetTypeIds
        ? validateAssetTypeIds(binding.mediaId, input.assetTypeIds)
        : [...binding.assetTypeIds]
      scope = {
        id: `ssc-${credentialId}`,
        credentialId,
        discoverAccounts: input.discoverAccounts ?? false,
        syncSpend: input.syncSpend ?? false,
        syncStatus: input.syncStatus ?? false,
        assetTypeIds,
        updatedAt: stamp
      }
      syncScopeConfigs.push(scope)
      return { ...scope, assetTypeIds: [...scope.assetTypeIds] }
    }

    if (input.discoverAccounts !== undefined) scope.discoverAccounts = input.discoverAccounts
    if (input.syncSpend !== undefined) scope.syncSpend = input.syncSpend
    if (input.syncStatus !== undefined) scope.syncStatus = input.syncStatus
    if (input.assetTypeIds !== undefined) {
      scope.assetTypeIds = validateAssetTypeIds(binding.mediaId, input.assetTypeIds)
    }
    scope.updatedAt = stamp
    return { ...scope, assetTypeIds: [...scope.assetTypeIds] }
  }
}
