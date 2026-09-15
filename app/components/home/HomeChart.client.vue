<script setup lang="ts">
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip, VisStackedBar } from '@unovis/vue'
import type { Period, Range, ConsumptionRecord, Media } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  meta: number
  google: number
  tiktok: number
  total: number
}

const { width } = useElementSize(cardRef)

const { data: consumptionData } = await useFetch<ConsumptionRecord[]>('/api/consumption', {
  query: { days: 30 }
})

const data = ref<DataRecord[]>([])

watch([() => props.period, () => props.range, consumptionData], () => {
  const dates = ({
    daily: eachDayOfInterval,
    weekly: eachWeekOfInterval,
    monthly: eachMonthOfInterval
  } as Record<Period, typeof eachDayOfInterval>)[props.period](props.range)

  const records = consumptionData.value ?? []

  data.value = dates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayRecords = records.filter(r => r.date === dateStr)

    const meta = dayRecords.filter(r => r.media === 'Meta').reduce((sum, r) => sum + r.amount, 0)
    const google = dayRecords.filter(r => r.media === 'Google').reduce((sum, r) => sum + r.amount, 0)
    const tiktok = dayRecords.filter(r => r.media === 'TikTok').reduce((sum, r) => sum + r.amount, 0)

    return { date, meta, google, tiktok, total: meta + google + tiktok }
  })
}, { immediate: true })

const x = (_: DataRecord, i: number) => i
const yTotal = (d: DataRecord) => d.total

const total = computed(() => data.value.reduce((acc, { total }) => acc + total, 0))

const formatNumber = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }
  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${formatNumber(d.total)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">
            消耗趋势
          </p>
          <p class="text-3xl text-highlighted font-semibold">
            {{ formatNumber(total) }}
          </p>
        </div>

        <div class="flex items-center gap-3 text-xs text-muted">
          <span class="flex items-center gap-1.5">
            <span class="inline-block size-2.5 rounded-full bg-blue-500" />
            Meta
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block size-2.5 rounded-full bg-red-500" />
            Google
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block size-2.5 rounded-full bg-pink-500" />
            TikTok
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
      <VisLine
        :x="x"
        :y="(d: DataRecord) => d.meta"
        color="#3b82f6"
      />
      <VisArea
        :x="x"
        :y="(d: DataRecord) => d.meta"
        color="#3b82f6"
        :opacity="0.05"
      />

      <VisLine
        :x="x"
        :y="(d: DataRecord) => d.google"
        color="#ef4444"
      />
      <VisArea
        :x="x"
        :y="(d: DataRecord) => d.google"
        color="#ef4444"
        :opacity="0.05"
      />

      <VisLine
        :x="x"
        :y="(d: DataRecord) => d.tiktok"
        color="#ec4899"
      />
      <VisArea
        :x="x"
        :y="(d: DataRecord) => d.tiktok"
        color="#ec4899"
        :opacity="0.05"
      />

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