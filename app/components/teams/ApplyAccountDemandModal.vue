<script setup lang="ts">
import type { AccountDemandItem, DemandPriority, DemandRequirementFieldDef, ProductOwnership } from '~/domain'
import { getDemandRequirementFields } from '~/domain'
import type { CreateAccountDemandInput } from '~/services'
import { connectorService, demandService, mediaService, productService, teamService } from '~/services'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  teamId: string
  /** When set, edit existing DRAFT */
  demandId?: string | null
}>()

const emit = defineEmits<{
  saved: [payload: { demandId: string; submitted: boolean }]
}>()

const toast = useToast()
const saving = ref(false)

const products = await productService.getProducts()
const team = await teamService.getTeamById(props.teamId)
const members = await teamService.getMembers(props.teamId)

const mediaId = ref<string | undefined>()
/** Demand Product step: ownership only for now; maps to a stand-in productId on save. */
const productOwnership = ref<ProductOwnership | undefined>()
const quantity = ref(1)
const expectedDate = ref('')
const priority = ref<DemandPriority>('NORMAL')
const reason = ref('')
const requirements = ref<Record<string, string>>({})
const mediaOptions = ref<{ label: string, value: string }[]>([])
const mediaSpecificFields = ref<DemandRequirementFieldDef[]>([])

const priorityOptions = [
  { label: '低', value: 'LOW' },
  { label: '普通', value: 'NORMAL' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' }
]

/** No empty-string option: Reka/USelectMenu treats "" as "no value" and blocks selection. */
const productOptions: { label: string, value: ProductOwnership }[] = [
  { label: '自家', value: 'INTERNAL' },
  { label: '外接', value: 'EXTERNAL' }
]

function productIdForOwnership(ownership: ProductOwnership | undefined): string | null {
  if (!ownership) return null
  return products.find(item => item.ownershipType === ownership)?.id ?? null
}

function ownershipForProductId(id: string | null | undefined): ProductOwnership | undefined {
  if (!id) return undefined
  return products.find(item => item.id === id)?.ownershipType
}

async function loadActiveMediaOptions() {
  const platforms = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
  mediaOptions.value = platforms.map(item => ({ label: item.name, value: item.id }))
}

async function loadMediaSpecificFields(id: string | null | undefined) {
  if (!id) {
    mediaSpecificFields.value = []
    return
  }
  mediaSpecificFields.value = await connectorService.getDemandFields(id)
}

const requirementFields = computed(() =>
  getDemandRequirementFields(mediaId.value, mediaSpecificFields.value)
)

const canSubmit = computed(() => {
  if (!mediaId.value) return false
  if (!Number.isFinite(quantity.value) || quantity.value < 1) return false
  const tz = requirements.value.timezone
  return typeof tz === 'string' && tz.trim().length > 0
})

const requesterUserId = computed(() => {
  if (team?.leaderMemberId) return team.leaderMemberId
  return members[0]?.id ?? 'mem-unknown'
})

function resetForm() {
  mediaId.value = undefined
  productOwnership.value = undefined
  quantity.value = 1
  expectedDate.value = ''
  priority.value = 'NORMAL'
  reason.value = ''
  requirements.value = {}
  mediaSpecificFields.value = []
}

async function loadDraft(id: string) {
  const demand = await demandService.getDemandById(id)
  if (!demand || demand.status !== 'DRAFT') {
    resetForm()
    return
  }
  const items = await demandService.getDemandItems(id)
  const item: AccountDemandItem | undefined = items[0]
  expectedDate.value = demand.expectedDate ?? ''
  priority.value = demand.priority
  reason.value = demand.reason ?? ''
  if (item) {
    mediaId.value = item.mediaId
    await loadMediaSpecificFields(item.mediaId)
    productOwnership.value = ownershipForProductId(item.productId)
    quantity.value = item.requestedQuantity
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(item.requirements ?? {})) {
      if (value != null) next[key] = String(value)
    }
    requirements.value = next
  }
}

