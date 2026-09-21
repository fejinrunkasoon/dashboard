import type { MediaConnectorDefinition } from '../../domain/connector'

/**
 * Code-registered connector implementations.
 * Users bind these to MediaPlatform; they cannot invent new implKeys in the UI.
 */
export const MEDIA_CONNECTOR_REGISTRY: MediaConnectorDefinition[] = [
  {
    implKey: 'meta',
    displayName: 'Meta Connector',
    capabilities: ['DISCOVERY', 'SPEND', 'STATUS']
  },
  {
    implKey: 'google',
    displayName: 'Google Connector',
    capabilities: ['DISCOVERY', 'SPEND', 'STATUS']
  },
  {
    implKey: 'tiktok',
    displayName: 'TikTok Connector',
    capabilities: ['DISCOVERY', 'SPEND', 'STATUS']
  },
  {
    implKey: 'snapchat',
    displayName: 'Snapchat Connector',
    capabilities: ['DISCOVERY', 'SPEND', 'STATUS']
  },
  {
    implKey: 'generic',
    displayName: 'Generic Adapter (config only)',
    capabilities: []
  }
]

export function getConnectorDefinition(implKey: string): MediaConnectorDefinition | undefined {
  return MEDIA_CONNECTOR_REGISTRY.find(item => item.implKey === implKey)
}
