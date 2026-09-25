<script setup lang="ts">
useSeoMeta({ title: '媒体平台开通' })

const toast = useToast()
const {
  platforms,
  connectable,
  pending,
  errorMessage,
  refresh,
  appForMedia,
  saveApp,
  setPlatformStatus
} = usePlatformApps()

await refresh()

const editingMediaId = ref<string | null>(null)
const formAppId = ref('')
const formSecret = ref('')
const formDeveloperToken = ref('')
const saving = ref(false)

const presetPlatforms = computed(() =>
  platforms.value.filter(p => ['META', 'GOOGLE', 'TIKTOK', 'SNAPCHAT'].includes(p.code))
)

function connectInfo(mediaId: string) {
  return connectable.value.find(c => c.mediaId === mediaId)
}

function openEdit(mediaId: string) {
  const app = appForMedia(mediaId)
  editingMediaId.value = mediaId
  formAppId.value = app?.appId ?? ''
  formSecret.value = ''
  formDeveloperToken.value = ''
}

function closeEdit() {
  editingMediaId.value = null
}

async function onSave() {
  if (!editingMediaId.value || saving.value) return
  if (!formAppId.value.trim()) {
    toast.add({ title: '请填写 App ID', color: 'error' })
    return
  }
  const existing = appForMedia(editingMediaId.value)
  if (!existing?.hasSecret && !formSecret.value.trim()) {
    toast.add({ title: '首次开通需填写 App Secret', color: 'error' })
    return
  }
  saving.value = true
  try {
    const media = platforms.value.find(p => p.id === editingMediaId.value)
    await saveApp({
      mediaId: editingMediaId.value,
      appId: formAppId.value.trim(),
      secret: formSecret.value.trim() || null,
      developerToken: media?.code === 'GOOGLE'
        ? (formDeveloperToken.value.trim() || null)
        : null,
      status: 'ACTIVE',
      isDefault: true
    })
    toast.add({ title: '已保存平台开通配置', color: 'success', icon: 'i-lucide-check' })
    closeEdit()
  } catch (error) {
    toast.add({
      title: '保存失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function onTogglePlatform(mediaId: string, enabled: boolean) {
  try {
    await setPlatformStatus(mediaId, enabled ? 'ACTIVE' : 'DISABLED')
    toast.add({
      title: enabled ? '已启用媒体' : '已停用媒体',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: '操作失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="媒体平台开通 · Control Plane"
      description="超级管理员：配置系统级 App ID / Secret（及 Google Developer Token）。业务用户到「账户中心 → 平台连接」OAuth。Secret 保存后不明文回显。"
      variant="naked"
      orientation="horizontal"
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="职责边界"
      description="本页只回答「系统会不会接某媒体」。客户有没有授权、发现/导入账户，在平台连接完成。"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      :title="errorMessage"
    >
      <template #description>
        <UButton label="重试" size="xs" color="neutral" variant="soft" class="mt-2" @click="refresh" />
      </template>
    </UAlert>

    <div class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="media in presetPlatforms"
        :key="media.id"
        class="rounded-lg border border-default p-4 space-y-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-semibold text-highlighted">
              {{ media.name }}
            </h3>
            <p class="text-xs text-muted mt-0.5">
              {{ media.code }} · {{ media.id }}
            </p>
          </div>
          <UBadge
            :color="media.status === 'ACTIVE' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ media.status }}
          </UBadge>
        </div>

        <div class="text-sm space-y-1">
          <p>
            <span class="text-muted">App 配置：</span>
            <template v-if="connectInfo(media.id)?.appConfigured">
              <span class="text-highlighted">已开通</span>
              <span class="text-muted text-xs ml-1">({{ appForMedia(media.id)?.appId }})</span>
            </template>
            <span v-else class="text-warning">未配置</span>
          </p>
          <p class="text-xs text-muted">
            回调：{{ appForMedia(media.id)?.redirectUriHint || `/api/oauth/${media.code.toLowerCase()}/callback` }}
          </p>
          <p v-if="!connectInfo(media.id)?.discoveryReady" class="text-xs text-muted">
            账户发现适配器：即将支持（UI 契约已齐，当前仅 Meta Mock/真 OAuth）
          </p>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <UButton
            size="sm"
            color="primary"
            :label="connectInfo(media.id)?.appConfigured ? '编辑凭据' : '开通'"
            :loading="pending"
            @click="openEdit(media.id)"
          />
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :label="media.status === 'ACTIVE' ? '停用媒体' : '启用媒体'"
            @click="onTogglePlatform(media.id, media.status !== 'ACTIVE')"
          />
        </div>

        <div
          v-if="editingMediaId === media.id"
          class="border-t border-default pt-3 space-y-3"
        >
          <UFormField label="应用 ID" required>
            <UInput v-model="formAppId" placeholder="服务商应用 / Client ID" class="w-full" />
          </UFormField>
          <UFormField :label="appForMedia(media.id)?.hasSecret ? '应用密钥（留空则不改）' : '应用密钥'">
            <UInput
              v-model="formSecret"
              type="password"
              placeholder="••••••••"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>
          <UFormField
            v-if="media.code === 'GOOGLE'"
            :label="appForMedia(media.id)?.hasDeveloperToken ? '开发者令牌（留空则不改）' : '开发者令牌'"
          >
            <UInput
              v-model="formDeveloperToken"
              type="password"
              placeholder="Google Ads 开发者令牌"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="取消" color="neutral" variant="ghost" @click="closeEdit" />
            <UButton label="保存" color="primary" :loading="saving" @click="onSave" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
