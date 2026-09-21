<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ExportColumn, ExportFormat } from '~/utils/export-table'
import { exportTable } from '~/utils/export-table'

const props = defineProps<{
  columns: ExportColumn[]
  filenamePrefix: string
  /** Resolve filtered rows at click time (full result set). */
  getRows: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[]
}>()

const toast = useToast()
const loading = ref(false)

const menuItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: '导出 CSV',
    icon: 'i-lucide-file-text',
    onSelect: () => { void runExport('csv') }
  },
  {
    label: '导出 Excel',
    icon: 'i-lucide-sheet',
    onSelect: () => { void runExport('xlsx') }
  }
]])

async function runExport(format: ExportFormat) {
  if (loading.value) return
  loading.value = true
  try {
    const rows = await props.getRows()
    if (!rows.length) {
      toast.add({
        title: '没有可导出的数据',
        description: '请调整筛选条件后再试',
        color: 'warning',
        icon: 'i-lucide-alert-circle'
      })
      return
    }
    await exportTable(rows, props.columns, props.filenamePrefix, format)
    toast.add({
      title: '导出成功',
      description: `${rows.length} 行 · ${format.toUpperCase()}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (error) {
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
  <UDropdownMenu :items="menuItems">
    <UButton
      icon="i-lucide-download"
      color="neutral"
      variant="soft"
      size="xs"
      label="导出"
      :loading="loading"
    />
  </UDropdownMenu>
</template>
