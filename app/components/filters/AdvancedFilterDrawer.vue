<script setup lang="ts">
import type { AccountAssetStatus, ProductOwnership } from '~/domain'

const open = defineModel<boolean>('open', { default: false })

const mediaIds = defineModel<string[]>('mediaIds', { default: () => [] })
const channelIds = defineModel<string[]>('channelIds', { default: () => [] })
const assetStatuses = defineModel<AccountAssetStatus[]>('assetStatuses', { default: () => [] })
const productOwnership = defineModel<ProductOwnership | undefined>('productOwnership')
const hasNote = defineModel<boolean | undefined>('hasNote')
const spendLimitMin = defineModel<number | undefined>('spendLimitMin')
const spendLimitMax = defineModel<number | undefined>('spendLimitMax')
const amountSpentMin = defineModel<number | undefined>('amountSpentMin')
const amountSpentMax = defineModel<number | undefined>('amountSpentMax')

defineProps<{
  mediaOptions: { label: string, value: string }[]
  channelOptions: { label: string, value: string }[]
}>()

const emit = defineEmits<{
  apply: []
  reset: []
}>()

const assetStatusOptions = [
  { label: '可用', value: 'AVAILABLE' },
  { label: '已分配', value: 'ASSIGNED' },
  { label: '使用中', value: 'IN_USE' },
  { label: '闲置', value: 'IDLE' },
  { label: '停用', value: 'DISABLED' },
  { label: '归档', value: 'ARCHIVED' }
]

const ownershipOptions = [
  { label: '全部归属', value: 'all' },
  { label: '自家 INTERNAL', value: 'INTERNAL' },
  { label: '外接 EXTERNAL', value: 'EXTERNAL' }
]

const noteOptions = [
  { label: '不限', value: 'all' },
  { label: '有备注', value: 'true' },
  { label: '无备注', value: 'false' }
]

const ownershipSelect = computed({
  get: () => productOwnership.value ?? 'all',
  set: (value: string) => {
    productOwnership.value = value === 'all' ? undefined : value as ProductOwnership
  }
})

const noteSelect = computed({
  get: () => {
    if (hasNote.value === true) return 'true'
    if (hasNote.value === false) return 'false'
    return 'all'
  },
  set: (value: string) => {
    if (value === 'true') hasNote.value = true
    else if (value === 'false') hasNote.value = false
    else hasNote.value = undefined
  }
})

function apply() {
  emit('apply')
  open.value = false
}

function reset() {
  emit('reset')
}
</script>

<template>
  <USlideover v-model:open="open" title="高级筛选">
    <template #body>
      <div class="flex flex-col gap-4 p-1">
        <UFormField label="媒体">
          <USelectMenu
            v-model="mediaIds"
            multiple
            :items="mediaOptions"
            value-key="value"
            label-key="label"
            placeholder="选择媒体"
            class="w-full"
          />
        </UFormField>

        <UFormField label="渠道">
          <USelectMenu
            v-model="channelIds"
            multiple
            :items="channelOptions"
            value-key="value"
            label-key="label"
            placeholder="选择渠道"
            class="w-full"
          />
        </UFormField>

        <UFormField label="资产状态">
          <USelectMenu
            v-model="assetStatuses"
            multiple
            :items="assetStatusOptions"
            value-key="value"
            label-key="label"
            placeholder="选择状态"
            class="w-full"
          />
        </UFormField>

        <UFormField label="产品归属">
          <USelect
            v-model="ownershipSelect"
            :items="ownershipOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField label="备注">
          <USelect
            v-model="noteSelect"
            :items="noteOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="消耗上限（最低）">
            <UInput v-model.number="spendLimitMin" type="number" placeholder="—" />
          </UFormField>
          <UFormField label="消耗上限（最高）">
            <UInput v-model.number="spendLimitMax" type="number" placeholder="—" />
          </UFormField>
          <UFormField label="已花费（最低）">
            <UInput v-model.number="amountSpentMin" type="number" placeholder="—" />
          </UFormField>
          <UFormField label="已花费（最高）">
            <UInput v-model.number="amountSpentMax" type="number" placeholder="—" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="重置" @click="reset" />
        <UButton label="应用" @click="apply" />
      </div>
    </template>
  </USlideover>
</template>
