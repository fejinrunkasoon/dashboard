import type {
  MediaConnectorDefinition,
  MediaCredential,
  MediaCredentialStatus,
  MediaFieldDefinition,
  MediaFieldUsage,
  MediaPlatform,
  PlatformAssetType,
  SyncScopeConfig
} from '~/domain'
import type {
  ConnectorBindingListItem,
  CreateConnectorBindingInput,
  CreateMediaCredentialInput,
  CreateMediaFieldInput,
  UpdateConnectorBindingInput,
  UpdateMediaFieldInput,
  UpdateSyncScopeInput
} from '~/services'
import { connectorService, mediaService } from '~/services'

export function useMediaConnectors() {
  const definitions = ref<MediaConnectorDefinition[]>([])
  const bindings = ref<ConnectorBindingListItem[]>([])
  const platforms = ref<MediaPlatform[]>([])
  const assetTypes = ref<PlatformAssetType[]>([])
  const selectedBindingId = ref<string | null>(null)
  const fields = ref<MediaFieldDefinition[]>([])
  const credentials = ref<MediaCredential[]>([])
  const selectedCredentialId = ref<string | null>(null)
  const syncScope = ref<SyncScopeConfig | null>(null)
  const pending = ref(false)
  const errorMessage = ref('')

  const selectedBinding = computed(() =>
    bindings.value.find(item => item.id === selectedBindingId.value) ?? null
  )

  const activePlatforms = computed(() =>
    platforms.value.filter(item => item.status === 'ACTIVE')
  )

  const assetTypesForSelectedMedia = computed(() => {
    const mediaId = selectedBinding.value?.mediaId
    if (!mediaId) return []
    return assetTypes.value.filter(item => item.mediaId === mediaId && item.status === 'ACTIVE')
  })

  const demandFields = computed(() => fields.value.filter(item => item.usage === 'DEMAND'))
  const accountMapFields = computed(() => fields.value.filter(item => item.usage === 'ACCOUNT_MAP'))

  async function refresh() {
    pending.value = true
    errorMessage.value = ''
    try {
      const [nextDefs, nextBindings, nextPlatforms, nextTypes] = await Promise.all([
        connectorService.listDefinitions(),
        connectorService.listBindings(),
        mediaService.getMediaPlatforms(),
        mediaService.getPlatformAssetTypes()
      ])
      definitions.value = nextDefs
      bindings.value = nextBindings
      platforms.value = nextPlatforms
      assetTypes.value = nextTypes

      if (selectedBindingId.value && !nextBindings.some(item => item.id === selectedBindingId.value)) {
        selectedBindingId.value = nextBindings[0]?.id ?? null
      } else if (!selectedBindingId.value && nextBindings.length) {
        selectedBindingId.value = nextBindings[0]!.id
      }

      if (selectedBindingId.value) {
        await refreshBindingDetails(selectedBindingId.value)
      } else {
        fields.value = []
        credentials.value = []
        selectedCredentialId.value = null
        syncScope.value = null
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载 Connector 配置失败'
    } finally {
      pending.value = false
    }
  }

  async function refreshBindingDetails(bindingId: string) {
    const binding = bindings.value.find(item => item.id === bindingId)
    if (!binding) {
      fields.value = []
      credentials.value = []
      selectedCredentialId.value = null
      syncScope.value = null
      return
    }

    const [nextFields, nextCredentials] = await Promise.all([
      connectorService.listFields(binding.mediaId),
      connectorService.listCredentials(bindingId)
    ])
    fields.value = nextFields
    credentials.value = nextCredentials

    if (selectedCredentialId.value && !nextCredentials.some(item => item.id === selectedCredentialId.value)) {
      selectedCredentialId.value = nextCredentials[0]?.id ?? null
    } else if (!selectedCredentialId.value && nextCredentials.length) {
      selectedCredentialId.value = nextCredentials[0]!.id
    }

    if (selectedCredentialId.value) {
      syncScope.value = await connectorService.getSyncScope(selectedCredentialId.value)
    } else {
      syncScope.value = null
    }
  }

  async function selectBinding(id: string) {
    selectedBindingId.value = id
    selectedCredentialId.value = null
    syncScope.value = null
    await refreshBindingDetails(id)
  }

  async function selectCredential(id: string) {
    selectedCredentialId.value = id
    syncScope.value = await connectorService.getSyncScope(id)
  }

  async function createBinding(input: CreateConnectorBindingInput) {
    const created = await connectorService.createBinding(input)
    await refresh()
    selectedBindingId.value = created.id
    await refreshBindingDetails(created.id)
    return created
  }

  async function updateBinding(id: string, input: UpdateConnectorBindingInput) {
    const updated = await connectorService.updateBinding(id, input)
    await refresh()
    return updated
  }

  async function setBindingStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    const updated = await connectorService.setBindingStatus(id, status)
    await refresh()
    return updated
  }

  async function createField(input: CreateMediaFieldInput) {
    const created = await connectorService.createField(input)
    if (selectedBindingId.value) await refreshBindingDetails(selectedBindingId.value)
    return created
  }

  async function updateField(id: string, input: UpdateMediaFieldInput) {
    const updated = await connectorService.updateField(id, input)
    if (selectedBindingId.value) await refreshBindingDetails(selectedBindingId.value)
    return updated
  }

  async function setFieldStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    const updated = await connectorService.setFieldStatus(id, status)
    if (selectedBindingId.value) await refreshBindingDetails(selectedBindingId.value)
    return updated
  }

  async function createCredential(input: CreateMediaCredentialInput) {
    const created = await connectorService.createCredential(input)
    if (selectedBindingId.value) await refreshBindingDetails(selectedBindingId.value)
    selectedCredentialId.value = created.id
    syncScope.value = await connectorService.getSyncScope(created.id)
    return created
  }

  async function setCredentialStatus(id: string, status: MediaCredentialStatus) {
    const updated = await connectorService.setCredentialStatus(id, status)
    if (selectedBindingId.value) await refreshBindingDetails(selectedBindingId.value)
    return updated
  }

  async function saveSyncScope(credentialId: string, input: UpdateSyncScopeInput) {
    const updated = await connectorService.upsertSyncScope(credentialId, input)
    syncScope.value = updated
    return updated
  }

  function activeAssetTypesForMedia(mediaId: string) {
    return assetTypes.value.filter(item => item.mediaId === mediaId && item.status === 'ACTIVE')
  }

  function fieldsByUsage(usage: MediaFieldUsage) {
    return fields.value.filter(item => item.usage === usage)
  }

  return {
    definitions,
    bindings,
    platforms,
    assetTypes,
    activePlatforms,
    selectedBindingId,
    selectedBinding,
    assetTypesForSelectedMedia,
    fields,
    demandFields,
    accountMapFields,
    credentials,
    selectedCredentialId,
    syncScope,
    pending,
    errorMessage,
    refresh,
    selectBinding,
    selectCredential,
    createBinding,
    updateBinding,
    setBindingStatus,
    createField,
    updateField,
    setFieldStatus,
    createCredential,
    setCredentialStatus,
    saveSyncScope,
    activeAssetTypesForMedia,
    fieldsByUsage
  }
}
