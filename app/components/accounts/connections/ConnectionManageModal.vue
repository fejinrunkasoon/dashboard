<script setup lang="ts">
import type { MediaConnectionListItem } from '~/services'
import type { ConnectionAccount } from '~/domain'
import { accounts } from '~/mocks/entities'
import { connectionService } from '~/services'

const props = defineProps<{
  open: boolean
  connection: MediaConnectionListItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  reauth: []
  disconnect: []
  discoverAgain: []
}>()

const { userId } = useCurrentUser()
const links = ref<ConnectionAccount[]>([])
const loading = ref(false)

watch(() => [props.open, props.connection?.id] as const, async ([open, id]) => {
  if (!open || !id) {
    links.value = []
    return
  }
  loading.value = true
  try {
    links.value = await connectionService.listConnectionAccounts(id)
  } finally {
    loading.value = false
  }
}, { immediate: true })

function accountName(mediaAccountId: string) {
  const acc = accounts.find(a => a.id === mediaAccountId)
  return acc?.name || acc?.externalAccountId || mediaAccountId
}

async function setPrimary(caId: string) {
  await connectionService.setPrimarySyncSource(caId, userId.value)
  if (props.connection) {
    links.value = await connectionService.listConnectionAccounts(props.connection.id)
  }
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <UCard v-if="connection">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">
                {{ connection.displayName }}
              </h3>
              <p class="text-sm text-muted mt-0.5">
                {{ connection.teamName }} · {{ connection.authorizedByName }}
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="emit('update:open', false)"
            />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">
            <UBadge
              :color="connection.status === 'MOCK' || connection.status === 'ACTIVE' ? 'success' : 'warning'"
              variant="subtle"
            >
              {{ connection.status === 'MOCK' ? 'MOCK · TEST ONLY' : connection.status }}
            </UBadge>
            <UBadge
              v-if="connection.isMock"
              color="neutral"
              variant="subtle"
            >
              无真实 Token
            </UBadge>
          </div>

          <div>
            <h4 class="text-sm font-medium mb-2">
              已关联账户（Connection ↔ Account）
            </h4>
            <div
              v-if="loading"
              class="text-sm text-muted"
            >
              加载中…
            </div>
            <ul
              v-else-if="links.length"
              class="divide-y divide-default rounded-md border border-default"
            >
              <li
                v-for="ca in links"
                :key="ca.id"
                class="flex items-center justify-between gap-2 p-2.5 text-sm"
              >
                <div>
                  <p class="font-medium text-highlighted">
                    {{ accountName(ca.mediaAccountId) }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ ca.providerAccessStatus }}
                    <template v-if="ca.isPrimarySyncSource">
                      · Primary Sync
                    </template>
                  </p>
                </div>
                <UButton
                  v-if="!ca.isPrimarySyncSource"
                  size="xs"
                  variant="soft"
                  label="设为同步主源"
                  @click="setPrimary(ca.id)"
                />
                <UBadge
                  v-else
                  size="sm"
                  color="primary"
                  variant="subtle"
                >
                  主同步源
                </UBadge>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              尚未接入账户。可重新发现并导入。
            </p>
          </div>

          <div class="flex flex-wrap gap-2 justify-end">
            <UButton
              label="再次发现"
              variant="soft"
              icon="i-lucide-radar"
              @click="emit('discoverAgain')"
            />
            <UButton
              label="重新授权"
              variant="soft"
              color="warning"
              @click="emit('reauth')"
            />
            <UButton
              label="断开连接"
              color="error"
              variant="soft"
              @click="emit('disconnect')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
