// The QR on every map and letter opens the client's gift through Isla's dynamic link
// (created in isla-app's /admin/gifts). The Studio prints that URL exactly as given.

/** Where Isla's short links live. Tighten to the final shape (e.g. https://app.isla.to/q/<code>) once confirmed. */
export const QR_HOST = 'app.isla.to'

export type QrCheck = { ok: true; warning?: string } | { ok: false; error: string }

export function checkQrUrl(value: string | undefined | null): QrCheck {
  const v = (value ?? '').trim()
  if (!v) return { ok: false, error: 'Falta a URL do QR (copie do /admin/gifts da Isla).' }
  if (/\s/.test(v)) return { ok: false, error: 'A URL do QR não pode ter espaços.' }
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return { ok: false, error: 'URL do QR inválida. Cole o link completo, começando com https://' }
  }
  if (url.protocol !== 'https:') return { ok: false, error: 'A URL do QR precisa começar com https://' }
  if (url.hostname !== QR_HOST) return { ok: true, warning: `O link não é do ${QR_HOST}. Confira se veio do /admin/gifts.` }
  return { ok: true }
}

export const qrReady = (value: string | undefined | null) => checkQrUrl(value).ok
