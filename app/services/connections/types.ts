import type {
  ConnectionAccount,
  MediaConnection
} from '../../domain/connection'
import type { DiscoveredAccount } from '../../domain/sync'
import type { AdAccount } from '../../domain/account'

export interface PlatformConnectionSummary {
  platformId: string
  platformCode: string
  platformName: string
  connectionCount: number
  accountCount: number
  connections: MediaConnectionListItem[]
}

export interface MediaConnectionListItem extends MediaConnection {
  teamName: string
  authorizedByName: string
  accountCount: number
}

export interface StartConnectionInput {
  platformId: string
  teamId: string
  displayName?: string
  actorUserId: string
  organizationId: string
}

export interface CompleteMockAuthInput {
  connectionId: string
  actorUserId: string
  providerIdentityName?: string
}

export interface DiscoverViaConnectionResult {
  jobId: string
  connectionId: string
  discovered: DiscoveredAccount[]
  stats: {
    discovered: number
    newCount: number
    alreadyInFfj: number
  }
}

export interface ImportConnectionAccountsInput {
  connectionId: string
  externalAccountIds: string[]
  actorUserId: string
  sourceChannelId?: string | null
  platformAssetId?: string | null
}

export interface ImportConnectionAccountsResult {
  imported: AdAccount[]
  linked: ConnectionAccount[]
  skippedExisting: number
}

export interface AssignUserToAccountInput {
  mediaAccountId: string
  userId: string
  actorUserId: string
}

export interface ConnectionService {
  listPlatformSummaries(organizationId: string): Promise<PlatformConnectionSummary[]>
  listConnections(organizationId: string, platformId?: string): Promise<MediaConnectionListItem[]>
  getConnection(id: string): Promise<MediaConnectionListItem | null>
  startConnection(input: StartConnectionInput): Promise<MediaConnection>
  /** Mock OAuth success — real OAuth callback will replace this. */
  completeMockAuth(input: CompleteMockAuthInput): Promise<MediaConnection>
  reauthorize(connectionId: string, actorUserId: string): Promise<MediaConnection>
  disconnect(connectionId: string, actorUserId: string): Promise<MediaConnection>
  discover(connectionId: string, actorUserId: string): Promise<DiscoverViaConnectionResult>
  listDiscovered(connectionId: string): Promise<DiscoveredAccount[]>
  importAccounts(input: ImportConnectionAccountsInput): Promise<ImportConnectionAccountsResult>
  listConnectionAccounts(connectionId: string): Promise<ConnectionAccount[]>
  setPrimarySyncSource(connectionAccountId: string, actorUserId: string): Promise<ConnectionAccount>
  assignUser(input: AssignUserToAccountInput): Promise<void>
  unassignUser(mediaAccountId: string, userId: string, actorUserId: string): Promise<void>
  listUserAccess(mediaAccountId: string): Promise<{ userId: string, displayName: string, assignmentType: string, assignedAt: string }[]>
}
