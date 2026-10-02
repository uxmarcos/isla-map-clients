import type { LogoMode } from '../types'

const MAX_SIDE = 1200

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Reads an uploaded file and returns a PNG data URL no larger than MAX_SIDE. */
export async function fileToLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const w = img.naturalWidth || 800
    const h = img.naturalHeight || 800
    const k = Math.min(1, MAX_SIDE / Math.max(w, h))
    // SVGs without intrinsic size still rasterize well at MAX_SIDE.
    const scale = file.type === 'image/svg+xml' ? MAX_SIDE / Math.max(w, h) : k
    const c = document.createElement('canvas')
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Turns a logo into something that belongs on an engraved, black-and-white map.
 * - ink: single colour (the template's text colour). Transparent logos become a solid silhouette; logos on a
 *   white background are converted by darkness (light pixels drop out).
 * - gray: luminance only, original transparency.
 * Result is trimmed to its visible bounds.
 */
export async function processLogo(src: string, mode: LogoMode, ink: string): Promise<HTMLCanvasElement | null> {
  if (mode === 'hidden') return null
  const img = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const im = ctx.getImageData(0, 0, c.width, c.height)
  const d = im.data

  if (mode !== 'original') {
    let transparent = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++
    const hasAlpha = transparent / (d.length / 4) > 0.04
    const [ir, ig, ib] = hex(ink)
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      if (mode === 'gray') {
        d[i] = d[i + 1] = d[i + 2] = lum
        if (!hasAlpha) d[i + 3] = clamp(((245 - lum) / 200) * 255) // drop the white box
        continue
      }
      const a = hasAlpha ? d[i + 3] : clamp(((235 - lum) / 175) * 255)
      d[i] = ir
      d[i + 1] = ig
      d[i + 2] = ib
      d[i + 3] = a
    }
    ctx.putImageData(im, 0, 0)
  }
  return trim(c)
}

function trim(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d')!
  const { data } = ctx.getImageData(0, 0, c.width, c.height)
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return c
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, -x0, -y0)
  return out
}

const clamp = (v: number) => Math.max(0, Math.min(255, v))
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
