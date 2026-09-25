export interface ExportColumn {
  key: string
  header: string
}

export type ExportFormat = 'csv' | 'xlsx'

/** Rows may arrive all-at-once or as pages (preferred for large exports). */
export type ExportRowSource =
  | Record<string, unknown>[]
  | AsyncIterable<Record<string, unknown>[]>

const CSV_CHUNK_ROWS = 500
/** FileSaver.js uses ~40s; keep blob URL alive until the OS finishes the download. */
const BLOB_URL_REVOKE_MS = 40_000

function cellValue(row: Record<string, unknown>, key: string): string {
  const raw = row[key]
  if (raw == null) return ''
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const header = columns.map(col => escapeCsv(col.header)).join(',')
  const lines = rows.map(row =>
    columns.map(col => escapeCsv(cellValue(row, col.key))).join(',')
  )
  return `\uFEFF${[header, ...lines].join('\n')}`
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sheetXml(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const headerCells = columns.map((col, index) => {
    const ref = `${columnLetter(index)}1`
    return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(col.header)}</t></is></c>`
  }).join('')

  const dataRows = rows.map((row, rowIndex) => {
    const r = rowIndex + 2
    const cells = columns.map((col, colIndex) => {
      const ref = `${columnLetter(colIndex)}${r}`
      const value = xmlEscape(cellValue(row, col.key))
      return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`
    }).join('')
    return `<row r="${r}">${cells}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetData><row r="1">${headerCells}</row>${dataRows}</sheetData>`
    + `</worksheet>`
}

function columnLetter(index: number): string {
  let n = index
  let letter = ''
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

/** Minimal uncompressed ZIP for OOXML .xlsx (no external deps). */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function zipStore(files: { name: string, data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const crc = crc32(file.data)
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    ])
    localParts.push(localHeader, file.data)

    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    ])
    centralParts.push(central)
    offset += localHeader.length + file.data.length
  }

  const centralDir = concat(centralParts)
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ])

  return concat([...localParts, centralDir, end])
}

export function toXlsx(rows: Record<string, unknown>[], columns: ExportColumn[]): Blob {
  const encoder = new TextEncoder()
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
    + `<Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    + `</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
    + `</Relationships>`
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" `
    + `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + `<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`
    + `</Relationships>`

  const bytes = zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rels) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml(rows, columns)) }
  ])

  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export function stampFilename(prefix: string, format: ExportFormat): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${prefix}_${stamp}.${format}`
}

/** UTF-8 CSV blob with BOM. MIME is octet-stream so Windows won't auto-open Excel mid-download. */
export function toCsvBlob(rows: Record<string, unknown>[], columns: ExportColumn[]): Blob {
  const bytes = new TextEncoder().encode(toCsv(rows, columns))
  return new Blob([bytes], { type: 'application/octet-stream' })
}

export function isExportAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

type ExportSink = {
  write: (chunk: BufferSource | Blob | string) => Promise<void>
  close: () => Promise<void>
  abort: () => Promise<void>
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: { description: string, accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

function pickerTypes(format: ExportFormat) {
  if (format === 'xlsx') {
    return [{
      description: 'Excel 工作簿',
      accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
      }
    }]
  }
  return [{
    description: 'CSV',
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] }
  }]
}

/**
 * Anchor-tag fallback (Firefox / denied picker). Uses octet-stream + long-lived
 * object URL — same strategy as FileSaver.js — to avoid Chromium/Windows races
 * where text/csv is handed to Excel before the file lands in Downloads.
 */
export function downloadBlob(filename: string, blob: Blob) {
  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean
  }
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename)
    return
  }

  const forceDownload = blob.type === 'application/octet-stream'
    ? blob
    : new Blob([blob], { type: 'application/octet-stream' })

  const url = URL.createObjectURL(forceDownload)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  }))
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_MS)
}

function createBlobSink(filename: string): ExportSink {
  const parts: BlobPart[] = []
  let closed = false

  return {
    async write(chunk) {
      if (closed) throw new Error('Export sink already closed')
      parts.push(chunk)
    },
    async close() {
      if (closed) return
      closed = true
      downloadBlob(filename, new Blob(parts, { type: 'application/octet-stream' }))
    },
    async abort() {
      closed = true
      parts.length = 0
    }
  }
}

