<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Customer, ProductOwnership } from '~/domain'
import type { ProductListItem } from '~/services'
import { productService } from '~/services'

useSeoMeta({ title: '产品与客户' })

const toast = useToast()

const segment = ref<'INTERNAL' | 'EXTERNAL' | 'CUSTOMERS'>('INTERNAL')
const products = ref<ProductListItem[]>([])
const customers = ref<Customer[]>([])
const pending = ref(true)
const saving = ref(false)

const showProductModal = ref(false)
const editingProduct = ref<ProductListItem | null>(null)
const showCustomerModal = ref(false)
const editingCustomer = ref<Customer | null>(null)

const segmentItems = [
  { label: '自家产品', value: 'INTERNAL' },
  { label: '外接产品', value: 'EXTERNAL' },
  { label: '外接客户', value: 'CUSTOMERS' }
]

async function refresh() {
  pending.value = true
  try {
    const [productRows, customerRows] = await Promise.all([
      productService.getProductList(),
      productService.getCustomers()
    ])
    products.value = productRows
    customers.value = customerRows
  } finally {
    pending.value = false
  }
}

await refresh()

const filteredProducts = computed(() => {
  if (segment.value === 'CUSTOMERS') return []
  return products.value.filter(p => p.ownershipType === segment.value)
})

const productColumns: TableColumn<ProductListItem>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'code', header: 'Code' },
  { id: 'customer', header: '客户' },
  { id: 'bound', header: '绑定账户' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

const customerColumns: TableColumn<Customer>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'code', header: 'Code' },
  { id: 'productCount', header: '产品数' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

function productCountForCustomer(customerId: string) {
  return products.value.filter(p => p.customerId === customerId).length
}

function statusColor(status: string) {
  return status === 'ACTIVE' ? 'success' : 'neutral'
}

function openCreateProduct() {
  editingProduct.value = null
  if (segment.value === 'CUSTOMERS') segment.value = 'EXTERNAL'
  showProductModal.value = true
}

function openEditProduct(product: ProductListItem) {
  editingProduct.value = product
  showProductModal.value = true
}

function openCreateCustomer() {
  editingCustomer.value = null
  showCustomerModal.value = true
}

function openEditCustomer(customer: Customer) {
  editingCustomer.value = customer
  showCustomerModal.value = true
}

async function onSaveProduct(payload: {
  code: string
  name: string
  ownershipType: ProductOwnership
  customerId?: string | null
  note?: string | null
}) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingProduct.value) {
      await productService.updateProduct(editingProduct.value.id, {
        name: payload.name,
        note: payload.note,
        ...(payload.ownershipType === 'EXTERNAL'
          ? { customerId: payload.customerId }
          : {})
      })
      toast.add({ title: '已更新产品', icon: 'i-lucide-check', color: 'success' })
    } else {
      await productService.createProduct(payload)
      toast.add({ title: '已创建产品', icon: 'i-lucide-check', color: 'success' })
      segment.value = payload.ownershipType
    }
    showProductModal.value = false
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

async function onToggleProductStatus(product: ProductListItem) {
  const next = product.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await productService.setProductStatus(product.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用产品' : '已停用产品',
      description: `${product.name} → ${next}`,
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

async function onSaveCustomer(payload: { code: string, name: string, note?: string | null }) {
  if (saving.value) return
  saving.value = true
  try {
    if (editingCustomer.value) {
      await productService.updateCustomer(editingCustomer.value.id, {
        name: payload.name,
        note: payload.note
      })
      toast.add({ title: '已更新客户', icon: 'i-lucide-check', color: 'success' })
    } else {
      await productService.createCustomer(payload)
      toast.add({ title: '已创建客户', icon: 'i-lucide-check', color: 'success' })
      segment.value = 'CUSTOMERS'
    }
    showCustomerModal.value = false
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

async function onToggleCustomerStatus(customer: Customer) {
  const next = customer.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await productService.setCustomerStatus(customer.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用客户' : '已停用客户',
      description: `${customer.name} → ${next}`,
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

const defaultOwnership = computed<ProductOwnership>(() =>
  segment.value === 'INTERNAL' ? 'INTERNAL' : 'EXTERNAL'
)
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="产品与客户"
      description="管理自家产品与外接客户主数据。绑定账户数为只读统计；消耗请在运营总览 / 账户分析查看。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <div class="flex flex-wrap gap-2 w-fit lg:ms-auto">
        <UButton
          label="新增客户"
          icon="i-lucide-building-2"
          color="neutral"
          variant="outline"
          @click="openCreateCustomer"
        />
        <UButton
          label="新增产品"
          icon="i-lucide-plus"
          color="neutral"
          @click="openCreateProduct"
        />
      </div>
    </UPageCard>

    <UTabs v-model="segment" :items="segmentItems" class="w-full" :content="false" />

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>

    <template v-else-if="segment === 'CUSTOMERS'">
      <div
        v-if="!customers.length"
        class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
      >
        暂无外接客户。点击「新增客户」创建。
      </div>
      <div v-else class="overflow-x-auto rounded-lg border border-default">
        <UTable :data="customers" :columns="customerColumns" class="shrink-0">
          <template #code-cell="{ row }">
            <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
          </template>
          <template #productCount-cell="{ row }">
            {{ productCountForCustomer(row.original.id) }}
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
                @click="openEditCustomer(row.original)"
              />
              <UButton
                :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
                size="xs"
                :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
                variant="ghost"
                @click="onToggleCustomerStatus(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </template>

    <template v-else>
      <div
        v-if="!filteredProducts.length"
        class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
      >
        暂无{{ segment === 'INTERNAL' ? '自家' : '外接' }}产品。点击「新增产品」创建。
      </div>
      <div v-else class="overflow-x-auto rounded-lg border border-default">
        <UTable :data="filteredProducts" :columns="productColumns" class="shrink-0">
          <template #code-cell="{ row }">
            <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
          </template>
          <template #customer-cell="{ row }">
            <span class="text-sm text-muted">
              {{ row.original.customerName ?? '—' }}
            </span>
          </template>
          <template #bound-cell="{ row }">
            {{ row.original.boundAccountCount }}
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
                @click="openEditProduct(row.original)"
              />
              <UButton
                :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
                size="xs"
                :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
                variant="ghost"
                @click="onToggleProductStatus(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </template>

    <SettingsProductFormModal
      v-model:open="showProductModal"
      :product="editingProduct"
      :customers="customers"
      :default-ownership="defaultOwnership"
      @save="onSaveProduct"
    />

    <SettingsCustomerFormModal
      v-model:open="showCustomerModal"
      :customer="editingCustomer"
      @save="onSaveCustomer"
    />
  </div>
</template>
