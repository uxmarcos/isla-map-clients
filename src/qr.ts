// The QR on every map and letter opens the client's gift: a fixed link per company, shown and
// copied in isla-app's /admin/gifts (<base>/<slug>). The Studio only checks it and prints it.

/** First label of the company's email domain (abacatepay.com -> abacatepay), as isla-app makes it. */
const SLUG = /^[a-z0-9-]{1,40}$/

/** https, or http only for an isla-app running locally. */
const allowedBase = (u: URL) =>
  u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))

/** Where the gift links live (test: https://testv2.isla.to/gift, prod: https://gift.isla.to), without the final slash. */
function readBase(raw: string | undefined): string | null {
  const v = (raw ?? '').trim().replace(/\/+$/, '')
  try {
    const u = new URL(v)
    if (!allowedBase(u) || u.search || u.hash) return null
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}

export const QR_BASE = readBase(import.meta.env.VITE_QR_BASE_URL as string | undefined)

/** What a gift link looks like, for placeholders and messages. */
export const QR_EXAMPLE = `${QR_BASE ?? 'https://gift.isla.to'}/empresa`

const EXPECTED = `Use o link do presente do /admin/gifts: ${QR_EXAMPLE}`

export type QrCheck = { ok: true; url: string } | { ok: false; error: string }

/** Links from before the fixed per-company link: they no longer open anything. */
function isOldLink(u: URL) {
  const path = u.pathname.replace(/\/+$/, '')
  return (/\/gift$/.test(path) && u.searchParams.has('t')) || /(^|\/)q\//.test(u.pathname) || /\/gift\/expired$/.test(path)
}

/** Validates a gift link and gives it back normalized (no final slash, slug in lowercase): that is what gets saved and printed. */
export function checkQrUrl(value: string | undefined | null): QrCheck {
  if (!QR_BASE) return { ok: false, error: 'VITE_QR_BASE_URL não está configurada: o Studio não sabe qual link de presente aceitar.' }
  const v = (value ?? '').trim()
  if (!v) return { ok: false, error: 'Falta a URL do QR (copie do /admin/gifts da Isla).' }
  if (/\s/.test(v)) return { ok: false, error: `A URL do QR não pode ter espaços. ${EXPECTED}` }
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return { ok: false, error: `URL do QR inválida. ${EXPECTED}` }
  }
  if (isOldLink(url)) return { ok: false, error: `Este é um link antigo de presente e não funciona mais. ${EXPECTED}` }
  const base = new URL(QR_BASE)
  const prefix = base.pathname.replace(/\/+$/, '')
  const path = url.pathname.replace(/\/+$/, '')
  if (url.origin !== base.origin || url.search || url.hash || !path.startsWith(`${prefix}/`)) return { ok: false, error: EXPECTED }
  const slug = path.slice(prefix.length + 1).toLowerCase()
  if (!SLUG.test(slug)) return { ok: false, error: `O nome do presente no link só pode ter letras, números e hífen (até 40). ${EXPECTED}` }
  return { ok: true, url: `${QR_BASE}/${slug}` }
}

export const qrReady = (value: string | undefined | null) => checkQrUrl(value).ok

/** The normalized link when valid; otherwise the value as typed (trimmed), so nothing is lost. */
export function normalizeQrUrl(value: string | undefined | null) {
  const q = checkQrUrl(value)
  return q.ok ? q.url : (value ?? '').trim()
}
