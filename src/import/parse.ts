// Reads an imported list into plain rows (column name -> text), before any interpretation.

export type RawRow = Record<string, string>

/** CSV (comma, semicolon or tab, quoted fields) or JSON (an array, or an object holding one). */
export function parseList(text: string, fileName = ''): RawRow[] {
  const src = text.replace(/^﻿/, '').trim()
  if (!src) return []
  const looksJson = /\.json$/i.test(fileName) || src.startsWith('[') || src.startsWith('{')
  return looksJson ? parseJson(src) : parseCsv(src)
}

function parseJson(src: string): RawRow[] {
  const data = JSON.parse(src) as unknown
  const list = Array.isArray(data)
    ? data
    : Object.values(data as Record<string, unknown>).find(Array.isArray) ?? [data]
  return (list as unknown[])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r))
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v).trim()])))
}

function parseCsv(src: string): RawRow[] {
  const firstLine = src.slice(0, src.indexOf('\n') === -1 ? undefined : src.indexOf('\n'))
  // Excel in Brazil saves with semicolons; pick whichever separator the header uses most.
  const sep = [',', ';', '\t'].reduce((a, b) => (count(firstLine, b) > count(firstLine, a) ? b : a))
  const table: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') cell += src[++i]
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      table.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  table.push(row)

  const [header, ...body] = table
  const keys = header.map((h, i) => h.trim() || `coluna ${i + 1}`)
  return body
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const count = (s: string, ch: string) => s.split(ch).length - 1
