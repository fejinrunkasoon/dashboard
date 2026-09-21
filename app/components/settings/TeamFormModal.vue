<script setup lang="ts">
import type { Member } from '~/domain'
import type { OrgTeamListItem } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  team?: OrgTeamListItem | null
  members: Member[]
}>()

const emit = defineEmits<{
  save: [payload: { code: string, name: string, leaderMemberId?: string | null }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const leaderMemberId = ref<string | undefined>(undefined)

const isEdit = computed(() => Boolean(props.team))

const leaderItems = computed(() => {
  const pool = props.team
    ? props.members.filter(m => m.teamId === props.team!.id || m.id === props.team!.leaderMemberId)
    : props.members.filter(m => m.status === 'ACTIVE')
  return [
    { label: '暂不指定', value: '' },
    ...pool.map(m => ({ label: `${m.name} (${m.code})`, value: m.id }))
  ]
})

watch(
  () => [open.value, props.team] as const,
  ([isOpen, team]) => {
    if (!isOpen) return
    if (team) {
      code.value = team.code
      name.value = team.name
      leaderMemberId.value = team.leaderMemberId ?? ''
    } else {
      code.value = ''
      name.value = ''
      leaderMemberId.value = ''
    }
  }
)

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (!isEdit.value && !code.value.trim()) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    emit('save', {
      code: code.value.trim(),
      name: name.value.trim(),
      leaderMemberId: leaderMemberId.value || null
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="space-y-1">
            <span class="font-semibold text-highlighted">
              {{ isEdit ? '编辑团队' : '新增团队' }}
            </span>
            <p class="text-xs text-muted">
              编制主数据。用量与需求请在团队中心查看。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Code" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：TEAM_D"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="团队名称" />
          </UFormField>
          <UFormField label="负责人">
            <USelect
              v-model="leaderMemberId"
              :items="leaderItems"
              placeholder="可选"
              class="w-full"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="open = false" />
            <UButton
              label="保存"
              :loading="saving"
              :disabled="!canSubmit"
              @click="onSubmit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
