<script setup lang="ts">



import type { TableColumn } from '@nuxt/ui'



import type { Member } from '~/domain'



import type { OrgTeamListItem } from '~/services'



import { organizationService } from '~/services'







useSeoMeta({ title: '组织与成员' })







const toast = useToast()







const q = ref('')



const teams = ref<OrgTeamListItem[]>([])



const allMembers = ref<Member[]>([])



const selectedTeamId = ref<string | null>(null)



const pending = ref(true)



const saving = ref(false)







const showTeamModal = ref(false)



const editingTeam = ref<OrgTeamListItem | null>(null)



const showMemberModal = ref(false)



const editingMember = ref<Member | null>(null)







const teamColumns: TableColumn<OrgTeamListItem>[] = [



  { accessorKey: 'name', header: '团队' },



  { accessorKey: 'code', header: 'Code' },



  { id: 'leader', header: '负责人' },



  { accessorKey: 'memberCount', header: '成员数' },



  { accessorKey: 'status', header: '状态' },



  { id: 'actions', header: '操作' }



]







const memberColumns: TableColumn<Member>[] = [



  { accessorKey: 'name', header: '姓名' },



  { accessorKey: 'code', header: 'Code' },



  { accessorKey: 'status', header: '状态' },



  { id: 'actions', header: '操作' }



]







async function refresh() {



  pending.value = true



  try {



    const [teamRows, memberRows] = await Promise.all([



      organizationService.getTeams(q.value),



      organizationService.getMembers()



    ])



    teams.value = teamRows



    allMembers.value = memberRows



    if (selectedTeamId.value && !teamRows.some(t => t.id === selectedTeamId.value)) {



      selectedTeamId.value = teamRows[0]?.id ?? null



    } else if (!selectedTeamId.value && teamRows.length) {



      selectedTeamId.value = teamRows[0]!.id



    }



  } finally {



    pending.value = false



  }



}







await refresh()







let searchTimer: ReturnType<typeof setTimeout> | null = null



watch(q, () => {



  if (searchTimer) clearTimeout(searchTimer)



  searchTimer = setTimeout(() => { refresh() }, 200)



})







const selectedTeam = computed(() =>



  teams.value.find(t => t.id === selectedTeamId.value) ?? null



)







const teamMembers = computed(() =>



  selectedTeamId.value



    ? allMembers.value.filter(m => m.teamId === selectedTeamId.value)



    : []



)







function statusColor(status: string) {



  return status === 'ACTIVE' ? 'success' : 'neutral'



}







function openCreateTeam() {



  editingTeam.value = null



  showTeamModal.value = true



}







function openEditTeam(team: OrgTeamListItem) {



  editingTeam.value = team



  showTeamModal.value = true



}







function openCreateMember() {



  editingMember.value = null



  showMemberModal.value = true



}







function openEditMember(member: Member) {



  editingMember.value = member



  showMemberModal.value = true



}







async function onSaveTeam(payload: { code: string, name: string, leaderMemberId?: string | null }) {



  if (saving.value) return



  saving.value = true



  try {



    if (editingTeam.value) {



      await organizationService.updateTeam(editingTeam.value.id, {



        name: payload.name,



        leaderMemberId: payload.leaderMemberId



      })



      toast.add({ title: '已更新团队', icon: 'i-lucide-check', color: 'success' })



    } else {



      const team = await organizationService.createTeam(payload)



      selectedTeamId.value = team.id



      toast.add({ title: '已创建团队', icon: 'i-lucide-check', color: 'success' })



    }



    showTeamModal.value = false



    await refresh()



  } catch (error) {



    toast.add({



      title: '保存失败',



      description: error instanceof Error ? error.message : '未知错误',



      icon: 'i-lucide-alert-circle',



      color: 'error'



    })



  } finally {



    saving.value = false



  }



}







async function onToggleTeamStatus(team: OrgTeamListItem) {



  const next = team.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'



  try {



    await organizationService.setTeamStatus(team.id, next)



    toast.add({



      title: next === 'ACTIVE' ? '已启用团队' : '已停用团队',



      description: `${team.name} → ${next}`,



      icon: 'i-lucide-check',



      color: 'success'



    })



    await refresh()



  } catch (error) {



    toast.add({



      title: '状态更新失败',



      description: error instanceof Error ? error.message : '未知错误',



      icon: 'i-lucide-alert-circle',



      color: 'error'



    })



  }



}







async function onSaveMember(payload: { code: string, name: string, teamId: string }) {



  if (saving.value) return



  saving.value = true



  try {



    if (editingMember.value) {



      await organizationService.updateMember(editingMember.value.id, {



        name: payload.name,



        teamId: payload.teamId



      })



      toast.add({ title: '已更新成员', icon: 'i-lucide-check', color: 'success' })



    } else {



      await organizationService.createMember(payload)



      toast.add({ title: '已创建成员', icon: 'i-lucide-check', color: 'success' })



    }



    selectedTeamId.value = payload.teamId



    showMemberModal.value = false



    await refresh()



  } catch (error) {



    toast.add({



      title: '保存失败',



      description: error instanceof Error ? error.message : '未知错误',



      icon: 'i-lucide-alert-circle',



      color: 'error'



    })



  } finally {



    saving.value = false



  }



}







