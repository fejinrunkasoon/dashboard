<script setup lang="ts">
import type { Member, Team } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  member?: Member | null
  teams: Team[]
  defaultTeamId?: string | null
}>()

const emit = defineEmits<{
  save: [payload: { code: string, name: string, teamId: string }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const teamId = ref<string | undefined>(undefined)

const isEdit = computed(() => Boolean(props.member))

const teamItems = computed(() =>
  props.teams
    .filter(t => t.status === 'ACTIVE' || t.id === props.member?.teamId)
    .map(t => ({ label: `${t.name} (${t.code})`, value: t.id }))
)

watch(
  () => [open.value, props.member, props.defaultTeamId] as const,
  ([isOpen, member, defaultTeamId]) => {
    if (!isOpen) return
    if (member) {
      code.value = member.code
      name.value = member.name
      teamId.value = member.teamId
    } else {
      code.value = ''
      name.value = ''
      teamId.value = defaultTeamId ?? undefined
    }
  }
)

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (!isEdit.value && !code.value.trim()) return false
  if (!teamId.value) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value || saving.value || !teamId.value) return
  saving.value = true
  try {
    emit('save', {
      code: code.value.trim(),
      name: name.value.trim(),
      teamId: teamId.value
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
              {{ isEdit ? '编辑成员' : '新增成员' }}
            </span>
            <p class="text-xs text-muted">
              成员必须归属一个团队。调组会清除原团队负责人（若该成员是负责人）。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="编码" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：LI_MING"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="姓名" required>
            <UInput v-model="name" placeholder="成员姓名" />
          </UFormField>
          <UFormField label="所属团队" required>
            <USelect
              v-model="teamId"
              :items="teamItems"
              placeholder="选择团队"
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
