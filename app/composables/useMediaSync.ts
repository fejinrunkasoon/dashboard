import type { SyncJob, SyncLog } from '~/domain'
import { mediaSyncService, mediaService } from '~/services'
import type { MediaPlatform } from '~/domain'

/** Ops-only sync visibility — discovery/import live in 平台连接. */
export function useMediaSync() {
  const jobs = ref<SyncJob[]>([])
  const logs = ref<SyncLog[]>([])
  const platforms = ref<MediaPlatform[]>([])
  const selectedMediaId = ref<string | null>(null)
  const selectedJobId = ref<string | null>(null)
  const pending = ref(false)
  const errorMessage = ref('')

  const selectedJob = computed(() =>
    jobs.value.find(j => j.id === selectedJobId.value) ?? null
  )

  async function refresh() {
    pending.value = true
    errorMessage.value = ''
    try {
      platforms.value = await mediaService.getMediaPlatforms({ status: 'ACTIVE' })
      const [jobPage, logPage] = await Promise.all([
        mediaSyncService.getJobs({
          mediaId: selectedMediaId.value ?? undefined,
          page: 1,
          pageSize: 50
        }),
        mediaSyncService.getLogs({
          jobId: selectedJobId.value ?? undefined,
          page: 1,
          pageSize: 100
        })
      ])
      jobs.value = jobPage.data
      logs.value = logPage.data
      if (selectedJobId.value && !jobs.value.some(j => j.id === selectedJobId.value)) {
        selectedJobId.value = null
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      pending.value = false
    }
  }

  async function selectJob(id: string | null) {
    selectedJobId.value = id
    const logPage = await mediaSyncService.getLogs({
      jobId: id ?? undefined,
      page: 1,
      pageSize: 100
    })
    logs.value = logPage.data
  }

  async function setMediaFilter(mediaId: string | null) {
    selectedMediaId.value = mediaId
    selectedJobId.value = null
    await refresh()
  }

  return {
    jobs,
    logs,
    platforms,
    selectedMediaId,
    selectedJobId,
    selectedJob,
    pending,
    errorMessage,
    refresh,
    selectJob,
    setMediaFilter
  }
}
