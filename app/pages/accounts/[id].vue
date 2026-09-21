<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AccountAssignment,
  AccountDetailBundle,
  AccountProductAssignment,
  AccountServiceFeePolicyAssignment,
  AccountSpendDaily
} from '~/domain'
import { accountService, accountSpendService, channelService, mediaSyncService, productService, teamService } from '~/services'

const route = useRoute()
const toast = useToast()

const accountId = computed(() => String(route.params.id ?? ''))

const pending = ref(true)
const notFound = ref(false)
const detail = ref<AccountDetailBundle | null>(null)
const dailyRows = ref<AccountSpendDaily[]>([])
const syncLogsForAccount = ref<Awaited<ReturnType<typeof mediaSyncService.getLogsForAccount>>>([])

const teams = await teamService.getTeams()
const members = await teamService.getMembers()
const products = await productService.getProducts()

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Spend', value: 'spend' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Product', value: 'product' },
  { label: 'Status', value: 'status' },
  { label: 'API Data', value: 'api' }
]

const activeTab = ref('overview')

const showTransferModal = ref(false)
const showRecycleModal = ref(false)
const showDisableModal = ref(false)
const showAssignModal = ref(false)
const showProductModal = ref(false)
const showManagerModal = ref(false)
const showFeePolicyModal = ref(false)

const transferTargetTeamId = ref<string | undefined>()
const transferTargetMemberId = ref<string | undefined>()
const transferReason = ref('')
const recycleReason = ref('')
const disableReason = ref('')
const assignTargetTeamId = ref<string | undefined>()
const assignTargetMemberId = ref<string | undefined>()
const assignReason = ref('')
const changeProductId = ref<string | undefined>()
const changeProductReason = ref('')
const changeManagerId = ref<string | undefined>()
const changeManagerReason = ref('')
const changeFeePolicyId = ref<string | undefined>()
const channelFeePolicies = ref<{ label: string, value: string }[]>([])

const targetTeamMembers = computed(() => {
  if (!transferTargetTeamId.value) return []
  return members.filter(item => item.teamId === transferTargetTeamId.value)
})

const assignTeamMembers = computed(() => {
  if (!assignTargetTeamId.value) return []
  return members.filter(item => item.teamId === assignTargetTeamId.value)
})

const productOptions = computed(() =>
  products.map(item => ({
    label: item.ownershipType === 'EXTERNAL' ? `${item.name} · 外接` : `${item.name} · 自家`,
    value: item.id
  }))
)

const managerOptions = computed(() =>
  members.map(item => ({ label: item.name, value: item.id }))
)

async function load() {
  pending.value = true
  notFound.value = false
  try {
    const bundle = await accountService.getAccountDetail(accountId.value)
    if (!bundle) {
      detail.value = null
      notFound.value = true
      return
    }
    detail.value = bundle
    dailyRows.value = await accountSpendService.getAccountSpendDaily(accountId.value)
    syncLogsForAccount.value = await mediaSyncService.getLogsForAccount(accountId.value, 8)
    useSeoMeta({
      title: `${bundle.account.externalAccountId} · 账户详情`
    })
  } finally {
    pending.value = false
  }
}

watch(accountId, () => { void load() }, { immediate: true })

function openTransfer() {
  transferTargetTeamId.value = undefined
  transferTargetMemberId.value = undefined
  transferReason.value = ''
  showTransferModal.value = true
}

function openRecycle() {
  recycleReason.value = ''
  showRecycleModal.value = true
}

function openDisable() {
  disableReason.value = ''
  showDisableModal.value = true
}

function openAssign() {
  assignTargetTeamId.value = undefined
  assignTargetMemberId.value = undefined
  assignReason.value = ''
  showAssignModal.value = true
}

function openChangeProduct() {
  changeProductId.value = detail.value?.account.product?.id
  changeProductReason.value = ''
  showProductModal.value = true
}

function openChangeManager() {
  changeManagerId.value = detail.value?.account.manager?.id
  changeManagerReason.value = ''
  showManagerModal.value = true
}

async function openChangeFeePolicy() {
  changeFeePolicyId.value = detail.value?.account.serviceFeePolicy?.id
  const channelId = detail.value?.entity.sourceChannelId
  if (!channelId) return
  const policies = await channelService.getServiceFeePolicies(channelId)
  channelFeePolicies.value = policies
    .filter(item => item.status === 'ACTIVE')
    .map(item => ({ label: `${item.code} · ${item.name}`, value: item.id }))
  showFeePolicyModal.value = true
}

