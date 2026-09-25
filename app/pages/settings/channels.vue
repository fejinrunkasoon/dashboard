<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Channel, MediaPlatform } from '~/domain'
import { channelService, mediaService } from '~/services'

useSeoMeta({ title: '渠道' })

const route = useRoute()
const toast = useToast()

const channels = ref<Channel[]>([])
const mediaPlatforms = ref<MediaPlatform[]>([])
const pending = ref(true)
const saving = ref(false)

const showModal = ref(false)
const editing = ref<Channel | null>(null)
const highlightId = computed(() => {
  const raw = route.query.highlight
  return typeof raw === 'string' ? raw : ''
})

async function refresh() {
  pending.value = true
  try {
    const [channelRows, mediaRows] = await Promise.all([
      channelService.getChannels(),
      mediaService.getMediaPlatforms()
    ])
    channels.value = channelRows
    mediaPlatforms.value = mediaRows
  } finally {
    pending.value = false
  }
}

await refresh()

const mediaNameById = computed(() => {
  const map = new Map(mediaPlatforms.value.map(m => [m.id, m.name]))
  return map
})

const columns: TableColumn<Channel>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'code', header: '编码' },
  { id: 'media', header: '支持媒体' },
  { accessorKey: 'contactName', header: '联系人' },
  { accessorKey: 'status', header: '状态' },
  { id: 'actions', header: '操作' }
]

function statusColor(status: string) {
  return status === 'ACTIVE' ? 'success' : 'neutral'
}

function mediaLabels(ids: string[]) {
  if (!ids.length) return '—'
  return ids.map(id => mediaNameById.value.get(id) ?? id).join('、')
}

function openCreate() {
  editing.value = null
  showModal.value = true
}

function openEdit(channel: Channel) {
  editing.value = channel
  showModal.value = true
}

async function onSave(payload: {
  code: string
  name: string
  supportedMediaIds: string[]
  contactName?: string | null
  telegramReference?: string | null
  note?: string | null
}) {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) {
      await channelService.updateChannel(editing.value.id, {
        name: payload.name,
        supportedMediaIds: payload.supportedMediaIds,
        contactName: payload.contactName,
        telegramReference: payload.telegramReference,
        note: payload.note
      })
      toast.add({ title: '已更新渠道', icon: 'i-lucide-check', color: 'success' })
    } else {
      await channelService.createChannel(payload)
      toast.add({ title: '已创建渠道', icon: 'i-lucide-check', color: 'success' })
    }
    showModal.value = false
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

async function onToggleStatus(channel: Channel) {
  const next = channel.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await channelService.setChannelStatus(channel.id, next)
    toast.add({
      title: next === 'ACTIVE' ? '已启用渠道' : '已停用渠道',
      description: `${channel.name} → ${next}`,
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

watch(
  [highlightId, channels],
  ([id, rows]) => {
    if (!id || !rows.length) return
    const match = rows.find(item => item.id === id)
    if (match) openEdit(match)
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="渠道"
      description="编制渠道主数据。订单、财务与用量请在渠道中心查看。"
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <div class="flex flex-wrap gap-2 w-fit lg:ms-auto">
        <UButton
          label="去渠道中心"
          icon="i-lucide-git-branch"
          color="neutral"
          variant="outline"
          to="/channels"
        />
        <UButton
          label="新增渠道"
          icon="i-lucide-plus"
          color="neutral"
          @click="openCreate"
        />
      </div>
    </UPageCard>

    <div v-if="pending" class="rounded-lg border border-default p-6 text-sm text-muted">
      加载中…
    </div>

    <div
      v-else-if="!channels.length"
      class="rounded-lg border border-dashed border-default p-6 text-sm text-muted"
    >
      暂无渠道。点击「新增渠道」创建。
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <UTable :data="channels" :columns="columns" class="shrink-0">
        <template #code-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
        </template>
        <template #media-cell="{ row }">
          <span class="text-sm text-muted">
            {{ mediaLabels(row.original.supportedMediaIds) }}
          </span>
        </template>
        <template #contactName-cell="{ row }">
          <span class="text-sm text-muted">
            {{ row.original.contactName ?? '—' }}
          </span>
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
              @click="openEdit(row.original)"
            />
            <UButton
              :label="row.original.status === 'ACTIVE' ? '停用' : '启用'"
              size="xs"
              :color="row.original.status === 'ACTIVE' ? 'warning' : 'success'"
              variant="ghost"
              @click="onToggleStatus(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <SettingsChannelFormModal
      v-model:open="showModal"
      :channel="editing"
      :media-platforms="mediaPlatforms"
      @save="onSave"
    />
  </div>
</template>
