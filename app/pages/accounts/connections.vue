<script setup lang="ts">
import { mediaPlatforms } from '~/mocks/entities'

useSeoMeta({ title: '平台连接' })

const toast = useToast()
const {
  summaries,
  discovered,
  pending,
  errorMessage,
  refresh,
  startConnection,
  completeMockAuth,
  discover,
  importSelected,
  disconnect,
  reauthorize,
  selectConnection,
  selectedConnection
} = useMediaConnections()

const { connectable, refresh: refreshApps } = usePlatformApps()

await Promise.all([refresh(), refreshApps()])

const wizardOpen = ref(false)
const wizardStep = ref(1)
const wizardPlatformId = ref<string | null>(null)
const wizardConnectionId = ref<string | null>(null)
const discoverStats = ref<{ discovered: number, newCount: number, alreadyInFfj: number } | null>(null)
const busy = ref(false)

const manageOpen = ref(false)

const displaySummaries = computed(() => {
  const byId = new Map(summaries.value.map(s => [s.platformId, s]))
  for (const c of connectable.value) {
    if (!byId.has(c.mediaId)) {
      byId.set(c.mediaId, {
        platformId: c.mediaId,
        platformCode: c.code,
        platformName: c.name,
        connectionCount: 0,
        accountCount: 0,
        connections: []
      })
    }
  }
  return [...byId.values()]
})

const wizardPlatformName = computed(() => {
  const fromMedia = mediaPlatforms.find(m => m.id === wizardPlatformId.value)
  if (fromMedia) return fromMedia.name
  return connectable.value.find(c => c.mediaId === wizardPlatformId.value)?.name ?? '平台'
})

const { isOrgAdmin, isPlatformAdmin } = useCurrentUser()
const canConfigureApps = computed(() => isOrgAdmin.value || isPlatformAdmin.value)

function openWizard(platformId: string) {
  const info = connectable.value.find(c => c.mediaId === platformId)
  if (!info?.appConfigured || !info.platformEnabled) {
    toast.add({
      title: '无法连接',
      description: canConfigureApps.value
        ? '请先在「媒体平台开通」配置 App ID/Secret 并启用媒体。'
        : '请先由管理员在「媒体平台开通」配置 App ID/Secret 并启用媒体。',
      color: 'warning',
      actions: [{
        label: '去开通',
        color: 'neutral' as const,
        variant: 'outline' as const,
        to: '/settings'
      }]
    })
    return
  }
  wizardPlatformId.value = platformId
  wizardConnectionId.value = null
  wizardStep.value = 1
  discoverStats.value = null
  wizardOpen.value = true
}

function closeWizard() {
  wizardOpen.value = false
  wizardStep.value = 1
  discoverStats.value = null
}

async function onConfirmTeam(teamId: string, displayName: string) {
  if (!wizardPlatformId.value) return
  busy.value = true
  try {
    const conn = await startConnection(
      wizardPlatformId.value,
      teamId,
      displayName || undefined
    )
    wizardConnectionId.value = conn.id
    wizardStep.value = 2
  } catch (error) {
    toast.add({
      title: '创建连接失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function onMockAuth() {
  if (!wizardConnectionId.value) return
  busy.value = true
  try {
    await completeMockAuth(wizardConnectionId.value)
    wizardStep.value = 3
    toast.add({
      title: '授权成功',
      description: '请继续发现广告账户。授权成功 ≠ 账户已接入。',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: '授权失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function onDiscover() {
  if (!wizardConnectionId.value) return
  busy.value = true
  try {
    const result = await discover(wizardConnectionId.value)
    discoverStats.value = result.stats
    wizardStep.value = 4
  } catch (error) {
    toast.add({
      title: '发现失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function onImport(externalAccountIds: string[]) {
  if (!wizardConnectionId.value) return
  busy.value = true
  try {
    const result = await importSelected(wizardConnectionId.value, externalAccountIds)
    toast.add({
      title: '接入完成',
      description: `新建 ${result.imported.length} · 关联已有 ${result.skippedExisting} · 关系 ${result.linked.length}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    closeWizard()
  } catch (error) {
    toast.add({
      title: '接入失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function onManage(connectionId: string) {
  await selectConnection(connectionId)
  manageOpen.value = true
}

async function onReauth(connectionId: string) {
  try {
    await reauthorize(connectionId)
    toast.add({ title: '已重新授权（Mock）', color: 'success' })
  } catch (error) {
    toast.add({
      title: '重新授权失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  }
}

async function onDisconnect() {
  if (!selectedConnection.value) return
  try {
    await disconnect(selectedConnection.value.id)
    manageOpen.value = false
    toast.add({ title: '连接已断开', color: 'success' })
  } catch (error) {
    toast.add({
      title: '断开失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  }
}

async function onDiscoverAgain() {
  if (!selectedConnection.value) return
  manageOpen.value = false
  wizardPlatformId.value = selectedConnection.value.platformId
  wizardConnectionId.value = selectedConnection.value.id
  discoverStats.value = null
  wizardStep.value = 3
  wizardOpen.value = true
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="平台连接" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 flex flex-col gap-6">
        <div>
          <p class="text-sm text-muted max-w-2xl">
            通过 OAuth 连接已开通的媒体平台，发现并选择广告账户接入系统（与已有账户去重）。
            仅展示管理员已配置 App 的媒体；授权通道（Connection）与业务资产（Account）相互独立。
          </p>
        </div>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
          icon="i-lucide-alert-circle"
        />

        <div
          v-if="pending && !displaySummaries.length"
          class="text-sm text-muted"
        >
          加载中…
        </div>

        <AccountsConnectionsPlatformConnectionCards
          :summaries="displaySummaries"
          :connectable="connectable"
          @add="openWizard"
          @manage="onManage"
          @reauth="onReauth"
        />

        <AccountsConnectionsConnectWizardModal
          v-model:open="wizardOpen"
          :platform-id="wizardPlatformId"
          :platform-name="wizardPlatformName"
          :step="wizardStep"
          :connection-id="wizardConnectionId"
          :discovered="discovered"
          :discover-stats="discoverStats"
          :busy="busy"
          @confirm-team="onConfirmTeam"
          @mock-auth="onMockAuth"
          @discover="onDiscover"
          @import="onImport"
          @close="closeWizard"
        />

        <AccountsConnectionsConnectionManageModal
          v-model:open="manageOpen"
          :connection="selectedConnection"
          @reauth="selectedConnection && onReauth(selectedConnection.id)"
          @disconnect="onDisconnect"
          @discover-again="onDiscoverAgain"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
