import type {
  BatchImportIssueCode,
  BatchImportJob,
  BatchImportRow,
  BatchImportRowStatus
} from '~/domain'
import type { PatchBatchImportRowInput } from '~/services'
import { batchImportService } from '~/services'

export function useBatchImport() {
  const jobs = ref<BatchImportJob[]>([])
  const selectedJobId = ref<string | null>(null)
  const previewRows = ref<BatchImportRow[]>([])
  const exceptionRows = ref<BatchImportRow[]>([])
  const exceptionIssueFilter = ref<BatchImportIssueCode | 'ALL'>('MISSING_ACCOUNT_ID')
  const pending = ref(false)
  const errorMessage = ref('')

  const selectedJob = computed(
    () => jobs.value.find(item => item.id === selectedJobId.value) ?? null
  )

  async function refreshJobs() {
    const result = await batchImportService.listJobs({ page: 1, pageSize: 50 })
    jobs.value = result.data
    if (!selectedJobId.value && result.data.length) {
      selectedJobId.value = result.data[0]!.id
    }
  }

  async function refreshRows() {
    if (!selectedJobId.value) {
      previewRows.value = []
      exceptionRows.value = []
      return
    }

    const all = await batchImportService.listRows({
      jobId: selectedJobId.value,
      page: 1,
      pageSize: 200
    })
    previewRows.value = all.data

    const exceptionQuery: {
      jobId: string
      rowStatuses: BatchImportRowStatus[]
      issueCodes?: BatchImportIssueCode[]
      page: number
      pageSize: number
    } = {
      jobId: selectedJobId.value,
      rowStatuses: ['EXCEPTION'],
      page: 1,
      pageSize: 200
    }
    if (exceptionIssueFilter.value !== 'ALL') {
      exceptionQuery.issueCodes = [exceptionIssueFilter.value]
    }
    const exceptions = await batchImportService.listRows(exceptionQuery)
    exceptionRows.value = exceptions.data
  }

  async function refresh() {
    pending.value = true
    errorMessage.value = ''
    try {
      await refreshJobs()
      await refreshRows()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      pending.value = false
    }
  }

  async function selectJob(id: string) {
    selectedJobId.value = id
    await refreshRows()
  }

  async function downloadTemplate(format: 'csv' | 'xlsx') {
    try {
      await batchImportService.downloadTemplate(format)
    } catch (error) {
      // User cancelled the save dialog — not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      throw error
    }
  }

  async function uploadCsv(text: string, filename: string) {
    pending.value = true
    errorMessage.value = ''
    try {
      const job = await batchImportService.createJobFromCsv(text, filename)
      await refreshJobs()
      selectedJobId.value = job.id
      await refreshRows()
      return job
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '上传失败'
      throw error
    } finally {
      pending.value = false
    }
  }

  async function revalidate() {
    if (!selectedJobId.value) return null
    pending.value = true
    try {
      const job = await batchImportService.validateJob(selectedJobId.value)
      await refreshJobs()
      await refreshRows()
      return job
    } finally {
      pending.value = false
    }
  }

  async function confirmImport() {
    if (!selectedJobId.value) return null
    pending.value = true
    try {
      const result = await batchImportService.confirmImport(selectedJobId.value)
      await refreshJobs()
      await refreshRows()
      return result
    } finally {
      pending.value = false
    }
  }

  async function patchExceptions(patches: PatchBatchImportRowInput[]) {
    if (!selectedJobId.value) return null
    pending.value = true
    try {
      const job = await batchImportService.patchExceptionRows(
        selectedJobId.value,
        patches
      )
      await refreshJobs()
      await refreshRows()
      return job
    } finally {
      pending.value = false
    }
  }

  async function setExceptionFilter(code: BatchImportIssueCode | 'ALL') {
    exceptionIssueFilter.value = code
    await refreshRows()
  }

  return {
    jobs,
    selectedJobId,
    selectedJob,
    previewRows,
    exceptionRows,
    exceptionIssueFilter,
    pending,
    errorMessage,
    refresh,
    selectJob,
    downloadTemplate,
    uploadCsv,
    revalidate,
    confirmImport,
    patchExceptions,
    setExceptionFilter
  }
}
