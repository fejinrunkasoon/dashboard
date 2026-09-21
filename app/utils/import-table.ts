/**
 * Minimal CSV parser for Batch Import (STEP 22).
 * Supports UTF-8 BOM, quoted fields, and CRLF/LF.
 */

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** Parse one CSV line into fields (RFC-style quotes). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      fields.push(current)
      current = ''
      continue
    }
    current += ch
  }
  fields.push(current)
  return fields
}

/** Split text into logical CSV rows (respecting quoted newlines). */
export function splitCsvRows(text: string): string[] {
  const source = stripBom(text)
  const rows: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
      continue
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && source[i + 1] === '\n') i += 1
      if (current.trim().length > 0) rows.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim().length > 0) rows.push(current)
  return rows
}

export function parseCsv(text: string): { headers: string[], rows: Record<string, string>[] } {
  const lines = splitCsvRows(text)
  if (!lines.length) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0]!).map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!)
    const row: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]!
      if (!key) continue
      row[key] = (cells[c] ?? '').trim()
    }
    rows.push(row)
  }

  return { headers, rows }
}