watch(mediaId, async (next, prev) => {
  if (next === prev) return
  await loadMediaSpecificFields(next)
  const fields = getDemandRequirementFields(next, mediaSpecificFields.value)
  const nextReqs: Record<string, string> = {}
  for (const field of fields) {
    if (requirements.value[field.key] != null) {
      nextReqs[field.key] = requirements.value[field.key]!
    }
  }
  requirements.value = nextReqs
})

watch(
  () => [open.value, props.demandId] as const,
  async ([isOpen, id]) => {
    if (!isOpen) return
    await loadActiveMediaOptions()
    if (id) await loadDraft(id)
    else resetForm()
  }
)

function buildRequirements(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of requirementFields.value) {
    const value = requirements.value[field.key]
    if (value != null && String(value).trim() !== '') {
      out[field.key] = String(value).trim()
    }
  }
  return out
}

async function save(submit: boolean) {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    const reqs = buildRequirements()
    const productId = productIdForOwnership(productOwnership.value)
    if (props.demandId) {
      await demandService.updateDraftDemand(props.demandId, {
        expectedDate: expectedDate.value || null,
        priority: priority.value,
        reason: reason.value || null,
        mediaId: mediaId.value,
        productId,
        requestedQuantity: quantity.value,
        requirements: reqs,
        submit
      })
      open.value = false
      emit('saved', { demandId: props.demandId, submitted: submit })
    } else {
      const input: CreateAccountDemandInput = {
        teamId: props.teamId,
        requesterUserId: requesterUserId.value,
        expectedDate: expectedDate.value || null,
        priority: priority.value,
        reason: reason.value || null,
        mediaId: mediaId.value!,
        productId,
        requestedQuantity: quantity.value,
        requirements: reqs,
        submit
      }
      const demand = await demandService.createDemand(input)
      open.value = false
      emit('saved', { demandId: demand.id, submitted: submit || demand.status === 'SUBMITTED' })
    }
  } catch (error) {
    toast.add({
      title: '保存失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
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
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-plus" class="size-5 text-primary" />
            <div>
              <p class="font-semibold text-highlighted">
                {{ demandId ? '编辑账户申请' : '申请账户' }}
              </p>
              <p class="text-xs text-muted">
                只表达需求，不能选择具体账户。调度分配属 STEP 7。
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="媒体" required>
            <USelectMenu
              v-model="mediaId"
              :items="mediaOptions"
              value-key="value"
              label-key="label"
              placeholder="选择媒体"
            />
          </UFormField>

          <UFormField label="数量" required>
            <UInput
              v-model.number="quantity"
              type="number"
              :min="1"
              step="1"
            />
          </UFormField>

          <UFormField label="产品" description="可选，先选自家 / 外接">
            <USelectMenu
              v-model="productOwnership"
              :items="productOptions"
              value-key="value"
              label-key="label"
              placeholder="选择自家 / 外接"
              :clear="true"
            />
          </UFormField>

          <template v-for="field in requirementFields" :key="field.key">
            <UFormField :label="field.label" :required="field.required">
              <USelectMenu
                v-if="field.type === 'select'"
                v-model="requirements[field.key]"
                :items="field.options ?? []"
                value-key="value"
                label-key="label"
                :placeholder="`选择 ${field.label}`"
              />
              <UInput
                v-else
                v-model="requirements[field.key]"
                :placeholder="field.label"
              />
            </UFormField>
          </template>

          <UFormField label="期望日期">
            <UInput v-model="expectedDate" type="date" />
          </UFormField>

          <UFormField label="优先级" required>
            <USelectMenu
              v-model="priority"
              :items="priorityOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>

          <UFormField label="申请原因">
            <UTextarea
              v-model="reason"
              placeholder="申请原因..."
              :rows="2"
              autoresize
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex items-center gap-2 justify-end flex-wrap">
            <UButton
              label="取消"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="open = false"
            />
            <UButton
              label="保存草稿"
              color="neutral"
              variant="soft"
              icon="i-lucide-save"
              :loading="saving"
              :disabled="!canSubmit"
              @click="save(false)"
            />
            <UButton
              label="提交申请"
              color="primary"
              icon="i-lucide-send"
              :loading="saving"
              :disabled="!canSubmit"
              @click="save(true)"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
