<script setup lang="ts">
import type { Product } from '~/types'

const { data: products } = await useFetch<Product[]>('/api/products')

const formatCurrency = (value: number) => `$${value.toLocaleString()}`

const internalProducts = computed(() =>
  (products.value ?? []).filter(p => p.type === 'internal')
)

const externalProducts = computed(() =>
  (products.value ?? []).filter(p => p.type === 'external')
)

const totalInternalConsumed = computed(() =>
  internalProducts.value.reduce((sum, p) => sum + p.consumed, 0)
)

const totalExternalConsumed = computed(() =>
  externalProducts.value.reduce((sum, p) => sum + p.consumed, 0)
)

const totalConsumed = computed(() =>
  totalInternalConsumed.value + totalExternalConsumed.value
)
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="产品与客户"
      description="管理自家产品和外接客户产品，查看绑定账户数和消耗情况。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="新增产品"
        icon="i-lucide-plus"
        color="neutral"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <div class="grid gap-4 sm:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-home" class="text-primary size-5" />
              <span class="font-semibold text-highlighted">自家产品</span>
            </div>
            <UBadge :label="`${internalProducts.length} 个`" variant="subtle" color="primary" size="xs" />
          </div>
        </template>

        <div class="space-y-3">
          <div
            v-for="product in internalProducts"
            :key="product.id"
            class="flex items-center justify-between py-2 border-b border-default last:border-b-0"
          >
            <div>
              <p class="text-sm font-medium text-highlighted">{{ product.name }}</p>
              <p class="text-xs text-muted">{{ product.boundAccounts }} 个账户</p>
            </div>
            <span class="text-sm font-medium text-highlighted">{{ formatCurrency(product.consumed) }}</span>
          </div>

          <USeparator />

          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">合计</span>
            <span class="font-semibold text-highlighted">{{ formatCurrency(totalInternalConsumed) }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-link" class="text-secondary size-5" />
              <span class="font-semibold text-highlighted">外接客户</span>
            </div>
            <UBadge :label="`${externalProducts.length} 个`" variant="subtle" color="secondary" size="xs" />
          </div>
        </template>

        <div class="space-y-3">
          <div
            v-for="product in externalProducts"
            :key="product.id"
            class="flex items-center justify-between py-2 border-b border-default last:border-b-0"
          >
            <div>
              <p class="text-sm font-medium text-highlighted">{{ product.name }}</p>
              <p class="text-xs text-muted">{{ product.boundAccounts }} 个账户</p>
            </div>
            <span class="text-sm font-medium text-highlighted">{{ formatCurrency(product.consumed) }}</span>
          </div>

          <USeparator />

          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">合计</span>
            <span class="font-semibold text-highlighted">{{ formatCurrency(totalExternalConsumed) }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <p class="text-xs text-muted uppercase">消耗占比</p>
      </template>

      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">自家产品</span>
            <span class="text-highlighted font-medium">
              {{ totalConsumed ? Math.round((totalInternalConsumed / totalConsumed) * 100) : 0 }}%
            </span>
          </div>
          <div class="h-3 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${totalConsumed ? (totalInternalConsumed / totalConsumed) * 100 : 0}%` }"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">外接客户</span>
            <span class="text-highlighted font-medium">
              {{ totalConsumed ? Math.round((totalExternalConsumed / totalConsumed) * 100) : 0 }}%
            </span>
          </div>
          <div class="h-3 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-secondary transition-all"
              :style="{ width: `${totalConsumed ? (totalExternalConsumed / totalConsumed) * 100 : 0}%` }"
            />
          </div>
        </div>

        <USeparator />

        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">总消耗</span>
          <span class="text-lg font-semibold text-highlighted">{{ formatCurrency(totalConsumed) }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>