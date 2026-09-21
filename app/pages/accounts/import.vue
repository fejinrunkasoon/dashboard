<script setup lang="ts">
import { useBatchImport } from '~/composables/useBatchImport'

useSeoMeta({ title: '数据导入' })

const toast = useToast()

const {
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
} = useBatchImport()

await refresh()

const canConfirm = computed(() => {
  const job = selectedJob.value
  if (!job) return false
  if (job.status === 'COMMITTED') return false
  return job.stats.valid > 0
})

async function onFileSelected(file: File) {
  try {
    const text = await file.text()
    const job = await uploadCsv(text, file.name)
    toast.add({
      title: 'CSV 已解析',
      description: `合法 ${job.stats.valid} / 异常 ${job.stats.exception} / 共 ${job.stats.total}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: '上传失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onConfirm() {
  try {
    const result = await confirmImport()
    if (!result) return
    toast.add({
      title: '导入完成',
      description: `入库 ${result.imported} · 跳过 ${result.skipped} · 仍异常 ${result.exception}（未自动分配）`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: '确认导入失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onPatch(patches: Parameters<typeof patchExceptions>[0]) {
  try {
    const job = await patchExceptions(patches)
    if (!job) return
    toast.add({
      title: '已补录并重新校验',
      description: `合法 ${job.stats.valid} / 异常 ${job.stats.exception}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: '补录失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

async function onRevalidate() {
  try {
    const job = await revalidate()
    if (!job) return
    toast.add({
      title: '校验完成',
      description: `合法 ${job.stats.valid} / 异常 ${job.stats.exception}`,
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: '校验失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="数据导入" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <AccountsAccountCenterNav />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <div
          v-if="errorMessage"
          class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
        >
          {{ errorMessage }}
          <UButton
            class="ms-3"
            size="xs"
            variant="soft"
            label="重试"
            @click="refresh"
          />
        </div>

        <section class="rounded-lg border border-default p-4 space-y-4">
          <AccountsBatchImportWizard
            :jobs="jobs"
            :selected-job-id="selectedJobId"
            :pending="pending"
            :can-confirm="canConfirm"
            @select-job="selectJob"
            @download-template="downloadTemplate"
            @file-selected="onFileSelected"
            @confirm="onConfirm"
            @revalidate="onRevalidate"
          />

          <div
            v-if="selectedJob"
            class="flex flex-wrap gap-2 text-xs"
          >
            <UBadge
              :label="`状态 ${selectedJob.status}`"
              variant="subtle"
              color="neutral"
            />
            <UBadge
              :label="`合法 ${selectedJob.stats.valid}`"
              variant="subtle"
              color="success"
            />
            <UBadge
              :label="`异常 ${selectedJob.stats.exception}`"
              variant="subtle"
              color="warning"
            />
            <UBadge
              :label="`已导入 ${selectedJob.stats.imported}`"
              variant="subtle"
              color="primary"
            />
            <UBadge
              :label="`跳过 ${selectedJob.stats.skipped}`"
              variant="subtle"
              color="neutral"
            />
          </div>

          <AccountsBatchImportPreviewTable
            :rows="previewRows"
            :pending="pending"
          />
        </section>

        <section class="rounded-lg border border-default p-4">
          <AccountsImportExceptionQueue
            :rows="exceptionRows"
            :issue-filter="exceptionIssueFilter"
            :pending="pending"
            @update:issue-filter="setExceptionFilter"
            @patch="onPatch"
            @revalidate="onRevalidate"
          />
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
