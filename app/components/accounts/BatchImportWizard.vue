<script setup lang="ts">
import type { BatchImportJob } from '~/domain'

defineProps<{
  jobs: BatchImportJob[]
  selectedJobId: string | null
  pending?: boolean
  canConfirm?: boolean
}>()

const emit = defineEmits<{
  selectJob: [id: string]
  downloadTemplate: [format: 'csv' | 'xlsx']
  fileSelected: [file: File]
  confirm: []
  revalidate: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('fileSelected', file)
  input.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          批量导入
        </h3>
        <p class="text-xs text-muted max-w-xl">
          下载 xlsx/csv 模板，按列填写后上传 CSV（本 Phase 仅解析 CSV）。
          确认导入后账户进入账户池（AVAILABLE），不会自动分配。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="模板 CSV"
          icon="i-lucide-download"
          size="sm"
          color="neutral"
          variant="soft"
          @click="emit('downloadTemplate', 'csv')"
        />
        <UButton
          label="模板 XLSX"
          icon="i-lucide-file-spreadsheet"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="emit('downloadTemplate', 'xlsx')"
        />
        <UButton
          label="上传 CSV"
          icon="i-lucide-upload"
          size="sm"
          :disabled="pending"
          @click="fileInput?.click()"
        />
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="onFileChange"
        >
      </div>
    </div>

    <div
      v-if="jobs.length"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-xs text-muted">
        导入任务
      </span>
      <UButton
        v-for="job in jobs"
        :key="job.id"
        size="xs"
        :variant="job.id === selectedJobId ? 'solid' : 'soft'"
        :color="job.id === selectedJobId ? 'primary' : 'neutral'"
        :label="`${job.sourceFilename} (${job.stats.valid}/${job.stats.total})`"
        @click="emit('selectJob', job.id)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        label="重新校验"
        size="sm"
        color="neutral"
        variant="soft"
        :disabled="pending || !selectedJobId"
        @click="emit('revalidate')"
      />
      <UButton
        label="确认导入合法行"
        icon="i-lucide-check"
        size="sm"
        :disabled="pending || !canConfirm"
        @click="emit('confirm')"
      />
    </div>
  </div>
</template>
