import type {
  ConnectablePlatform,
  PlatformApp,
  PlatformAppUpsertInput
} from '../../domain/platform-app'

export interface PlatformAppService {
  listApps(): Promise<PlatformApp[]>
  getAppByMediaId(mediaId: string): Promise<PlatformApp | null>
  getDefaultApp(mediaId: string): Promise<PlatformApp | null>
  upsertApp(input: PlatformAppUpsertInput): Promise<PlatformApp>
  /** Platforms the current tenant can connect (enabled media + configured app). */
  listConnectablePlatforms(): Promise<ConnectablePlatform[]>
}
