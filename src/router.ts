import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'list' } | { name: 'settings' } | { name: 'import' } | { name: 'clients' }
  /** from: a map whose client data the new map starts with. */
  | { name: 'new'; from?: string }
  | { name: 'client'; id: string }

function parse(hash: string): Route {
  const m = hash.match(/^#\/client\/([\w-]+)/)
  if (m) return { name: 'client', id: m[1] }
  if (hash.startsWith('#/settings')) return { name: 'settings' }
  const from = hash.match(/^#\/new\/from\/([\w-]+)/)
  if (from) return { name: 'new', from: from[1] }
  if (hash.startsWith('#/new')) return { name: 'new' }
  if (hash.startsWith('#/clients')) return { name: 'clients' }
  if (hash.startsWith('#/import')) return { name: 'import' }
  return { name: 'list' }
}

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

export const useHash = () => useSyncExternalStore(subscribe, () => location.hash)
export const useRoute = () => parse(useHash())
export const navigate = (hash: string) => {
  location.hash = hash
  window.scrollTo({ top: 0 })
}
