import { createSharedComposable } from '@vueuse/core'
import type { Media, ProductType, AssetStatus } from '~/types'
import { alertService } from '~/services'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()

  const isNotificationsSlideoverOpen = ref(false)
  const openAlertCount = ref(0)

  async function refreshOpenAlertCount() {
    try {
      openAlertCount.value = await alertService.getOpenCount()
    } catch {
      openAlertCount.value = 0
    }
  }

  const globalFilter = reactive({
    media: null as Media | null,
    channelId: null as number | null,
    teamId: null as number | null,
    productType: null as ProductType | null,
    assetStatus: null as AssetStatus | null
  })

  function resetGlobalFilter() {
    globalFilter.media = null
    globalFilter.channelId = null
    globalFilter.teamId = null
    globalFilter.productType = null
    globalFilter.assetStatus = null
  }

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-c': () => router.push('/channels'),
    'g-a': () => router.push('/accounts'),
    'g-t': () => router.push('/teams'),
    'g-w': () => router.push('/alerts'),
    'g-s': () => router.push('/settings'),
    'n': () => isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value
  })

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
    void refreshOpenAlertCount()
  })

  return {
    isNotificationsSlideoverOpen,
    openAlertCount,
    refreshOpenAlertCount,
    globalFilter,
    resetGlobalFilter
  }
}

export const useDashboard = createSharedComposable(_useDashboard)