import type { MediaConnectorDefinition } from '../../domain/connector'
import { MEDIA_CODE_TO_IMPL } from '../../domain/media-presets'
import type { MediaConnectorAdapter } from './adapter'
import { metaConnectorAdapter } from './meta/adapter'
import {
  googleConnectorAdapter,
  snapchatConnectorAdapter,
  tiktokConnectorAdapter
} from './stubs'

/**
 * Code-registered connector implementations.
 * Media code maps to implKey 1:1 — UI cannot invent or cross-bind.
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
  }
]

const ADAPTERS: Record<string, MediaConnectorAdapter> = {
  meta: metaConnectorAdapter,
  google: googleConnectorAdapter,
  tiktok: tiktokConnectorAdapter,
  snapchat: snapchatConnectorAdapter
}

/** Impl keys that have real discovery catalogs (mock or live). */
export const DISCOVERY_READY_IMPL = new Set(['meta'])

export function getConnectorDefinition(implKey: string): MediaConnectorDefinition | undefined {
  return MEDIA_CONNECTOR_REGISTRY.find(item => item.implKey === implKey)
}

export function getConnectorAdapter(implKey: string): MediaConnectorAdapter | undefined {
  return ADAPTERS[implKey]
}

/** Resolve adapter from MediaPlatform.code (META → meta). */
export function getAdapterForMediaCode(mediaCode: string): MediaConnectorAdapter | undefined {
  const implKey = MEDIA_CODE_TO_IMPL[mediaCode.toUpperCase()]
  if (!implKey) return undefined
  return ADAPTERS[implKey]
}

export function isDiscoveryReadyForMediaCode(mediaCode: string): boolean {
  const implKey = MEDIA_CODE_TO_IMPL[mediaCode.toUpperCase()]
  return Boolean(implKey && DISCOVERY_READY_IMPL.has(implKey))
}
