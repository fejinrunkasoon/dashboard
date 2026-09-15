<script setup lang="ts">
const dictionaries = ref([{
  id: 'media',
  name: '媒体平台',
  description: '支持的广告媒体平台类型',
  items: ['Meta', 'Google', 'TikTok']
}, {
  id: 'assetStatus',
  name: '资产状态',
  description: '广告账户资产状态枚举',
  items: ['正常', '封户', '待激活', '已过期']
}, {
  id: 'mediaStatus',
  name: '媒体状态',
  description: '账户在媒体平台的运行状态',
  items: ['活跃', '暂停', '受限', '未关联']
}, {
  id: 'productType',
  name: '产品类型',
  description: '产品分类：自家产品 / 外接客户',
  items: ['自家', '外接']
}, {
  id: 'alertType',
  name: '预警类型',
  description: '系统预警的分类类型',
  items: ['余额不足', '封户预警', '消耗骤降', '闲置超时', '对账差异']
}, {
  id: 'paymentMethod',
  name: '打款方式',
  description: '渠道打款的支付方式',
  items: ['银行转账', '线上支付', '信用额度']
}])

const selectedDict = ref<string | null>(null)

const toast = useToast()

function onAddItem() {
  toast.add({ title: '功能开发中', description: '新增字典项功能即将上线', icon: 'i-lucide-info', color: 'info' })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="数据字典"
      description="管理系统中使用的各类枚举值和配置项，确保数据一致性。"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton label="新增字典" icon="i-lucide-plus" color="neutral" class="w-fit lg:ms-auto" @click="onAddItem" />
    </UPageCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="dict in dictionaries"
        :key="dict.id"
        :ui="{ body: 'p-4 sm:p-4' }"
        class="cursor-pointer transition-shadow hover:shadow-md"
        :class="{ 'ring-2 ring-primary': selectedDict === dict.id }"
        @click="selectedDict = selectedDict === dict.id ? null : dict.id"
      >
        <template #header>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="font-semibold text-highlighted">{{ dict.name }}</span>
            <UBadge :label="`${dict.items.length} 项`" variant="subtle" size="xs" />
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <p class="text-muted">{{ dict.description }}</p>
          <USeparator />
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="item in dict.items"
              :key="item"
              :label="item"
              variant="subtle"
              color="neutral"
              size="xs"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>