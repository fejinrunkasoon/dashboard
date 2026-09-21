<script setup lang="ts">
import { alertService } from '~/services'

useSeoMeta({ title: '媒体同步 · Media Sync' })

const toast = useToast()
const router = useRouter()

const {
  credentials,
  selectedCredentialId,
  selectedBinding,
  discoverGate,
  jobs,
  logs,
  discovered,
  pendingNew,
  pending,
  running,
  errorMessage,
  refresh,
  selectCredential,
  runDiscovery,
  confirmImport,
  skipDiscovered
} = useMediaSync()

await refresh()

const selectedIds = ref<string[]>([])
const showImportModal = ref(false)
const existenceAlerts = ref<Awaited<ReturnType<typeof alertService.getAlerts>>['items']>([])

const credentialItems = computed(() =>
  credentials.value.map(c => ({
    label: `${c.label} · ${c.status}`,
    value: c.id
  }))
)

async function loadExistenceAlerts() {
  const result = await alertService.getAlerts({
    types: ['API_ACCESS_LOST'],
    statuses: ['OPEN', 'IN_PROGRESS'],
    pageSize: 20
  })
  existenceAlerts.value = result.items
}

await loadExistenceAlerts()

async function onRunDiscovery() {
  try {
    await runDiscovery()
    selectedIds.value = []
    await loadExistenceAlerts()
    toast.add({ title: '发现完成', icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toast.add({
      title: '发现失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onConfirmImport(payload: {
  sourceChannelId: string | null
  platformAssetId: string | null
}) {
  try {
    const result = await confirmImport({
      discoveredIds: [...selectedIds.value],
      sourceChannelId: payload.sourceChannelId,
      platformAssetId: payload.platformAssetId
    })
    showImportModal.value = false
    selectedIds.value = []
    toast.add({
      title: `已导入 ${result.importedCount} 个账户`,
      description: '状态 AVAILABLE，未自动分配',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: '导入失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function onSkip() {
  if (!selectedIds.value.length) return
  try {
    const count = await skipDiscovered([...selectedIds.value])
    selectedIds.value = []
    toast.add({ title: `已跳过 ${count} 条`, icon: 'i-lucide-check', color: 'success' })
  } catch (error) {
    toast.add({
      title: '跳过失败',
      description: error instanceof Error ? error.message : '未知错误',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function goAlerts(type: string) {
  void router.push({ path: '/alerts', query: { types: type } })
}
</script>

<template>
  <div class="space-y-8">
    <UPageCard
      title="媒体同步 · Media Sync"
      description="Mock 发现 / 去重 / 人工确认导入。Meta 优先。未确认发现结果不进 Matching Pool。入库 ≠ 分配。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="errorMessage"
      class="mb-2"
    />

    <div class="flex flex-wrap items-end gap-3 rounded-lg border border-default p-4">
      <UFormField label="Credential" class="min-w-64 flex-1">
        <USelectMenu
          :model-value="selectedCredentialId ?? undefined"
          :items="credentialItems"
          value-key="value"
          placeholder="选择 Credential"
          class="w-full"
          @update:model-value="(v: string) => selectCredential(v)"
        />
      </UFormField>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="运行发现"
          icon="i-lucide-radar"
          color="primary"
          :loading="running"
          :disabled="!discoverGate.ok || pending"
          @click="onRunDiscovery"
        />
        <UButton
          label="刷新"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          :disabled="pending || running"
          @click="refresh().then(loadExistenceAlerts)"
        />
      </div>
      <p v-if="!discoverGate.ok" class="w-full text-xs text-muted">
        {{ discoverGate.reason }}
        <NuxtLink to="/settings" class="ml-2 text-primary underline">
          去数据接入配置
        </NuxtLink>
      </p>
      <p v-else-if="selectedBinding" class="w-full text-xs text-muted">
        绑定：{{ selectedBinding.mediaName }} · {{ selectedBinding.implKey }}
        · 待导入 NEW {{ pendingNew.length }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-highlighted">Job 历史</h3>
        <SettingsSyncSyncJobTable :jobs="jobs" :pending="pending" />
      </div>
      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-highlighted">最近 Sync Log</h3>
        <SettingsSyncSyncLogList :logs="logs" :pending="pending" />
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">发现结果</h3>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="确认导入"
            color="primary"
            size="sm"
            :disabled="!selectedIds.length"
            @click="showImportModal = true"
          />
          <UButton
            label="跳过"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="!selectedIds.length"
            @click="onSkip"
          />
        </div>
      </div>
      <SettingsSyncDiscoveredAccountTable
        v-model:selected-ids="selectedIds"
        :rows="discovered"
        :pending="pending"
      />
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-highlighted">存在性异常（FFJ 有 · 媒体无）</h3>
        <UButton
          label="在预警中心查看"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="goAlerts('API_ACCESS_LOST')"
        />
      </div>
      <div
        v-if="!existenceAlerts.length"
        class="rounded-lg border border-dashed border-default p-4 text-sm text-muted"
      >
        暂无 OPEN 的 API_ACCESS_LOST。运行发现后，若库内 ACCESSIBLE 户未出现在媒体结果中，将在此列出。
      </div>
      <ul v-else class="space-y-2 rounded-lg border border-default p-3">
        <li
          v-for="alert in existenceAlerts"
          :key="alert.id"
          class="flex flex-wrap items-center justify-between gap-2 border-b border-default/50 pb-2 text-sm last:border-0 last:pb-0"
        >
          <div>
            <span class="font-medium text-highlighted">{{ alert.title }}</span>
            <span class="ml-2 font-mono text-xs text-muted">{{ alert.entityId }}</span>
            <p class="text-xs text-muted">{{ alert.description }}</p>
          </div>
          <UBadge :label="alert.status" color="warning" variant="subtle" size="xs" />
        </li>
      </ul>
    </div>

    <SettingsSyncConfirmSyncImportModal
      v-model:open="showImportModal"
      :selected-count="selectedIds.length"
      :media-id="selectedBinding?.mediaId ?? null"
      @confirm="onConfirmImport"
    />
  </div>
</template>
