import { useEffect, useRef, useState } from 'react'
import type { Client } from '../types'
import { toMapData, useSettings } from '../store'
import { TEMPLATES } from './layout'
import { processLogo } from './logo'
import { drawMap, loadMapFonts, loadTemplate } from './render'

const logoCache = new Map<string, Promise<HTMLCanvasElement | null>>()
function cachedLogo(src: string, mode: Client['logoMode'], ink: string) {
  const key = `${mode}:${ink}:${src.length}:${src.slice(-64)}`
  if (!logoCache.has(key)) logoCache.set(key, processLogo(src, mode, ink))
  return logoCache.get(key)!
}

/** Live preview of a client's map, rendered at the element's size times the device pixel ratio. */
export function MapCanvas({ client, resolution = 2200, className = '' }: { client: Client; resolution?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const settings = useSettings()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const t = TEMPLATES[client.style]
      const [template] = await Promise.all([loadTemplate(client.style), loadMapFonts()])
      const logo = client.logo ? await cachedLogo(client.logo, client.logoMode, t.ink) : null
      if (cancelled || !ref.current) return
      const canvas = ref.current
      canvas.width = resolution
      canvas.height = Math.round((resolution * t.h) / t.w)
      drawMap(canvas, client.style, template, toMapData(client, settings), logo)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [client, settings, resolution])

  const t = TEMPLATES[client.style]
  return (
    <canvas
      ref={ref}
      className={`block h-auto w-full transition-opacity duration-700 ease-heavy ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ aspectRatio: `${t.w} / ${t.h}`, background: t.paper }}
    />
  )
}
