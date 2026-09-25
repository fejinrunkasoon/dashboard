<script setup lang="ts">
import type { ExportColumn, ExportFormat, ExportRowSource } from '~/utils/export-table'
import {
  isExportAbortError,
  openExportSink,
  stampFilename,
  writeExportToSink
} from '~/utils/export-table'

const props = defineProps<{
  columns: ExportColumn[]
  filenamePrefix: string
  /**
   * Resolve filtered rows at click time.
   * Prefer returning an AsyncIterable of pages when the result set can be large.
   */
  getRows: () => ExportRowSource | Promise<ExportRowSource>
}>()

const toast = useToast()
const loading = ref(false)
const open = ref(false)

async function runExport(format: ExportFormat) {
  if (loading.value) return
  loading.value = true

  const filename = stampFilename(props.filenamePrefix, format)
  // Open the save target FIRST while the click still counts as user activation
  // (required by showSaveFilePicker; also avoids dropdown onSelect gesture loss).
  let sink: Awaited<ReturnType<typeof openExportSink>> | null = null
  try {
    sink = await openExportSink(filename, format)
    open.value = false
  } catch (error) {
    loading.value = false
    open.value = false
    if (isExportAbortError(error)) return
    toast.add({
      title: '导出失败',
      description: error instanceof Error ? error.message : '无法打开保存对话框',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }

  try {
    const source = await props.getRows()
    const count = await writeExportToSink(sink, source, props.columns, format)
    if (!count) {
      await sink.abort()
      toast.add({
        title: '没有可导出的数据',
        description: '请调整筛选条件后再试',
        color: 'warning',
        icon: 'i-lucide-alert-circle'
      })
      return
    }
    await sink.close()
    toast.add({
      title: '导出成功',
      description: `${count} 行 · ${format.toUpperCase()}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    await sink.abort().catch(() => {})
    if (isExportAbortError(error)) return
    toast.add({
      title: '导出失败',
      description: error instanceof Error ? error.message : '未知错误',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      icon="i-lucide-download"
      color="neutral"
      variant="soft"
      size="xs"
      label="导出"
      :loading="loading"
    />
    <template #content>
      <div class="flex flex-col gap-0.5 p-1 min-w-40">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-file-text"
          label="导出 CSV"
          class="justify-start"
          :disabled="loading"
          @click="runExport('csv')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-sheet"
          label="导出 Excel"
          class="justify-start"
          :disabled="loading"
          @click="runExport('xlsx')"
        />
      </div>
    </template>
  </UPopover>
</template>
