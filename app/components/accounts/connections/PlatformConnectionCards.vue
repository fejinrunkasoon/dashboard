<script setup lang="ts">
import type { ConnectablePlatform } from '~/domain'
import type { PlatformConnectionSummary } from '~/services'

const props = defineProps<{
  summaries: PlatformConnectionSummary[]
  connectable: ConnectablePlatform[]
}>()

const emit = defineEmits<{
  add: [platformId: string]
  manage: [connectionId: string]
  reauth: [connectionId: string]
}>()

const { isOrgAdmin, isPlatformAdmin } = useCurrentUser()

/** Can open /settings 媒体平台开通 and configure PlatformApp. */
const canConfigureApps = computed(() => isOrgAdmin.value || isPlatformAdmin.value)

function statusColor(status: string) {
  if (status === 'ACTIVE' || status === 'MOCK') return 'success'
  if (status === 'REAUTH_REQUIRED' || status === 'EXPIRED') return 'warning'
  if (status === 'ERROR' || status === 'REVOKED' || status === 'DISCONNECTED') return 'error'
  return 'neutral'
}

function statusLabel(status: string) {
  if (status === 'MOCK') return 'MOCK · TEST ONLY'
  return status
}

function infoFor(platformId: string) {
  return props.connectable.find(c => c.mediaId === platformId)
}

function canConnect(platformId: string) {
  const info = infoFor(platformId)
  return Boolean(info?.platformEnabled && info.appConfigured)
}

/** Unconfigured / disabled media that should link to /settings. */
function needsSetup(platformId: string) {
  const info = infoFor(platformId)
  if (!info) return true
  return !info.platformEnabled || !info.appConfigured
}

function disableReason(platformId: string) {
  const info = infoFor(platformId)
  if (!info) return canConfigureApps.value ? '尚未开通，请先配置 App' : '未开通'
  if (!info.platformEnabled) {
    return canConfigureApps.value ? '媒体已停用，请先在系统管理启用' : '媒体已停用'
  }
  if (!info.appConfigured) {
    return canConfigureApps.value ? '尚未配置 App，请先开通' : '管理员尚未配置 App'
  }
  return ''
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div
      v-for="summary in summaries"
      :key="summary.platformId"
      class="rounded-lg border border-default p-4 flex flex-col gap-3"
      :class="{ 'opacity-70': !canConnect(summary.platformId) && summary.connectionCount === 0 }"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-semibold text-highlighted">
            {{ summary.platformName }} Ads
          </h3>
          <p class="text-sm text-muted mt-0.5">
            <template v-if="summary.connectionCount === 0">
              {{ canConnect(summary.platformId) ? '未连接' : disableReason(summary.platformId) }}
              <template v-if="!canConnect(summary.platformId) && needsSetup(summary.platformId)">
                ·
                <NuxtLink
                  to="/settings"
                  class="text-primary underline underline-offset-2"
                >
                  {{ canConfigureApps ? '去开通' : '媒体平台开通' }}
                </NuxtLink>
              </template>
            </template>
            <template v-else>
              {{ summary.connectionCount }} 个连接 · {{ summary.accountCount }} 个广告账户
            </template>
          </p>
          <p
            v-if="infoFor(summary.platformId) && !infoFor(summary.platformId)!.discoveryReady"
            class="text-xs text-muted mt-1"
          >
            发现能力即将支持
          </p>
        </div>
        <UButton
          v-if="canConnect(summary.platformId)"
          size="sm"
          color="primary"
          :label="summary.connectionCount === 0 ? `连接 ${summary.platformName}` : '添加连接'"
          icon="i-lucide-plus"
          @click="emit('add', summary.platformId)"
        />
        <UButton
          v-else-if="canConfigureApps && needsSetup(summary.platformId)"
          size="sm"
          color="primary"
          variant="soft"
          label="去开通"
          icon="i-lucide-settings"
          to="/settings"
        />
        <UButton
          v-else
          size="sm"
          color="primary"
          :label="summary.connectionCount === 0 ? `连接 ${summary.platformName}` : '添加连接'"
          icon="i-lucide-plus"
          disabled
        />
      </div>

      <ul
        v-if="summary.connections.length"
        class="flex flex-col gap-2 border-t border-default pt-3"
      >
        <li
          v-for="conn in summary.connections"
          :key="conn.id"
          class="flex flex-col gap-1.5 rounded-md bg-elevated/50 p-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-highlighted">{{ conn.displayName }}</span>
            <UBadge
              :color="statusColor(conn.status)"
              variant="subtle"
              size="sm"
            >
              {{ statusLabel(conn.status) }}
            </UBadge>
          </div>
          <p class="text-xs text-muted">
            所属团队 {{ conn.teamName }} · 授权人 {{ conn.authorizedByName }} · 账户 {{ conn.accountCount }}
          </p>
          <div class="flex gap-2 mt-1">
            <UButton
              size="xs"
              variant="soft"
              label="管理"
              @click="emit('manage', conn.id)"
            />
            <UButton
              v-if="conn.status === 'REAUTH_REQUIRED' || conn.status === 'EXPIRED'"
              size="xs"
              color="warning"
              variant="soft"
              label="重新授权"
              @click="emit('reauth', conn.id)"
            />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