/**
 * Open a writable export target while user activation is still valid.
 * Prefer File System Access API (Chrome/Edge): writes straight to disk, no blob-URL race.
 * Fall back to buffered blob download when the picker is unavailable.
 */
export async function openExportSink(
  filename: string,
  format: ExportFormat
): Promise<ExportSink> {
  const w = window as SaveFilePickerWindow
  if (typeof w.showSaveFilePicker !== 'function') {
    return createBlobSink(filename)
  }

  try {
    const handle = await w.showSaveFilePicker({
      suggestedName: filename,
      types: pickerTypes(format)
    })
    const writable = await handle.createWritable()
    let closed = false
    return {
      async write(chunk) {
        if (closed) throw new Error('Export sink already closed')
        await writable.write(chunk)
      },
      async close() {
        if (closed) return
        closed = true
        await writable.close()
      },
      async abort() {
        if (closed) return
        closed = true
        await writable.abort()
      }
    }
  } catch (error) {
    if (isExportAbortError(error)) throw error
    // Permission denied / insecure context → soft-fallback to blob download
    return createBlobSink(filename)
  }
}

async function* iterateRowPages(source: ExportRowSource): AsyncGenerator<Record<string, unknown>[]> {
  if (Array.isArray(source)) {
    if (source.length) yield source
    return
  }
  for await (const page of source) {
    if (page.length) yield page
  }
}

function csvLine(row: Record<string, unknown>, columns: ExportColumn[]): string {
  return columns.map(col => escapeCsv(cellValue(row, col.key))).join(',')
}

/** Stream CSV (BOM + header + row pages) without building one giant string. */
export async function writeCsvToSink(
  sink: ExportSink,
  source: ExportRowSource,
  columns: ExportColumn[]
): Promise<number> {
  const encoder = new TextEncoder()
  const header = columns.map(col => escapeCsv(col.header)).join(',')
  await sink.write(encoder.encode(`\uFEFF${header}\n`))

  let total = 0
  let pending: Record<string, unknown>[] = []

  const flush = async () => {
    if (!pending.length) return
    const body = pending.map(row => csvLine(row, columns)).join('\n')
    await sink.write(encoder.encode(`${body}\n`))
    total += pending.length
    pending = []
  }

  for await (const page of iterateRowPages(source)) {
    for (const row of page) {
      pending.push(row)
      if (pending.length >= CSV_CHUNK_ROWS) await flush()
    }
  }
  await flush()
  return total
}

export async function writeXlsxToSink(
  sink: ExportSink,
  source: ExportRowSource,
  columns: ExportColumn[]
): Promise<number> {
  const rows: Record<string, unknown>[] = []
  for await (const page of iterateRowPages(source)) {
    rows.push(...page)
  }
  await sink.write(toXlsx(rows, columns))
  return rows.length
}

/**
 * Full export pipeline. Call `openExportSink` first (from the click handler)
 * when you need to fetch data asynchronously and still keep the save-picker gesture.
 */
export async function writeExportToSink(
  sink: ExportSink,
  source: ExportRowSource,
  columns: ExportColumn[],
  format: ExportFormat
): Promise<number> {
  if (format === 'csv') return writeCsvToSink(sink, source, columns)
  return writeXlsxToSink(sink, source, columns)
}

export async function exportTable(
  rows: ExportRowSource,
  columns: ExportColumn[],
  prefix: string,
  format: ExportFormat
): Promise<number> {
  const filename = stampFilename(prefix, format)
  const sink = await openExportSink(filename, format)
  try {
    const count = await writeExportToSink(sink, rows, columns, format)
    if (!count) {
      await sink.abort()
      return 0
    }
    await sink.close()
    return count
  } catch (error) {
    await sink.abort().catch(() => {})
    throw error
  }
}

/** Convenience for templates / small blobs that already exist. */
export async function saveBlob(filename: string, blob: Blob, format: ExportFormat): Promise<void> {
  const sink = await openExportSink(filename, format)
  try {
    await sink.write(blob)
    await sink.close()
  } catch (error) {
    await sink.abort().catch(() => {})
    throw error
  }
}
