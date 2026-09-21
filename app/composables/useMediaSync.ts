import type {
  DiscoveredAccount,
  DiscoveredAccountQuery,
  DiscoveredImportStatus,
  DiscoveryMatchStatus,
  MediaCredential,
  SyncJob,
  SyncLog,
  SyncScopeConfig
} from '~/domain'
import type { ConfirmSyncImportInput, ConnectorBindingListItem } from '~/services'
import { connectorService, mediaSyncService } from '~/services'

export function useMediaSync() {
  const bindings = ref<ConnectorBindingListItem[]>([])
  const credentials = ref<MediaCredential[]>([])
  const selectedCredentialId = ref<string | null>(null)
  const syncScope = ref<SyncScopeConfig | null>(null)
  const jobs = ref<SyncJob[]>([])
  const logs = ref<SyncLog[]>([])
  const discovered = ref<DiscoveredAccount[]>([])
  const pending = ref(false)
  const running = ref(false)
  const errorMessage = ref('')

  const selectedCredential = computed(() =>
    credentials.value.find(item => item.id === selectedCredentialId.value) ?? null
  )

  const selectedBinding = computed(() => {
    const cred = selectedCredential.value
    if (!cred) return null
    return bindings.value.find(item => item.id === cred.connectorBindingId) ?? null
  })

  const discoverGate = computed(() => {
    const cred = selectedCredential.value
    const binding = selectedBinding.value
    if (!cred) return { ok: false, reason: '请选择 Credential' }
    if (!binding) return { ok: false, reason: '找不到绑定' }
    if (binding.implKey !== 'meta') {
      return { ok: false, reason: '本步仅支持 Meta Discovery' }
    }
    if (cred.status !== 'MOCK_CONNECTED') {
      return { ok: false, reason: `Credential 状态为 ${cred.status}，需 MOCK_CONNECTED` }
    }
    if (!syncScope.value?.discoverAccounts) {
      return { ok: false, reason: '同步范围未开启「发现账户」' }
    }
    return { ok: true, reason: '' }
  })

  const pendingNew = computed(() =>
    discovered.value.filter(
      item => item.matchStatus === 'NEW' && item.importStatus === 'PENDING'
    )
  )

  async function refreshCredentials() {
    const nextBindings = await connectorService.listBindings()
    bindings.value = nextBindings
    const allCreds: MediaCredential[] = []
    for (const binding of nextBindings) {
      const list = await connectorService.listCredentials(binding.id)
      allCreds.push(...list)
    }
    credentials.value = allCreds

    if (selectedCredentialId.value && !allCreds.some(c => c.id === selectedCredentialId.value)) {
      selectedCredentialId.value = null
    }
    if (!selectedCredentialId.value) {
      const metaConnected = allCreds.find(c => c.status === 'MOCK_CONNECTED')
      selectedCredentialId.value = metaConnected?.id ?? allCreds[0]?.id ?? null
    }
  }

  async function refreshLists() {
    const credId = selectedCredentialId.value
    const [nextJobs, nextDiscovered, nextLogs, nextScope] = await Promise.all([
      mediaSyncService.getJobs({ credentialId: credId ?? undefined, pageSize: 20 }),
      mediaSyncService.listDiscovered({
        credentialId: credId ?? undefined,
        pageSize: 100
      } satisfies DiscoveredAccountQuery),
      mediaSyncService.getLogs({ credentialId: credId ?? undefined, pageSize: 40 }),
      credId ? connectorService.getSyncScope(credId) : Promise.resolve(null)
    ])
    jobs.value = nextJobs.items
    discovered.value = nextDiscovered.items
    logs.value = nextLogs.items
    syncScope.value = nextScope
  }

  async function refresh() {
    pending.value = true
    errorMessage.value = ''
    try {
      await refreshCredentials()
      await refreshLists()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载同步数据失败'
    } finally {
      pending.value = false
    }
  }

  async function selectCredential(id: string) {
    selectedCredentialId.value = id
    pending.value = true
    errorMessage.value = ''
    try {
      await refreshLists()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      pending.value = false
    }
  }

  async function runDiscovery() {
    if (!selectedCredentialId.value) return
    running.value = true
    errorMessage.value = ''
    try {
      await mediaSyncService.runDiscovery(selectedCredentialId.value)
      await refreshLists()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发现失败'
      await refreshLists()
      throw error
    } finally {
      running.value = false
    }
  }

  async function confirmImport(input: ConfirmSyncImportInput) {
    const result = await mediaSyncService.confirmImport(input)
    await refreshLists()
    return result
  }

  async function skipDiscovered(ids: string[]) {
    const count = await mediaSyncService.skipDiscovered(ids)
    await refreshLists()
    return count
  }

  function filterDiscovered(
    matchStatuses?: DiscoveryMatchStatus[],
    importStatuses?: DiscoveredImportStatus[]
  ) {
    return discovered.value.filter((item) => {
      if (matchStatuses?.length && !matchStatuses.includes(item.matchStatus)) return false
      if (importStatuses?.length && !importStatuses.includes(item.importStatus)) return false
      return true
    })
  }

  return {
    bindings,
    credentials,
    selectedCredentialId,
    selectedCredential,
    selectedBinding,
    discoverGate,
    jobs,
    logs,
    discovered,
    pendingNew,
    pending,
    running,
    errorMessage,
    refresh,
    selectCredential,
    runDiscovery,
    confirmImport,
    skipDiscovered,
    filterDiscovered
  }
}
