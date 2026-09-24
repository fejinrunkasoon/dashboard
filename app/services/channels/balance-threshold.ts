import type { ChannelBalanceThreshold } from '../../domain/finance'
import type { ProductOwnership } from '../../domain/common'

const STORAGE_KEY = 'ffj-channel-balance-thresholds'
const GLOBAL_DEFAULT_KEY = '__org_default__'

const defaults: ChannelBalanceThreshold = {
  id: 'cbt-org-default',
  channelId: null,
  absoluteBalanceBelow: 1000,
  daysOfRunwayBelow: 5,
  runwayLookbackDays: 7,
  enabledTags: ['INTERNAL'],
  severity: 'WARNING',
  updatedAt: new Date().toISOString()
}

const store = new Map<string, ChannelBalanceThreshold>()

function loadFromStorage() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as ChannelBalanceThreshold[]
    for (const row of parsed) {
      const key = row.channelId ?? GLOBAL_DEFAULT_KEY
      store.set(key, row)
    }
  } catch {
    // ignore corrupt storage
  }
}

function persist() {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...store.values()]))
}

let hydrated = false
function ensureHydrated() {
  if (hydrated) return
  hydrated = true
  loadFromStorage()
  if (!store.has(GLOBAL_DEFAULT_KEY)) {
    store.set(GLOBAL_DEFAULT_KEY, { ...defaults })
  }
}

export function getBalanceThreshold(channelId: string): ChannelBalanceThreshold {
  ensureHydrated()
  const channelRow = store.get(channelId)
  if (channelRow) return { ...channelRow }
  const org = store.get(GLOBAL_DEFAULT_KEY) ?? defaults
  return {
    ...org,
    id: `cbt-${channelId}`,
    channelId
  }
}

export function getOrgDefaultBalanceThreshold(): ChannelBalanceThreshold {
  ensureHydrated()
  return { ...(store.get(GLOBAL_DEFAULT_KEY) ?? defaults) }
}

export function updateOrgDefaultBalanceThreshold(
  patch: Partial<Pick<
    ChannelBalanceThreshold,
    'absoluteBalanceBelow' | 'daysOfRunwayBelow' | 'runwayLookbackDays' | 'enabledTags' | 'severity'
  >>
): ChannelBalanceThreshold {
  ensureHydrated()
  const current = store.get(GLOBAL_DEFAULT_KEY) ?? { ...defaults }
  const next: ChannelBalanceThreshold = {
    ...current,
    ...patch,
    channelId: null,
    id: 'cbt-org-default',
    updatedAt: new Date().toISOString()
  }
  if (patch.enabledTags) {
    next.enabledTags = [...patch.enabledTags] as ProductOwnership[]
  }
  store.set(GLOBAL_DEFAULT_KEY, next)
  persist()
  return { ...next }
}

export function updateBalanceThreshold(
  channelId: string,
  patch: Partial<Pick<
    ChannelBalanceThreshold,
    'absoluteBalanceBelow' | 'daysOfRunwayBelow' | 'runwayLookbackDays' | 'enabledTags' | 'severity'
  >>
): ChannelBalanceThreshold {
  ensureHydrated()
  const current = getBalanceThreshold(channelId)
  const next: ChannelBalanceThreshold = {
    ...current,
    ...patch,
    channelId,
    id: current.id.startsWith('cbt-') ? current.id : `cbt-${channelId}`,
    updatedAt: new Date().toISOString()
  }
  if (patch.enabledTags) {
    next.enabledTags = [...patch.enabledTags] as ProductOwnership[]
  }
  store.set(channelId, next)
  persist()
  return { ...next }
}
