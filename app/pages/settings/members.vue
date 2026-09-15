<script setup lang="ts">
import type { Team, TeamMember } from '~/types'

const { data: teams } = await useFetch<Team[]>('/api/teams')
const { data: members } = await useFetch<TeamMember[]>('/api/members')

const selectedTeam = ref<Team | null>(null)
const q = ref('')

const filteredTeams = computed(() => {
  if (!q.value) return teams.value ?? []
  const regex = new RegExp(q.value, 'i')
  return (teams.value ?? []).filter(t => regex.test(t.name) || regex.test(t.leaderName))
})

const teamMembers = computed(() => {
  if (!selectedTeam.value || !members.value) return []
  return members.value.filter(m => m.teamId === selectedTeam.value!.id)
})

const formatCurrency = (value: number) => `$${value.toLocaleString()}`

const usageRateColor = (rate: number) => {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warning'
  return 'error'
}

function selectTeam(team: Team) {
  selectedTeam.value = selectedTeam.value?.id === team.id ? null : team
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="团队管理"
      description="管理内部团队和成员，查看使用率、消耗和需求情况。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="新增团队"
        icon="i-lucide-plus"
        color="neutral"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UInput
      v-model="q"
      icon="i-lucide-search"
      placeholder="搜索团队..."
      class="w-full max-w-sm"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-for="team in filteredTeams"
        :key="team.id"
        :ui="{ body: 'p-4 sm:p-4' }"
        class="cursor-pointer transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': selectedTeam?.id === team.id }"
        @click="selectTeam(team)"
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="text-primary size-5" />
              <span class="font-semibold text-highlighted">{{ team.name }}</span>
            </div>
            <UBadge
              :label="`使用率 ${team.usageRate}%`"
              :color="usageRateColor(team.usageRate)"
              variant="subtle"
              size="xs"
            />
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">负责人</span>
            <span class="text-highlighted">{{ team.leaderName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">成员数</span>
            <span class="text-highlighted">{{ team.memberCount }}</span>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <span class="text-muted">总账户 / 活跃 / 闲置</span>
            <span class="text-highlighted font-medium">{{ team.totalAccounts }} / {{ team.activeAccounts }} / {{ team.idleAccounts }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">封户率</span>
            <span :class="team.banRate > 10 ? 'text-error font-medium' : 'text-highlighted font-medium'">{{ team.banRate }}%</span>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <span class="text-muted">总消耗</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(team.consumed) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">自家 / 外接</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(team.internalConsumed) }} / {{ formatCurrency(team.externalConsumed) }}</span>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <span class="text-muted">待满足需求</span>
            <span :class="team.unmetDemand > 0 ? 'text-warning font-medium' : 'text-highlighted font-medium'">
              {{ team.unmetDemand > 0 ? `${team.unmetDemand} 个账户` : '无' }}
            </span>
          </div>
        </div>
      </UCard>
    </div>

    <UModal :open="!!selectedTeam" @update:open="selectedTeam = null">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-5" />
              <span class="font-semibold">{{ selectedTeam?.name }} — 成员列表</span>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-for="member in teamMembers"
              :key="member.id"
              class="p-3 rounded-lg border border-default"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <UAvatar :alt="member.name" size="sm" />
                  <span class="font-medium text-highlighted text-sm">{{ member.name }}</span>
                </div>
                <UBadge
                  :label="`使用率 ${member.usageRate}%`"
                  :color="usageRateColor(member.usageRate)"
                  variant="subtle"
                  size="xs"
                />
              </div>

              <div class="grid grid-cols-4 gap-2 text-xs text-muted">
                <div>
                  <p class="text-highlighted font-medium text-sm">{{ member.totalAccounts }}</p>
                  <p>总账户</p>
                </div>
                <div>
                  <p class="text-highlighted font-medium text-sm">{{ member.activeAccounts }} / {{ member.idleAccounts }}</p>
                  <p>活跃/闲置</p>
                </div>
                <div>
                  <p class="text-highlighted font-medium text-sm">{{ formatCurrency(member.consumed30d) }}</p>
                  <p>30日消耗</p>
                </div>
                <div>
                  <p :class="member.banRate > 10 ? 'text-error font-medium text-sm' : 'text-highlighted font-medium text-sm'">{{ member.banRate }}%</p>
                  <p>封户率</p>
                </div>
              </div>
            </div>

            <div
              v-if="!teamMembers.length"
              class="text-center text-dimmed py-4"
            >
              暂无成员
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>