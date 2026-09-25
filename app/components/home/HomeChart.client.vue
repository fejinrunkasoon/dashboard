<script setup lang="ts">
import { parseISO } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { DashboardSpendTrendPoint } from '~/services'
import type { Period } from '~/types'
import { formatPeriodBucketLabel, periodBucketStart } from '~/utils/spend-aggregation'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = withDefaults(defineProps<{
  spendTrend: DashboardSpendTrendPoint[]
  period?: Period
}>(), {
  period: 'daily'
})

const { width } = useElementSize(cardRef)

const SERIES_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#ec4899',
  '#22c55e',
  '#a855f7',
  '#f59e0b'
]

type ChartRow = {
  date: Date
  dateStr: string
  label: string
  total: number
  byMedia: Record<string, number>
}

const mediaSeries = computed(() => {
  const map = new Map<string, string>()
  for (const point of props.spendTrend) {
    map.set(point.mediaId, point.mediaName)
  }
  return [...map.entries()].map(([id, name], index) => ({
    id,
    name,
    color: SERIES_COLORS[index % SERIES_COLORS.length]!
  }))
})

const data = computed<ChartRow[]>(() => {
  type Bucket = {
    dateStr: string
    coveredFrom: string
    coveredTo: string
    total: number
    byMedia: Record<string, number>
  }
  const byBucket = new Map<string, Bucket>()

  for (const point of props.spendTrend) {
    const key = periodBucketStart(point.date, props.period)
    let row = byBucket.get(key)
    if (!row) {
      row = {
        dateStr: key,
        coveredFrom: point.date,
        coveredTo: point.date,
        total: 0,
        byMedia: {}
      }
      byBucket.set(key, row)
    }
    if (point.date < row.coveredFrom) row.coveredFrom = point.date
    if (point.date > row.coveredTo) row.coveredTo = point.date
    row.byMedia[point.mediaId] = (row.byMedia[point.mediaId] ?? 0) + point.spend
    row.total += point.spend
  }

  return [...byBucket.values()]
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .map(row => ({
      date: parseISO(row.dateStr),
      dateStr: row.dateStr,
      label: formatPeriodBucketLabel(props.period, row.dateStr, row.coveredFrom, row.coveredTo),
      total: row.total,
      byMedia: row.byMedia
    }))
})

const x = (_: ChartRow, i: number) => i

const total = computed(() => data.value.reduce((acc, row) => acc + row.total, 0))

const formatNumber = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format

const xTicks = (i: number) => {
  const row = data.value[i]
  if (!row) return ''
  // Few buckets (week/month): show every tick. Dense daily: skip ends to reduce clutter.
  if (data.value.length > 8 && (i === 0 || i === data.value.length - 1)) return ''
  return row.label
}

const template = (d: ChartRow) => `${d.label}: ${formatNumber(d.total)}`

function yForMedia(mediaId: string) {
  return (d: ChartRow) => d.byMedia[mediaId] ?? 0
}
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">
            消耗趋势（媒体消耗）
          </p>
          <p class="text-3xl text-highlighted font-semibold">
            {{ formatNumber(total) }}
          </p>
        </div>

        <div class="flex items-center gap-3 text-xs text-muted flex-wrap">
          <span
            v-for="media in mediaSeries"
            :key="media.id"
            class="flex items-center gap-1.5"
          >
            <span
              class="inline-block size-2.5 rounded-full"
              :style="{ backgroundColor: media.color }"
            />
            {{ media.name }}
          </span>
        </div>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      :margin="{ left: -5, right: -5 }"
      class="h-96"
      :width="width"
    >
      <template v-for="media in mediaSeries" :key="media.id">
        <VisLine
          :x="x"
          :y="yForMedia(media.id)"
          :color="media.color"
        />
        <VisArea
          :x="x"
          :y="yForMedia(media.id)"
          :color="media.color"
          :opacity="0.05"
        />
      </template>

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
