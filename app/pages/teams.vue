<script setup lang="ts">
import type { Team, TeamMember } from '~/types'

const { data: teams } = await useFetch<Team[]>('/api/teams')
const { data: members } = await useFetch<TeamMember[]>('/api/members')

const q = ref('')
const selectedTeam = ref<Team | null>(null)
const showMembersModal = ref(false)

const filteredTeams = computed(() => {
  if (!q.value) return teams.value ?? []
  const regex = new RegExp(q.value, 'i')
  return (teams.value ?? []).filter(t =>
    regex.test(t.name) || regex.test(t.leaderName)
  )
})

const teamMembers = computed(() => {
  if (!selectedTeam.value || !members.value) return []
  return members.value.filter(m => m.teamId === selectedTeam.value!.id)
})

function openMembers(team: Team) {
  selectedTeam.value = team
  showMembersModal.value = true
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="团队中心" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UInput
            v-model="q"
            icon="i-lucide-search"
            placeholder="搜索团队..."
            class="w-40 lg:w-56"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="p-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard
          v-for="team in filteredTeams"
          :key="team.id"
          :ui="{ body: 'p-4 sm:p-4' }"
          class="cursor-pointer hover:shadow-sm transition-shadow"
          @click="openMembers(team)"
        >
          <template #header>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-users" class="text-primary size-5" />
                <span class="font-semibold text-highlighted">{{ team.name }}</span>
              </div>
              <UBadge
                :label="`使用率 ${team.usageRate}%`"
                :color="team.usageRate >= 80 ? 'success' : team.usageRate >= 60 ? 'warning' : 'error'"
                variant="subtle"
                size="xs"
              />
            </div>
          </template>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">负责人</span>
              <span class="text-highlighted font-medium">{{ team.leaderName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">成员数</span>
              <span class="text-highlighted font-medium">{{ team.memberCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">总账户</span>
              <span class="text-highlighted font-medium">{{ team.totalAccounts }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">活跃/闲置</span>
              <span class="text-highlighted font-medium">{{ team.activeAccounts }} / {{ team.idleAccounts }}</span>
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
              <span :class="team.unmetDemand > 0 ? 'text-warning font-medium' : 'text-highlighted font-medium'">{{ team.unmetDemand }} 个账户</span>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-end px-4 py-3">
              <UButton
                label="查看成员"
                icon="i-lucide-user"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.stop="openMembers(team)"
              />
            </div>
          </template>
        </UCard>
      </div>

      <div v-if="!filteredTeams.length" class="text-center text-dimmed py-8">
        暂无匹配的团队
      </div>
    </div>

    <UModal v-model:open="showMembersModal">
      <template #content>
        <UCard v-if="selectedTeam">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-users" class="size-5 text-primary" />
              <div>
                <p class="font-semibold text-highlighted">{{ selectedTeam.name }}</p>
                <p class="text-xs text-muted">负责人: {{ selectedTeam.leaderName }} · {{ selectedTeam.memberCount }} 名成员</p>
              </div>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="member in teamMembers"
              :key="member.id"
              class="border-b border-default pb-3 last:border-b-0 last:pb-0"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-highlighted text-sm">{{ member.name }}</span>
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="`使用率 ${member.usageRate}%`"
                    :color="member.usageRate >= 80 ? 'success' : member.usageRate >= 60 ? 'warning' : 'error'"
                    variant="subtle"
                    size="xs"
                  />
                  <UBadge
                    v-if="member.banRate > 0"
                    :label="`封户率 ${member.banRate}%`"
                    :color="member.banRate > 10 ? 'error' : 'warning'"
                    variant="subtle"
                    size="xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-4 gap-2 text-xs text-muted">
                <div>
                  <p class="text-muted">账户</p>
                  <p class="text-highlighted font-medium">{{ member.totalAccounts }} ({{ member.activeAccounts }}活/{{ member.idleAccounts }}闲)</p>
                </div>
                <div>
                  <p class="text-muted">今日消耗</p>
                  <p class="text-highlighted font-medium">{{ formatCurrency(member.consumedToday) }}</p>
                </div>
                <div>
                  <p class="text-muted">7日消耗</p>
                  <p class="text-highlighted font-medium">{{ formatCurrency(member.consumed7d) }}</p>
                </div>
                <div>
                  <p class="text-muted">30日消耗</p>
                  <p class="text-highlighted font-medium">{{ formatCurrency(member.consumed30d) }}</p>
                </div>
              </div>
            </div>

            <div v-if="!teamMembers.length" class="text-center text-dimmed py-4">
              暂无成员数据
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </UDashboardPanel>
</template>