async function confirmTransfer() {
  if (!detail.value || !transferTargetTeamId.value || !transferReason.value.trim()) return
  const account = detail.value.account
  const team = teams.find(item => item.id === transferTargetTeamId.value)
  const member = members.find(item => item.id === transferTargetMemberId.value)
  try {
    await accountService.transferAccount({
      accountId: account.id,
      teamId: transferTargetTeamId.value,
      memberId: transferTargetMemberId.value,
      reason: transferReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showTransferModal.value = false
    toast.add({
      title: '转移成功',
      description: `${account.externalAccountId} → ${team?.name ?? ''}${member ? ` / ${member.name}` : ''}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '转移失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmRecycle() {
  if (!detail.value || !recycleReason.value.trim()) return
  const account = detail.value.account
  try {
    await accountService.recycleAccount({
      accountId: account.id,
      reason: recycleReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showRecycleModal.value = false
    toast.add({
      title: '回收成功',
      description: `${account.externalAccountId} 已回到账户池`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '回收失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmDisable() {
  if (!detail.value || !disableReason.value.trim()) return
  const account = detail.value.account
  try {
    await accountService.disableAccount({
      accountId: account.id,
      reason: disableReason.value.trim(),
      createdBy: 'mem-lisi'
    })
    showDisableModal.value = false
    toast.add({
      title: '停用成功',
      description: `${account.externalAccountId} 已停用`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '停用失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmAssign() {
  if (!detail.value || !assignTargetTeamId.value) return
  const account = detail.value.account
  const team = teams.find(item => item.id === assignTargetTeamId.value)
  const member = members.find(item => item.id === assignTargetMemberId.value)
  try {
    await accountService.assignDirect({
      accountIds: [account.id],
      teamId: assignTargetTeamId.value,
      memberId: assignTargetMemberId.value,
      reason: assignReason.value.trim() || undefined,
      createdBy: 'mem-lisi'
    })
    showAssignModal.value = false
    toast.add({
      title: '分配成功',
      description: `${account.externalAccountId} → ${team?.name ?? ''}${member ? ` / ${member.name}` : ''}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '分配失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmChangeProduct() {
  if (!detail.value || !changeProductId.value) return
  const account = detail.value.account
  const product = products.find(item => item.id === changeProductId.value)
  try {
    await accountService.changeProduct({
      accountId: account.id,
      productId: changeProductId.value,
      reason: changeProductReason.value.trim() || undefined,
      createdBy: 'mem-lisi'
    })
    showProductModal.value = false
    toast.add({
      title: '产品已更新',
      description: `${account.externalAccountId} → ${product?.name ?? changeProductId.value}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '更换产品失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmChangeManager() {
  if (!detail.value || !changeManagerId.value) return
  const account = detail.value.account
  const manager = members.find(item => item.id === changeManagerId.value)
  try {
    await accountService.changeManager({
      accountId: account.id,
      managerMemberId: changeManagerId.value,
      reason: changeManagerReason.value.trim() || undefined,
      createdBy: 'mem-lisi'
    })
    showManagerModal.value = false
    toast.add({
      title: '户管已更新',
      description: `${account.externalAccountId} → ${manager?.name ?? changeManagerId.value}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '更换户管失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function confirmChangeFeePolicy() {
  if (!detail.value || !changeFeePolicyId.value) return
  const account = detail.value.account
  const policyLabel = channelFeePolicies.value.find(item => item.value === changeFeePolicyId.value)?.label
  try {
    await accountService.changeFeePolicy({
      accountId: account.id,
      policyId: changeFeePolicyId.value,
      createdBy: 'mem-lisi'
    })
    showFeePolicyModal.value = false
    toast.add({
      title: '服务费政策已换绑',
      description: `${account.externalAccountId} → ${policyLabel ?? changeFeePolicyId.value}`,
      icon: 'i-lucide-check',
      color: 'success'
    })
    await load()
  } catch (error) {
    toast.add({
      title: '换绑失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

function teamLabel(id: string) {
  return teams.find(item => item.id === id)?.name ?? id
}

function memberLabel(id?: string | null) {
  if (!id) return '—'
  return members.find(item => item.id === id)?.name ?? id
}

const assignmentColumns: TableColumn<AccountAssignment>[] = [
  { accessorKey: 'startedAt', header: '开始' },
  { accessorKey: 'endedAt', header: '结束' },
  { id: 'team', header: '团队' },
  { id: 'member', header: '成员' },
  { accessorKey: 'reason', header: '原因' }
]

const productColumns: TableColumn<AccountProductAssignment>[] = [
  { accessorKey: 'startedAt', header: '开始' },
  { accessorKey: 'endedAt', header: '结束' },
  { accessorKey: 'productId', header: '产品' },
  { accessorKey: 'reason', header: '原因' }
]

const feeColumns: TableColumn<AccountServiceFeePolicyAssignment>[] = [
  { accessorKey: 'startedAt', header: '开始' },
  { accessorKey: 'endedAt', header: '结束' },
  { accessorKey: 'policyId', header: '政策' }
]
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="账户详情" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/accounts"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            label="返回列表"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
    <div class="p-4 space-y-4">
      <div v-if="pending" class="flex items-center justify-center gap-2 py-20 text-muted text-sm">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载账户详情…
      </div>

      <div
        v-else-if="notFound"
        class="flex flex-col items-center justify-center gap-3 py-20 text-muted"
      >
        <UIcon name="i-lucide-search-x" class="size-10" />
        <p class="text-sm">
          未找到账户 {{ accountId }}
        </p>
        <UButton to="/accounts" label="返回全部账户" variant="soft" />
      </div>

      <template v-else-if="detail">
        <AccountsAccountDetailHeader
          :account="detail.account"
          :usage-days="detail.usageDays"
          @assign="openAssign"
          @transfer="openTransfer"
          @recycle="openRecycle"
          @disable="openDisable"
          @change-product="openChangeProduct"
          @change-manager="openChangeManager"
        />

        <UTabs v-model="activeTab" :items="tabs" class="w-full" :content="false" />

        <div class="rounded-lg border border-default p-4">
          <template v-if="activeTab === 'overview'">
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-medium mb-2">
                  当前关系
                </h3>
                <div class="grid sm:grid-cols-2 gap-2 text-sm">
                  <p>
                    <span class="text-muted">成员：</span>
                    {{ detail.account.member?.name ?? '—' }}
                    <span class="text-muted">（投放使用）</span>
                  </p>
                  <p>
                    <span class="text-muted">户管：</span>
                    {{ detail.account.manager?.name ?? '—' }}
                    <span class="text-muted">（账户维护）</span>
                  </p>
                </div>
              </div>
              <div v-if="detail.account.note">
                <h3 class="text-sm font-medium mb-2">
                  备注
                </h3>
                <p class="text-sm text-highlighted">
                  {{ detail.account.note }}
                </p>
              </div>
              <div>
                <h3 class="text-sm font-medium mb-2">
                  最近事件
                </h3>
                <AccountsAccountTimeline :events="detail.timeline" :limit="6" />
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'spend'">
            <AccountsAccountSpendPanel
              :account="detail.account"
              :daily-rows="dailyRows"
            />
          </template>

          <template v-else-if="activeTab === 'assignment'">
            <div class="space-y-4">
              <h3 class="text-sm font-medium">
                Team / Member 历史
              </h3>
              <UTable :data="detail.history.assignments" :columns="assignmentColumns">
                <template #startedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.startedAt.slice(0, 10) }}</span>
                </template>
                <template #endedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.endedAt?.slice(0, 10) ?? '当前' }}</span>
                </template>
                <template #team-cell="{ row }">
                  {{ teamLabel(row.original.teamId) }}
                </template>
                <template #member-cell="{ row }">
                  {{ memberLabel(row.original.memberId) }}
                </template>
                <template #reason-cell="{ row }">
                  {{ row.original.reason ?? '—' }}
                </template>
              </UTable>

              <h3 class="text-sm font-medium">
                户管历史
              </h3>
              <UTable
                :data="detail.history.managers"
                :columns="[
                  { accessorKey: 'startedAt', header: '开始' },
                  { accessorKey: 'endedAt', header: '结束' },
                  { id: 'manager', header: '户管' },
                  { accessorKey: 'reason', header: '原因' }
                ]"
              >
                <template #startedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.startedAt.slice(0, 10) }}</span>
                </template>
                <template #endedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.endedAt?.slice(0, 10) ?? '当前' }}</span>
                </template>
                <template #manager-cell="{ row }">
                  {{ memberLabel(row.original.managerMemberId) }}
                </template>
                <template #reason-cell="{ row }">
                  {{ row.original.reason ?? '—' }}
                </template>
              </UTable>

              <h3 class="text-sm font-medium">
                完整时间线
              </h3>
              <AccountsAccountTimeline :events="detail.timeline" />
            </div>
          </template>

          <template v-else-if="activeTab === 'product'">
            <div class="space-y-4">
              <h3 class="text-sm font-medium">
                产品历史
              </h3>
              <UTable :data="detail.history.products" :columns="productColumns">
                <template #startedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.startedAt.slice(0, 10) }}</span>
                </template>
                <template #endedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.endedAt?.slice(0, 10) ?? '当前' }}</span>
                </template>
                <template #productId-cell="{ row }">
                  {{ row.original.productId }}
                </template>
                <template #reason-cell="{ row }">
                  {{ row.original.reason ?? '—' }}
                </template>
              </UTable>

              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-medium">
                  服务费政策历史
                </h3>
                <UButton
                  label="换绑政策"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-percent"
                  @click="openChangeFeePolicy"
                />
              </div>
              <UTable :data="detail.history.feePolicies" :columns="feeColumns">
                <template #startedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.startedAt.slice(0, 10) }}</span>
                </template>
                <template #endedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.endedAt?.slice(0, 10) ?? '当前' }}</span>
                </template>
                <template #policyId-cell="{ row }">
                  {{ row.original.policyId }}
                </template>
              </UTable>

              <h3 class="text-sm font-medium">
                管理资产历史
              </h3>
              <UTable
                :data="detail.history.platformAssets"
                :columns="[
                  { accessorKey: 'startedAt', header: '开始' },
                  { accessorKey: 'endedAt', header: '结束' },
                  { accessorKey: 'platformAssetId', header: '资产' },
                  { accessorKey: 'reason', header: '原因' }
                ]"
              >
                <template #startedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.startedAt.slice(0, 10) }}</span>
                </template>
                <template #endedAt-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.endedAt?.slice(0, 10) ?? '当前' }}</span>
                </template>
                <template #platformAssetId-cell="{ row }">
                  <span class="font-mono text-xs">{{ row.original.platformAssetId }}</span>
                </template>
                <template #reason-cell="{ row }">
                  {{ row.original.reason ?? '—' }}
                </template>
              </UTable>
            </div>
          </template>

          <template v-else-if="activeTab === 'status'">
            <div class="grid sm:grid-cols-3 gap-4 text-sm">
              <div class="rounded-lg bg-elevated/50 p-4">
                <p class="text-xs text-muted mb-1">
                  Asset Status
                </p>
                <p class="font-medium">
                  {{ detail.account.assetStatus }}
                </p>
              </div>
              <div class="rounded-lg bg-elevated/50 p-4">
                <p class="text-xs text-muted mb-1">
                  Media Status
                </p>
                <p class="font-medium">
                  {{ detail.account.mediaStatus }}
                </p>
              </div>
              <div class="rounded-lg bg-elevated/50 p-4">
                <p class="text-xs text-muted mb-1">
                  API Access
                </p>
                <p class="font-medium">
                  {{ detail.account.apiAccessStatus }}
                </p>
              </div>
            </div>
            <p class="text-xs text-muted mt-4">
              三态彼此独立。备注不改变状态。正式 Status 变更事件表尚未建立，以下为合成时间线中的相关事件。
            </p>
            <div class="mt-4">
              <AccountsAccountTimeline
                :events="detail.timeline.filter(e => e.type === 'STATUS_CHANGED' || e.type === 'DISABLED' || e.type === 'IMPORTED')"
              />
            </div>
          </template>

          <template v-else>
            <div class="space-y-3 text-sm">
              <div class="rounded-lg bg-elevated/50 p-4 space-y-2">
                <p>
                  <span class="text-muted">lastSyncAt：</span>
                  {{ detail.entity.lastSyncAt ?? '—' }}
                </p>
                <p>
                  <span class="text-muted">firstSeenAt：</span>
                  {{ detail.entity.firstSeenAt ?? '—' }}
                </p>
                <p>
                  <span class="text-muted">apiAccessStatus：</span>
                  {{ detail.account.apiAccessStatus }}
                </p>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium text-highlighted">最近 Sync Log</p>
                <p v-if="!syncLogsForAccount.length" class="text-xs text-muted">
                  尚无与本账户相关的同步日志。可在
                  <NuxtLink to="/settings/sync" class="text-primary underline">媒体同步</NuxtLink>
                  运行发现。
                </p>
                <ul v-else class="space-y-1.5 text-xs">
                  <li
                    v-for="log in syncLogsForAccount"
                    :key="log.id"
                    class="rounded-md bg-elevated/40 px-3 py-2"
                  >
                    <span class="text-muted">{{ log.at.slice(0, 19).replace('T', ' ') }}</span>
                    · {{ log.kind }} · {{ log.message }}
                  </li>
                </ul>
              </div>
              <p class="text-muted text-xs">
                Mock Sync 无真实 Media payload。真实 Connector = STEP 30。
              </p>
            </div>
          </template>
        </div>
      </template>
    </div>

    <UModal v-model:open="showTransferModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">转移账户</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted rounded-lg bg-elevated p-3">
              划转使用权不自动改变户管。
            </p>
            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="transferTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>
            <UFormField label="目标成员">
              <USelectMenu
                v-model="transferTargetMemberId"
                :items="targetTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!transferTargetTeamId"
              />
            </UFormField>
            <UFormField label="转移原因" required>
              <UTextarea v-model="transferReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showTransferModal = false" />
              <UButton
                label="确认转移"
                color="info"
                :disabled="!transferTargetTeamId || !transferReason.trim()"
                @click="confirmTransfer"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showRecycleModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">回收账户</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted rounded-lg bg-elevated p-3">
              将结束当前团队归属，账户回到可分配池。
            </p>
            <UFormField label="回收原因" required>
              <UTextarea v-model="recycleReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showRecycleModal = false" />
              <UButton
                label="确认回收"
                color="warning"
                :disabled="!recycleReason.trim()"
                @click="confirmRecycle"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showDisableModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">停用账户</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted rounded-lg bg-elevated p-3">
              将结束当前归属（如有），资产状态变为停用，不会进入账户池。
            </p>
            <UFormField label="停用原因" required>
              <UTextarea v-model="disableReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showDisableModal = false" />
              <UButton
                label="确认停用"
                color="error"
                :disabled="!disableReason.trim()"
                @click="confirmDisable"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showAssignModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">分配账户</span>
          </template>
          <div class="space-y-4">
            <UFormField label="目标团队" required>
              <USelectMenu
                v-model="assignTargetTeamId"
                :items="teams.map(t => ({ label: t.name, value: t.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标团队"
              />
            </UFormField>
            <UFormField label="目标成员">
              <USelectMenu
                v-model="assignTargetMemberId"
                :items="assignTeamMembers.map(m => ({ label: m.name, value: m.id }))"
                value-key="value"
                label-key="label"
                placeholder="选择目标成员"
                :disabled="!assignTargetTeamId"
              />
            </UFormField>
            <UFormField label="分配原因">
              <UTextarea v-model="assignReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showAssignModal = false" />
              <UButton
                label="确认分配"
                color="primary"
                :disabled="!assignTargetTeamId"
                @click="confirmAssign"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showProductModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">更换产品</span>
          </template>
          <div class="space-y-4">
            <UFormField label="新产品" required>
              <USelectMenu
                v-model="changeProductId"
                :items="productOptions"
                value-key="value"
                label-key="label"
                placeholder="选择产品"
              />
            </UFormField>
            <UFormField label="原因">
              <UTextarea v-model="changeProductReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showProductModal = false" />
              <UButton
                label="确认更换"
                color="info"
                :disabled="!changeProductId"
                @click="confirmChangeProduct"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showManagerModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">更换户管</span>
          </template>
          <div class="space-y-4">
            <UFormField label="新户管" required>
              <USelectMenu
                v-model="changeManagerId"
                :items="managerOptions"
                value-key="value"
                label-key="label"
                placeholder="选择户管"
              />
            </UFormField>
            <UFormField label="原因">
              <UTextarea v-model="changeManagerReason" :rows="2" autoresize />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showManagerModal = false" />
              <UButton
                label="确认更换"
                color="info"
                :disabled="!changeManagerId"
                @click="confirmChangeManager"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showFeePolicyModal">
      <template #content>
        <UCard v-if="detail">
          <template #header>
            <span class="font-semibold">换绑服务费政策</span>
          </template>
          <div class="space-y-4">
            <p class="text-xs text-muted">
              仅可选本渠 ACTIVE 政策。结束旧历史段并开新段；历史月结仍按当时绑定计算。
            </p>
            <UFormField label="政策" required>
              <USelectMenu
                v-model="changeFeePolicyId"
                :items="channelFeePolicies"
                value-key="value"
                label-key="label"
                placeholder="选择政策"
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="取消" color="neutral" variant="ghost" @click="showFeePolicyModal = false" />
              <UButton
                label="确认换绑"
                color="primary"
                :disabled="!changeFeePolicyId"
                @click="confirmChangeFeePolicy"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
    </template>
  </UDashboardPanel>
</template>
