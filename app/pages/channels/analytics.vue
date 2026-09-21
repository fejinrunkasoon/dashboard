<script setup lang="ts">
import type { SpendPeriod, ChannelScoreLevel } from '~/services'
import { channelAnalyticsService, mediaService } from '~/services'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

useSeoMeta({ title: '渠道分析' })

const mediaPlatforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })

const mediaOptions = [
  { label: '全部媒体', value: 'all' },
  ...mediaPlatforms.map(m => ({ label: m.name, value: m.id }))
]

const levelOptions = [
  { label: '全部等级', value: 'all' },
  { label: '优秀 (≥80)', value: 'EXCELLENT' as ChannelScoreLevel },
  { label: '良好 (60-79)', value: 'GOOD' as ChannelScoreLevel },
  { label: '需改进 (<60)', value: 'NEEDS_IMPROVEMENT' as ChannelScoreLevel }
]

const period = ref<SpendPeriod>('30D')
const customFrom = ref(shiftDate(MOCK_TODAY, -29))
const customTo = ref(MOCK_TODAY)
const selectedMedia = ref('all')
const selectedLevel = ref('all')

const pending = ref(true)
const errorMessage = ref<string | null>(null)

const scores = ref<any[]>([])
const trends = ref<any[]>([])
const distribution = ref<any[]>([])
const structure = ref<any[]>([])

async function loadAnalytics() {
  if (period.value === 'CUSTOM' && (!customFrom.value || !customTo.value)) return

  pending.value = true
  errorMessage.value = null
  
  try {
    const query = {
      period: period.value,
      startDate: period.value === 'CUSTOM' ? customFrom.value : undefined,
      endDate: period.value === 'CUSTOM' ? customTo.value : undefined,
      mediaId: selectedMedia.value === 'all' ? undefined : selectedMedia.value,
      level: selectedLevel.value === 'all' ? undefined : (selectedLevel.value as ChannelScoreLevel)
    }

    const [scoresData, trendsData, distributionData, structureData] = await Promise.all([
      channelAnalyticsService.getChannelScores(query),
      channelAnalyticsService.getChannelSpendTrend(query),
      channelAnalyticsService.getChannelSpendDistribution(query),
      channelAnalyticsService.getChannelAccountStructure(query)
    ])

    scores.value = scoresData
    trends.value = trendsData
    distribution.value = distributionData
    structure.value = structureData
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载分析数据失败'
  } finally {
    pending.value = false
  }
}

watch([period, customFrom, customTo, selectedMedia, selectedLevel], () => {
  void loadAnalytics()
}, { immediate: true })

const topScores = computed(() => scores.value.slice(0, 10))
const averageScore = computed(() => {
  if (!scores.value.length) return 0
  return Math.round(scores.value.reduce((sum, s) => sum + s.overall, 0) / scores.value.length)
})
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="渠道分析" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            v-if="scores.length"
            :label="`渠道 ${scores.length}`"
            variant="subtle"
            color="neutral"
          />
          <UBadge
            v-if="averageScore"
            :label="`平均评分 ${averageScore}`"
            variant="subtle"
            color="primary"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <ChannelsChannelCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <div class="flex flex-wrap items-center gap-3">
          <FiltersPeriodFilter
            v-model="period"
            v-model:custom-from="customFrom"
            v-model:custom-to="customTo"
            label="周期"
          />
          <FiltersQuickFilter v-model="selectedMedia" label="媒体" :options="mediaOptions" />
          <FiltersQuickFilter v-model="selectedLevel" label="评分等级" :options="levelOptions" />
        </div>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadAnalytics" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载渠道分析数据…
        </div>

        <template v-else>
          <div class="grid lg:grid-cols-2 gap-6">
            <ChannelsChannelScoreRadar :scores="topScores" />
            <ChannelsChannelRankingChart :scores="topScores" />
          </div>

          <ChannelsChannelSpendTrendChart :trends="trends" />

          <div class="grid lg:grid-cols-2 gap-6">
            <ChannelsChannelSpendDistributionChart :distribution="distribution" />
            <ChannelsChannelAccountStructureChart :structure="structure" />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
