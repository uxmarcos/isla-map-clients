import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import type { Client } from '../types'
import { toMapData } from '../store'
import { TEMPLATES } from './layout'
import { processLogo } from './logo'
import { drawMap, loadMapFonts, loadTemplate } from './render'
import { drawLetter, LETTER_H, LETTER_W, loadLetterFonts, loadPaper } from '../letter/render'
import { letterLogo, toLetterData } from '../letter/data'

// Print size: A4 landscape (the letter is A4 portrait).
export const PRINT_MM = { w: 297, h: 210 }

/** Renders a client's map at full template resolution. */
export async function renderFull(c: Client): Promise<HTMLCanvasElement> {
  const t = TEMPLATES[c.style]
  const [template] = await Promise.all([loadTemplate(c.style), loadMapFonts()])
  const logo = c.logo ? await processLogo(c.logo, c.logoMode, t.ink) : null
  const canvas = document.createElement('canvas')
  canvas.width = t.w
  canvas.height = t.h
  drawMap(canvas, c.style, template, toMapData(c), logo)
  return canvas
}

/** Renders a client's letter at full A4 resolution (300 dpi). */
export async function renderLetter(c: Client): Promise<HTMLCanvasElement> {
  const [paper, logo] = await Promise.all([loadPaper(c.style), letterLogo(c), loadLetterFonts()])
  const canvas = document.createElement('canvas')
  canvas.width = LETTER_W
  canvas.height = LETTER_H
  drawLetter(canvas, c.style, paper, toLetterData(c, logo))
  return canvas
}

const letterBase = (c: Client) => `${c.slug || 'company'}-letter-${c.style}-${c.lang}`

async function letterPdfBlob(c: Client): Promise<Blob> {
  const canvas = await renderLetter(c)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: `${c.company} — Letter`, creator: 'Isla Map Studio' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'NONE')
  return pdf.output('blob')
}

export async function downloadLetterPng(c: Client) {
  download(await toBlob(await renderLetter(c), 'image/png'), `${letterBase(c)}.png`)
}

export async function downloadLetterPdf(c: Client) {
  download(await letterPdfBlob(c), `${letterBase(c)}.pdf`)
}

const fileBase = (c: Client) => `${c.slug || 'company'}-treasure-map-${c.style}-${c.lang}`

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), type, quality))
}

async function pdfBlob(c: Client): Promise<Blob> {
  const canvas = await renderFull(c)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: `${c.company} — Treasure Map`, creator: 'Isla Map Studio' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PRINT_MM.w, PRINT_MM.h, undefined, 'NONE')
  return pdf.output('blob')
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function downloadPng(c: Client) {
  download(await toBlob(await renderFull(c), 'image/png'), `${fileBase(c)}.png`)
}

export async function downloadPdf(c: Client) {
  download(await pdfBlob(c), `${fileBase(c)}.pdf`)
}

export async function downloadZip(list: Client[], onProgress?: (done: number) => void) {
  const zip = new JSZip()
  for (let i = 0; i < list.length; i++) {
    zip.file(`${fileBase(list[i])}.pdf`, await pdfBlob(list[i]))
    zip.file(`${letterBase(list[i])}.pdf`, await letterPdfBlob(list[i]))
    onProgress?.(i + 1)
  }
  download(await zip.generateAsync({ type: 'blob' }), `isla-treasure-maps-${new Date().toISOString().slice(0, 10)}.zip`)
}
