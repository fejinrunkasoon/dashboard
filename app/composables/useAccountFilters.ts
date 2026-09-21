import type { AccountAssetStatus, AccountQuery, ProductOwnership, SortOrder } from '~/domain'

type QueryPrimitive = string | number | boolean | undefined | null
type QueryValue = QueryPrimitive | QueryPrimitive[]

function asArray(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return String(value).split(',').map(part => part.trim()).filter(Boolean)
}

function asNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  if (value == null || value === '') return undefined
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return undefined
}

function compactQuery(input: Record<string, QueryValue>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      if (!value.length) continue
      result[key] = value.map(String)
      continue
    }
    result[key] = String(value)
  }
  return result
}

/**
 * Sync AccountQuery fields with the route query string.
 * Changing any filter (except page itself) resets page to 1.
 */
export function useAccountFilters(defaults: AccountQuery = {}) {
  const route = useRoute()
  const router = useRouter()

  const query = computed<AccountQuery>(() => {
    const q = route.query
    return {
      keyword: typeof q.keyword === 'string' ? q.keyword : defaults.keyword,
      mediaIds: asArray(q.mediaIds).length ? asArray(q.mediaIds) : defaults.mediaIds,
      channelIds: asArray(q.channelIds).length ? asArray(q.channelIds) : defaults.channelIds,
      platformAssetIds: asArray(q.platformAssetIds).length
        ? asArray(q.platformAssetIds)
        : defaults.platformAssetIds,
      timezone: typeof q.timezone === 'string' ? q.timezone : defaults.timezone,
      teamIds: asArray(q.teamIds).length ? asArray(q.teamIds) : defaults.teamIds,
      memberIds: asArray(q.memberIds).length ? asArray(q.memberIds) : defaults.memberIds,
      managerIds: asArray(q.managerIds).length ? asArray(q.managerIds) : defaults.managerIds,
      productOwnership: (typeof q.productOwnership === 'string'
        ? q.productOwnership
        : defaults.productOwnership) as ProductOwnership | undefined,
      productIds: asArray(q.productIds).length ? asArray(q.productIds) : defaults.productIds,
      customerIds: asArray(q.customerIds).length ? asArray(q.customerIds) : defaults.customerIds,
      serviceFeePolicyIds: asArray(q.serviceFeePolicyIds).length
        ? asArray(q.serviceFeePolicyIds)
        : defaults.serviceFeePolicyIds,
      assetStatuses: (asArray(q.assetStatuses).length
        ? asArray(q.assetStatuses)
        : defaults.assetStatuses) as AccountAssetStatus[] | undefined,
      mediaStatuses: asArray(q.mediaStatuses).length
        ? asArray(q.mediaStatuses) as AccountQuery['mediaStatuses']
        : defaults.mediaStatuses,
      apiAccessStatuses: asArray(q.apiAccessStatuses).length
        ? asArray(q.apiAccessStatuses) as AccountQuery['apiAccessStatuses']
        : defaults.apiAccessStatuses,
      spendLimitMin: asNumber(q.spendLimitMin) ?? defaults.spendLimitMin,
      spendLimitMax: asNumber(q.spendLimitMax) ?? defaults.spendLimitMax,
      amountSpentMin: asNumber(q.amountSpentMin) ?? defaults.amountSpentMin,
      amountSpentMax: asNumber(q.amountSpentMax) ?? defaults.amountSpentMax,
      remainingLimitMin: asNumber(q.remainingLimitMin) ?? defaults.remainingLimitMin,
      remainingLimitMax: asNumber(q.remainingLimitMax) ?? defaults.remainingLimitMax,
      periodSpendMin: asNumber(q.periodSpendMin) ?? defaults.periodSpendMin,
      periodSpendMax: asNumber(q.periodSpendMax) ?? defaults.periodSpendMax,
      hasNote: asBoolean(q.hasNote) ?? defaults.hasNote,
      receivedFrom: typeof q.receivedFrom === 'string' ? q.receivedFrom : defaults.receivedFrom,
      receivedTo: typeof q.receivedTo === 'string' ? q.receivedTo : defaults.receivedTo,
      spendRange: (typeof q.spendFrom === 'string' && typeof q.spendTo === 'string')
        ? { from: q.spendFrom, to: q.spendTo }
        : defaults.spendRange,
      page: asNumber(q.page) ?? defaults.page ?? 1,
      pageSize: asNumber(q.pageSize) ?? defaults.pageSize ?? 20,
      sortBy: typeof q.sortBy === 'string' ? q.sortBy : defaults.sortBy,
      sortOrder: (typeof q.sortOrder === 'string' ? q.sortOrder : defaults.sortOrder) as SortOrder | undefined
    }
  })

  const activeChips = computed(() => {
    const chips: { key: string, label: string }[] = []
    const q = query.value
    if (q.keyword) chips.push({ key: 'keyword', label: `关键词: ${q.keyword}` })
    if (q.mediaIds?.length) chips.push({ key: 'mediaIds', label: `媒体: ${q.mediaIds.length}` })
    if (q.channelIds?.length) chips.push({ key: 'channelIds', label: `渠道: ${q.channelIds.length}` })
    if (q.assetStatuses?.length) chips.push({ key: 'assetStatuses', label: `状态: ${q.assetStatuses.join(',')}` })
    if (q.productOwnership) chips.push({ key: 'productOwnership', label: `归属: ${q.productOwnership}` })
    if (q.hasNote === true) chips.push({ key: 'hasNote', label: '有备注' })
    if (q.hasNote === false) chips.push({ key: 'hasNote', label: '无备注' })
    if (q.spendLimitMin != null || q.spendLimitMax != null) {
      chips.push({
        key: 'spendLimit',
        label: `额度: ${q.spendLimitMin ?? '—'}–${q.spendLimitMax ?? '—'}`
      })
    }
    if (q.amountSpentMin != null || q.amountSpentMax != null) {
      chips.push({
        key: 'amountSpent',
        label: `已花费: ${q.amountSpentMin ?? '—'}–${q.amountSpentMax ?? '—'}`
      })
    }
    if (q.timezone) chips.push({ key: 'timezone', label: `时区: ${q.timezone}` })
    if (q.mediaStatuses?.length) {
      chips.push({ key: 'mediaStatuses', label: `媒体状态: ${q.mediaStatuses.join(',')}` })
    }
    if (q.apiAccessStatuses?.length) {
      chips.push({ key: 'apiAccessStatuses', label: `API: ${q.apiAccessStatuses.join(',')}` })
    }
    if (q.spendRange) {
      chips.push({
        key: 'spendRange',
        label: `周期: ${q.spendRange.from} → ${q.spendRange.to}`
      })
    }
    return chips
  })

  async function setFilters(patch: Partial<AccountQuery>, options?: { resetPage?: boolean }) {
    const resetPage = options?.resetPage ?? true
    const next: AccountQuery = {
      ...query.value,
      ...patch
    }

    if (resetPage && patch.page == null) {
      next.page = 1
    }

    await router.replace({
      query: compactQuery({
        keyword: next.keyword,
        mediaIds: next.mediaIds,
        channelIds: next.channelIds,
        platformAssetIds: next.platformAssetIds,
        timezone: next.timezone,
        teamIds: next.teamIds,
        memberIds: next.memberIds,
        managerIds: next.managerIds,
        productOwnership: next.productOwnership,
        productIds: next.productIds,
        customerIds: next.customerIds,
        serviceFeePolicyIds: next.serviceFeePolicyIds,
        assetStatuses: next.assetStatuses,
        mediaStatuses: next.mediaStatuses,
        apiAccessStatuses: next.apiAccessStatuses,
        spendLimitMin: next.spendLimitMin,
        spendLimitMax: next.spendLimitMax,
        amountSpentMin: next.amountSpentMin,
        amountSpentMax: next.amountSpentMax,
        remainingLimitMin: next.remainingLimitMin,
        remainingLimitMax: next.remainingLimitMax,
        periodSpendMin: next.periodSpendMin,
        periodSpendMax: next.periodSpendMax,
        hasNote: next.hasNote,
        receivedFrom: next.receivedFrom,
        receivedTo: next.receivedTo,
        spendFrom: next.spendRange?.from,
        spendTo: next.spendRange?.to,
        page: next.page && next.page > 1 ? next.page : undefined,
        pageSize: next.pageSize && next.pageSize !== 20 ? next.pageSize : undefined,
        sortBy: next.sortBy,
        sortOrder: next.sortOrder
      })
    })
  }

  async function clearFilters() {
    await router.replace({ query: {} })
  }

  async function removeFilter(key: string) {
    if (key === 'spendLimit') {
      await setFilters({ spendLimitMin: undefined, spendLimitMax: undefined })
      return
    }
    if (key === 'amountSpent') {
      await setFilters({ amountSpentMin: undefined, amountSpentMax: undefined })
      return
    }
    if (key === 'spendRange') {
      await setFilters({ spendRange: undefined })
      return
    }
    await setFilters({ [key]: undefined } as Partial<AccountQuery>)
  }

  return {
    query,
    activeChips,
    setFilters,
    clearFilters,
    removeFilter
  }
}
