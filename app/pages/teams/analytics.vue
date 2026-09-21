<script setup lang="ts">
import type { TeamSpendPeriod } from '~/services'
import { teamAnalyticsService } from '~/services'
import { MOCK_TODAY, shiftDate } from '~/utils/spend-aggregation'

useSeoMeta({ title: '团队分析' })

const period = ref<TeamSpendPeriod>('7D')
const customFrom = ref(shiftDate(MOCK_TODAY, -6))
const customTo = ref(MOCK_TODAY)

const pending = ref(true)
const errorMessage = ref<string | null>(null)

const matrix = ref<any>(null)
const rankings = ref<any[]>([])
const structure = ref<any[]>([])
const trends = ref<any[]>([])

async function loadAnalytics() {
  if (period.value === 'CUSTOM' && (!customFrom.value || !customTo.value)) return

  pending.value = true
  errorMessage.value = null
  
  try {
    const query = {
      period: period.value,
      startDate: period.value === 'CUSTOM' ? customFrom.value : undefined,
      endDate: period.value === 'CUSTOM' ? customTo.value : undefined
    }

    const [matrixData, rankingsData, structureData, trendsData] = await Promise.all([
      teamAnalyticsService.getTeamChannelMatrix(query),
      teamAnalyticsService.getTeamSpendRanking(query),
      teamAnalyticsService.getTeamAccountStructure(query),
      teamAnalyticsService.getTeamSpendTrend(query)
    ])

    matrix.value = matrixData
    rankings.value = rankingsData
    structure.value = structureData
    trends.value = trendsData
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载分析数据失败'
  } finally {
    pending.value = false
  }
}

watch([period, customFrom, customTo], () => {
  void loadAnalytics()
}, { immediate: true })
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="团队分析" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            v-if="rankings.length"
            :label="`团队 ${rankings.length}`"
            variant="subtle"
            color="neutral"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <TeamsTeamCenterNav />
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
        </div>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {{ errorMessage }}
          <UButton class="ms-3" size="xs" variant="soft" label="重试" @click="loadAnalytics" />
        </div>

        <div v-else-if="pending" class="flex items-center justify-center py-16 text-muted text-sm gap-2">
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
          加载团队分析数据…
        </div>

        <template v-else>
          <TeamsTeamChannelHeatmap :matrix="matrix" />

          <div class="grid lg:grid-cols-2 gap-6">
            <TeamsTeamSpendRankingChart :rankings="rankings" />
            <TeamsTeamAccountStructureChart :structure="structure" />
          </div>

          <TeamsTeamSpendTrendChart :trends="trends" />
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
