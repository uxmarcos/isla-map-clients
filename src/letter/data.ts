import type { Client } from '../types'
import { toMapData, type Settings } from '../store'
import { processLogo } from '../map/logo'
import { letterText } from './copy'
import { LETTER_SPECS, type LetterData } from './render'

const logoCache = new Map<string, Promise<HTMLCanvasElement | null>>()

/** The client's logo in the letter's ink, as on the map (null when hidden or missing). */
export function letterLogo(c: Client): Promise<HTMLCanvasElement | null> {
  if (!c.logo) return Promise.resolve(null)
  const ink = LETTER_SPECS[c.style].ink
  const key = `${c.logoMode}:${ink}:${c.logo.length}:${c.logo.slice(-64)}`
  if (!logoCache.has(key)) logoCache.set(key, processLogo(c.logo, c.logoMode, ink))
  return logoCache.get(key)!
}

/** Everything the letter needs, taken from the map: company, logo, goal (the X) and the QR. */
export function toLetterData(c: Client, logo: HTMLCanvasElement | null, s?: Settings): LetterData {
  const map = toMapData(c, s)
  return { lang: c.lang, logo, text: letterText(c.lang, c.letter), company: c.company, goal: c.destination, url: map.url, qrUrl: map.qrUrl }
}
