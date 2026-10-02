// Logos live in the private `maps-logos` bucket, at <map id>/<content hash>.<ext>; map rows keep
// only the path. In memory every map still carries its logo as a data URL, so rendering stays sync.
import type { SupabaseClient } from '@supabase/supabase-js'

/** Only Storage is used here, whatever database schema the client is set to. */
type Sb = Pick<SupabaseClient, 'storage'>

export const LOGO_BUCKET = 'maps-logos'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' }

async function hash(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Path the logo has (or will have) in the bucket: same image, same path, so re-saving uploads nothing. */
export async function logoPathFor(mapId: string, dataUrl: string) {
  const type = dataUrl.slice(5, dataUrl.indexOf(';'))
  return `${mapId}/${await hash(dataUrl)}.${EXT[type] ?? 'png'}`
}

export async function uploadLogo(sb: Sb, path: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob()
  const { error } = await sb.storage.from(LOGO_BUCKET).upload(path, blob, { contentType: blob.type, upsert: true })
  if (error) throw error
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

const cache = new Map<string, Promise<string | null>>()

/** Downloads logos once per path (paths are content hashes, so they never go stale). */
export function downloadLogo(sb: Sb, path: string): Promise<string | null> {
  if (!cache.has(path))
    cache.set(
      path,
      sb.storage
        .from(LOGO_BUCKET)
        .download(path)
        .then(({ data }) => (data ? blobToDataUrl(data) : null))
        .catch(() => null),
    )
  return cache.get(path)!
}

/** Removes a map's logo files, keeping `keep` (the current one) if given. */
export async function removeLogos(sb: Sb, mapId: string, keep?: string | null) {
  const { data } = await sb.storage.from(LOGO_BUCKET).list(mapId)
  const stale = (data ?? []).map((f) => `${mapId}/${f.name}`).filter((p) => p !== keep)
  if (stale.length) await sb.storage.from(LOGO_BUCKET).remove(stale)
}
