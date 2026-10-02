// Vercel function: fetches a logo URL from an imported list when the logo's site doesn't
// allow the browser to read it (CORS). Images only, small, public https hosts.
const MAX_BYTES = 5_000_000

const privateHost = (h: string) =>
  h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
  /^(\d+\.){3}\d+$/.test(h) || h.includes(':') // raw IPs (v4 and v6) are refused

export async function GET(request: Request) {
  const origin = request.headers.get('origin')
  const self = new URL(request.url)
  if (origin && new URL(origin).host !== self.host) return new Response('Origem não permitida.', { status: 403 })

  let url: URL
  try {
    url = new URL(self.searchParams.get('url') ?? '')
  } catch {
    return new Response('URL inválida.', { status: 400 })
  }
  if (url.protocol !== 'https:' || privateHost(url.hostname)) return new Response('Só URLs https públicas.', { status: 400 })

  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!res?.ok) return new Response('Não foi possível baixar o logo.', { status: 502 })
  const body = await res.arrayBuffer()
  if (body.byteLength > MAX_BYTES) return new Response('Imagem grande demais.', { status: 413 })
  let type = res.headers.get('content-type') ?? ''
  // Some hosts serve .svg files as text; trust the content when it is SVG markup.
  if (!type.startsWith('image/') && /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(new TextDecoder().decode(body.slice(0, 512)))) type = 'image/svg+xml'
  if (!type.startsWith('image/')) return new Response('O link não é uma imagem.', { status: 415 })
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'private, max-age=3600' } })
}
