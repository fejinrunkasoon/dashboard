import { connectionService } from '~/services'
import type {
  DiscoverViaConnectionResult,
  ImportConnectionAccountsResult,
  MediaConnectionListItem,
  PlatformConnectionSummary
} from '~/services'
import type { DiscoveredAccount, MediaConnection } from '~/domain'

export function useMediaConnections() {
  const { userId, organizationId, team } = useCurrentUser()

  const summaries = ref<PlatformConnectionSummary[]>([])
  const selectedConnectionId = ref<string | null>(null)
  const selectedConnection = ref<MediaConnectionListItem | null>(null)
  const discovered = ref<DiscoveredAccount[]>([])
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)

  async function refresh() {
    pending.value = true
    errorMessage.value = null
    try {
      summaries.value = await connectionService.listPlatformSummaries(organizationId.value)
      if (selectedConnectionId.value) {
        selectedConnection.value = await connectionService.getConnection(selectedConnectionId.value)
        discovered.value = await connectionService.listDiscovered(selectedConnectionId.value)
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      pending.value = false
    }
  }

  async function selectConnection(id: string | null) {
    selectedConnectionId.value = id
    if (!id) {
      selectedConnection.value = null
      discovered.value = []
      return
    }
    selectedConnection.value = await connectionService.getConnection(id)
    discovered.value = await connectionService.listDiscovered(id)
  }

  async function startConnection(platformId: string, teamId?: string, displayName?: string) {
    const conn = await connectionService.startConnection({
      platformId,
      teamId: teamId || team.value?.id || 'team-a',
      displayName,
      actorUserId: userId.value,
      organizationId: organizationId.value
    })
    await refresh()
    return conn
  }

  async function completeMockAuth(connectionId: string) {
    const conn = await connectionService.completeMockAuth({
      connectionId,
      actorUserId: userId.value
    })
    await selectConnection(connectionId)
    await refresh()
    return conn
  }

  async function discover(connectionId: string): Promise<DiscoverViaConnectionResult> {
    const result = await connectionService.discover(connectionId, userId.value)
    discovered.value = result.discovered
    await selectConnection(connectionId)
    return result
  }

  async function importSelected(
    connectionId: string,
    externalAccountIds: string[]
  ): Promise<ImportConnectionAccountsResult> {
    const result = await connectionService.importAccounts({
      connectionId,
      externalAccountIds,
      actorUserId: userId.value
    })
    discovered.value = await connectionService.listDiscovered(connectionId)
    await refresh()
    return result
  }

  async function disconnect(connectionId: string): Promise<MediaConnection> {
    const conn = await connectionService.disconnect(connectionId, userId.value)
    if (selectedConnectionId.value === connectionId) {
      await selectConnection(null)
    }
    await refresh()
    return conn
  }

  async function reauthorize(connectionId: string) {
    const conn = await connectionService.reauthorize(connectionId, userId.value)
    await refresh()
    return conn
  }

  return {
    summaries,
    selectedConnectionId,
    selectedConnection,
    discovered,
    pending,
    errorMessage,
    refresh,
    selectConnection,
    startConnection,
    completeMockAuth,
    discover,
    importSelected,
    disconnect,
    reauthorize
  }
}