async function onToggleMemberStatus(member: Member) {



  const next = member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'



  try {



    await organizationService.setMemberStatus(member.id, next)



    toast.add({



      title: next === 'ACTIVE' ? '已启用成员' : '已停用成员',



      description: `${member.name} → ${next}`,



      icon: 'i-lucide-check',



      color: 'success'



    })



    await refresh()



  } catch (error) {



    toast.add({



      title: '状态更新失败',



      description: error instanceof Error ? error.message : '未知错误',



      icon: 'i-lucide-alert-circle',



      color: 'error'



    })



  }



}



</script>







<template>



  <div class="space-y-6">



    <UPageCard



      title="组织与成员"



      description="管理团队编制与成员账号绑定。使用率、消耗与需求请在团队中心查看。"



      variant="naked"



      orientation="horizontal"



      class="mb-2"



    >



      <div class="flex flex-wrap gap-2 w-fit lg:ms-auto">



        <UButton



          label="新增成员"



          icon="i-lucide-user-plus"



          color="neutral"



          variant="outline"



          @click="openCreateMember"



        />



        <UButton



          label="新增团队"



          icon="i-lucide-plus"



          color="neutral"



          @click="openCreateTeam"



        />



      </div>



    </UPageCard>







    <UInput



      v-model="q"



      icon="i-lucide-search"



      placeholder="搜索团队..."



      class="w-full max-w-sm"



    />







    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">



      加载中…



    </div>







    <div v-else class="grid gap-6 lg:grid-cols-2">



      <div class="space-y-3">



        <div class="flex items-center justify-between gap-2 min-h-[3.25rem]">

          <h3 class="text-sm font-semibold text-highlighted">团队列表</h3>

        </div>



        <div



          v-if="!teams.length"



          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"



        >



          暂无团队。



        </div>



        <div v-else class="overflow-x-auto rounded-lg border border-default">



          <UTable :data="teams" :columns="teamColumns" class="shrink-0">



            <template #name-cell="{ row }">



              <button



                type="button"



                class="text-left font-medium text-highlighted hover:text-primary"



                :class="{ 'text-primary': row.original.id === selectedTeamId }"



                @click="selectedTeamId = row.original.id"



              >



                {{ row.original.name }}



              </button>



            </template>



            <template #code-cell="{ row }">



              <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>



            </template>



            <template #leader-cell="{ row }">



              <span class="text-sm text-muted">{{ row.original.leaderName ?? '—' }}</span>



            </template>



            <template #status-cell="{ row }">



              <UBadge



                :label="row.original.status"



                :color="statusColor(row.original.status)"



                variant="subtle"



                size="xs"



              />



            </template>



            <template #actions-cell="{ row }">



              <div class="flex items-center gap-1">



                <UButton



                  label="编辑"



                  size="xs"



                  color="neutral"



                  variant="ghost"



                  @click="openEditTeam(row.original)"



                />



                <UButton



                  :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"



                  size="xs"



                  :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"



                  variant="ghost"



                  @click="onToggleTeamStatus(row.original)"



                />



              </div>



            </template>



          </UTable>



        </div>



      </div>







      <div class="space-y-3">



        <div class="flex items-center justify-between gap-2 min-h-[3.25rem]">



          <div>



            <h3 class="text-sm font-semibold text-highlighted">



              {{ selectedTeam ? `${selectedTeam.name} · 成员` : '成员' }}



            </h3>



            <p class="text-xs text-muted">点击左侧团队查看成员，可调组与启停。</p>



          </div>



          <UButton



            label="添加成员"



            icon="i-lucide-user-plus"



            size="sm"



            color="neutral"



            variant="soft"



            :disabled="!selectedTeamId"



            @click="openCreateMember"



          />



        </div>



        <div



          v-if="!selectedTeamId"



          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"



        >



          请选择一个团队。



        </div>



        <div



          v-else-if="!teamMembers.length"



          class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"



        >



          该团队暂无成员。



        </div>



        <div v-else class="overflow-x-auto rounded-lg border border-default">



          <UTable :data="teamMembers" :columns="memberColumns" class="shrink-0">



            <template #code-cell="{ row }">



              <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>



            </template>



            <template #status-cell="{ row }">



              <UBadge



                :label="row.original.status"



                :color="statusColor(row.original.status)"



                variant="subtle"



                size="xs"



              />



            </template>



            <template #actions-cell="{ row }">



              <div class="flex items-center gap-1">



                <UButton



                  label="编辑"



                  size="xs"



                  color="neutral"



                  variant="ghost"



                  @click="openEditMember(row.original)"



                />



                <UButton



                  :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"



                  size="xs"



                  :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"



                  variant="ghost"



                  @click="onToggleMemberStatus(row.original)"



                />



              </div>



            </template>



          </UTable>



        </div>



      </div>



    </div>







    <SettingsTeamFormModal



      v-model:open="showTeamModal"



      :team="editingTeam"



      :members="allMembers"



      @save="onSaveTeam"



    />







    <SettingsMemberFormModal



      v-model:open="showMemberModal"



      :member="editingMember"



      :teams="teams"



      :default-team-id="selectedTeamId"



      @save="onSaveMember"



    />



  </div>



</template>



