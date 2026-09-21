type QueryValue = string | number | undefined | null

function compactQuery(input: Record<string, QueryValue>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === '') continue
    result[key] = String(value)
  }
  return result
}

const FILTER_KEYS = [
  'keyword',
  'status',
  'mediaId',
  'channelId',
  'timezone',
  'abnormal',
  'inUse',
  'spend30d',
  'idle',
  'unfulfilled',
  'banned',
  'usage',
  'teamId',
  'priority',
  'expected',
  'progress'
] as const

type FilterKey = typeof FILTER_KEYS[number]

export interface CenterListQuery {
  keyword: string
  status: string
  mediaId: string
  channelId: string
  timezone: string
  abnormal: string
  inUse: string
  spend30d: string
  idle: string
  unfulfilled: string
  banned: string
  usage: string
  teamId: string
  priority: string
  expected: string
  progress: string
  page: number
  pageSize: number
}

const CHIP_LABEL: Record<FilterKey, string> = {
  keyword: '关键词',
  status: '状态',
  mediaId: '媒体',
  channelId: '渠道',
  timezone: '时区',
  abnormal: '异常',
  inUse: '使用中',
  spend30d: '30D消耗',
  idle: '闲置',
  unfulfilled: '未完成需求',
  banned: '封禁',
  usage: '使用率',
  teamId: '团队',
  priority: '优先级',
  expected: '期望',
  progress: '交付进度'
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * URL-synced list filters for channel and team centers.
 * Changing any filter except page resets page to 1.
 */
export function useCenterListFilters(pageSize = 20) {
  const route = useRoute()
  const router = useRouter()

  const query = computed<CenterListQuery>(() => {
    const page = Number(route.query.page)
    const q = route.query
    return {
      keyword: readString(q.keyword),
      status: readString(q.status),
      mediaId: readString(q.mediaId),
      channelId: readString(q.channelId),
      timezone: readString(q.timezone),
      abnormal: readString(q.abnormal),
      inUse: readString(q.inUse),
      spend30d: readString(q.spend30d),
      idle: readString(q.idle),
      unfulfilled: readString(q.unfulfilled),
      banned: readString(q.banned),
      usage: readString(q.usage),
      teamId: readString(q.teamId),
      priority: readString(q.priority),
      expected: readString(q.expected),
      progress: readString(q.progress),
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize
    }
  })

  const chips = computed(() => {
    const rows: { key: string, label: string }[] = []
    for (const key of FILTER_KEYS) {
      const value = query.value[key]
      if (!value) continue
      rows.push({ key, label: `${CHIP_LABEL[key]}: ${value}` })
    }
    return rows
  })

  function patch(partial: Partial<CenterListQuery>, resetPage = true) {
    const next = { ...query.value, ...partial }
    const touchesFilter = FILTER_KEYS.some(key => partial[key] !== undefined)
    if (resetPage && touchesFilter) next.page = 1
    const payload: Record<string, QueryValue> = {}
    for (const key of FILTER_KEYS) payload[key] = next[key]
    payload.page = next.page > 1 ? next.page : undefined
    void router.replace({ query: compactQuery(payload) })
  }

  function remove(key: string) {
    if ((FILTER_KEYS as readonly string[]).includes(key)) {
      patch({ [key]: '' } as Partial<CenterListQuery>)
    }
  }

  function clear() {
    const empty = Object.fromEntries(FILTER_KEYS.map(key => [key, ''])) as Partial<CenterListQuery>
    patch(empty)
  }

  return { query, chips, patch, remove, clear }
}
