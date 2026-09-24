/**
 * Preset media codes and allowed PlatformAssetType codes per media.
 * Dictionary must not invent arbitrary media APIs.
 */

export const PRESET_MEDIA_CODES = ['META', 'GOOGLE', 'TIKTOK', 'SNAPCHAT'] as const
export type PresetMediaCode = (typeof PRESET_MEDIA_CODES)[number]

/** Whitelist of asset-type codes allowed under each media. */
export const ASSET_TYPE_WHITELIST: Record<PresetMediaCode, readonly string[]> = {
  META: ['BUSINESS_MANAGER'],
  GOOGLE: ['MANAGER_ACCOUNT'],
  TIKTOK: ['BUSINESS_CENTER'],
  SNAPCHAT: ['ORGANIZATION']
}

/** Fixed media code → connector implKey (no UI cross-bind). */
export const MEDIA_CODE_TO_IMPL: Record<string, string> = {
  META: 'meta',
  GOOGLE: 'google',
  TIKTOK: 'tiktok',
  SNAPCHAT: 'snapchat'
}

export function isPresetMediaCode(code: string): code is PresetMediaCode {
  return (PRESET_MEDIA_CODES as readonly string[]).includes(code)
}

export function isAllowedAssetTypeCode(mediaCode: string, typeCode: string): boolean {
  if (!isPresetMediaCode(mediaCode)) return false
  return (ASSET_TYPE_WHITELIST[mediaCode] as readonly string[]).includes(typeCode)
}
