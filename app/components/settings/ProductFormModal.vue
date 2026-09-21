<script setup lang="ts">
import type { Customer, Product } from '~/domain'
import type { ProductOwnership } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  product?: Product | null
  customers: Customer[]
  defaultOwnership?: ProductOwnership
}>()

const emit = defineEmits<{
  save: [payload: {
    code: string
    name: string
    ownershipType: ProductOwnership
    customerId?: string | null
    note?: string | null
  }]
}>()

const saving = ref(false)
const code = ref('')
const name = ref('')
const ownershipType = ref<ProductOwnership>('INTERNAL')
const customerId = ref<string | undefined>(undefined)
const note = ref('')

const isEdit = computed(() => Boolean(props.product))

const ownershipItems = [
  { label: '自家产品', value: 'INTERNAL' },
  { label: '外接产品', value: 'EXTERNAL' }
]

const customerItems = computed(() =>
  props.customers
    .filter(c => c.status === 'ACTIVE' || c.id === props.product?.customerId)
    .map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))
)

watch(
  () => [open.value, props.product, props.defaultOwnership] as const,
  ([isOpen, product, defaultOwnership]) => {
    if (!isOpen) return
    if (product) {
      code.value = product.code
      name.value = product.name
      ownershipType.value = product.ownershipType
      customerId.value = product.customerId ?? undefined
      note.value = product.note ?? ''
    } else {
      code.value = ''
      name.value = ''
      ownershipType.value = defaultOwnership ?? 'INTERNAL'
      customerId.value = undefined
      note.value = ''
    }
  }
)

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (!isEdit.value && !code.value.trim()) return false
  if (ownershipType.value === 'EXTERNAL' && !customerId.value) return false
  return true
})

async function onSubmit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    emit('save', {
      code: code.value.trim(),
      name: name.value.trim(),
      ownershipType: ownershipType.value,
      customerId: ownershipType.value === 'EXTERNAL' ? customerId.value : null,
      note: note.value.trim() || null
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
              {{ isEdit ? '编辑产品' : '新增产品' }}
            </span>
            <p class="text-xs text-muted">
              code 创建后不可改。外接产品必须关联启用中的客户。
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Code" required>
            <UInput
              v-model="code"
              :disabled="isEdit"
              placeholder="例如：APP_C"
              class="font-mono"
            />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="name" placeholder="产品名称" />
          </UFormField>
          <UFormField label="归属" required>
            <USelect
              v-model="ownershipType"
              :items="ownershipItems"
              :disabled="isEdit"
              class="w-full"
            />
          </UFormField>
          <UFormField
            v-if="ownershipType === 'EXTERNAL'"
            label="关联客户"
            required
          >
            <USelect
              v-model="customerId"
              :items="customerItems"
              placeholder="选择客户"
              class="w-full"
            />
          </UFormField>
          <UFormField label="备注">
            <UTextarea v-model="note" :rows="2" placeholder="可选" />
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
