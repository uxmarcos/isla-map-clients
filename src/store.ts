import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Client, Dangers, Lang, MapData } from './types'
import { currentEmail, supabase } from './supabase'

// Maps and settings live in Supabase (schema maps, tables maps and settings),
// shared by the whole team. These keys are the old browser-only storage, kept for importing.
const KEY = 'isla-map-clients:v1'
const SETTINGS_KEY = 'isla-map-settings:v1'

export interface Settings {
  /** Printed on the map and encoded in the QR, followed by /{slug}. */
  baseUrl: string
  defaultStages: Record<Lang, string[]>
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'app.isla.to',
  defaultStages: {
    en: ['Find your voice', 'Grow your ICP network', 'Show up every week', 'Warm the right buyers', 'Book the meetings'],
    pt: ['Encontre sua voz', 'Cresça sua rede de ICP', 'Apareça toda semana', 'Aqueça os compradores certos', 'Agende as reuniões'],
  },
}

/** What Isla does on each island, under the stage plaques. */
export const DEFAULT_NOTES: Record<Lang, string[]> = {
  en: [
    'Your Isla professional learns your voice',
    'Isla agents grow your ICP network',
    'Isla writes and schedules your posts',
    'Isla warms the buyers who notice you',
    'You approve. Isla sends the DM.',
  ],
  pt: [
    'Seu profissional Isla aprende sua voz',
    'Agentes da Isla crescem sua rede de ICP',
    'A Isla escreve e agenda seus posts',
    'A Isla aquece quem já notou você',
    'Você aprova. A Isla envia a DM.',
  ],
}

/** What Isla protects the client from, on the sea creatures. */
export const DEFAULT_DANGERS: Record<Lang, Dangers> = {
  // Empty by default: the labels only appear once someone writes them for this client.
  en: { kraken: '', whirlpool: '' },
  pt: { kraken: '', whirlpool: '' },
}

/** The whirlpool took over the whale's danger label. */
function migrateDangers(d: (Partial<Dangers> & { whale?: string }) | undefined, lang: Lang): Dangers {
  if (!d) return { ...DEFAULT_DANGERS[lang] }
  return { kraken: d.kraken ?? DEFAULT_DANGERS[lang].kraken, whirlpool: d.whirlpool ?? d.whale ?? DEFAULT_DANGERS[lang].whirlpool }
}

/** Fills in fields added after a map was saved: white, English, default notes and dangers. */
function migrateClient(c: Client): Client {
  const lang = c.lang ?? 'en'
  return {
    ...c,
    style: c.style ?? 'white',
    lang,
    stageNotes: c.stageNotes ?? [...DEFAULT_NOTES[lang]],
    start: c.start ?? '',
    dangers: migrateDangers(c.dangers, lang),
  }
}

function migrateSettings(s: Partial<Settings>): Settings {
  // Default stages used to be a single English list.
  const stages = Array.isArray(s.defaultStages) ? { ...DEFAULT_SETTINGS.defaultStages, en: s.defaultStages } : s.defaultStages
  return { ...DEFAULT_SETTINGS, ...s, defaultStages: { ...DEFAULT_SETTINGS.defaultStages, ...stages } }
}

export type SyncState =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'denied' } // signed in, but the email is not in allowed_emails
  | { state: 'error'; message: string }

let clients: Client[] = []
let settings: Settings = DEFAULT_SETTINGS
let sync: SyncState = { state: 'loading' }
let channel: RealtimeChannel | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const byNewest = (a: Client, b: Client) => b.createdAt - a.createdAt

function persistLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(clients))
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    alert('Não foi possível salvar: o armazenamento do navegador está cheio. Tente um logo menor.')
    console.error(e)
  }
}

function fail(e: unknown) {
  console.error(e)
  alert(`Não foi possível salvar no banco: ${e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)}`)
}

/** Loads everything for the signed-in user and listens for changes from teammates. */
export async function connect() {
  if (!supabase) {
    // Browser-only mode (REQUIRE_LOGIN off).
    clients = read<Client[]>(KEY, []).map(migrateClient).sort(byNewest)
    settings = migrateSettings(read<Partial<Settings>>(SETTINGS_KEY, {}))
    sync = { state: 'ready' }
    return emit()
  }
  sync = { state: 'loading' }
  emit()
  const member = await supabase.rpc('is_team_member')
  if (member.error) {
    sync = { state: 'error', message: member.error.message }
    return emit()
  }
  if (!member.data) {
    sync = { state: 'denied' }
    return emit()
  }
  const [maps, sett] = await Promise.all([
    supabase.from('maps').select('data'),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  if (maps.error || sett.error) {
    sync = { state: 'error', message: (maps.error ?? sett.error)!.message }
    return emit()
  }
  clients = maps.data.map((r) => migrateClient(r.data as Client)).sort(byNewest)
  settings = migrateSettings((sett.data?.data as Partial<Settings>) ?? {})
  sync = { state: 'ready' }
  emit()

  channel?.unsubscribe()
  channel = supabase
    .channel('map-studio')
    .on('postgres_changes', { event: '*', schema: 'maps', table: 'maps' }, (p) => {
      if (p.eventType === 'DELETE') clients = clients.filter((c) => c.id !== (p.old as { id: string }).id)
      else {
        const c = migrateClient((p.new as { data: Client }).data)
        clients = (clients.some((x) => x.id === c.id) ? clients.map((x) => (x.id === c.id ? c : x)) : [c, ...clients]).sort(byNewest)
      }
      emit()
    })
    .on('postgres_changes', { event: '*', schema: 'maps', table: 'settings' }, (p) => {
      if (p.eventType !== 'DELETE') settings = migrateSettings((p.new as { data: Partial<Settings> }).data)
      emit()
    })
    .subscribe()
}

export function disconnect() {
  channel?.unsubscribe()
  channel = null
  clients = []
  settings = DEFAULT_SETTINGS
  sync = { state: 'loading' }
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useSync = () => useSyncExternalStore(subscribe, () => sync)
export const useClients = () => useSyncExternalStore(subscribe, () => clients)
export const useSettings = () => useSyncExternalStore(subscribe, () => settings)
export const getClient = (id: string) => clients.find((c) => c.id === id)

export function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || 'company'
  let slug = root
  let i = 2
  while (clients.some((c) => c.slug === slug && c.id !== exceptId)) slug = `${root}-${i++}`
  return slug
}

/** A blank map, not saved until saveClient is called. */
export function newClient(): Client {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    company: '',
    slug: '',
    style: 'color',
    lang: 'en',
    goal: '$10M ARR',
    stages: [...settings.defaultStages.en],
    stageNotes: [...DEFAULT_NOTES.en],
    start: '',
    dangers: { ...DEFAULT_DANGERS.en },
    destination: '$10M ARR',
    logo: null,
    logoMode: 'ink',
    status: 'draft',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

/** A new map for the same client: everything personalised is kept (name, logo, goal, demo, texts); status starts over. */
export function mapFrom(c: Client): Client {
  const fresh = newClient()
  return { ...structuredClone(c), id: fresh.id, status: 'draft', notes: '', createdAt: fresh.createdAt, updatedAt: fresh.updatedAt }
}

const row = (c: Client) => ({ id: c.id, data: c, updated_at: new Date().toISOString(), updated_by: currentEmail() })

/** Inserts or replaces a map: shown right away, then written to the database. */
export async function saveClient(c: Client) {
  const saved = { ...c, slug: c.slug || uniqueSlug(c.company, c.id), updatedAt: Date.now() }
  clients = clients.some((x) => x.id === c.id) ? clients.map((x) => (x.id === c.id ? saved : x)) : [saved, ...clients]
  emit()
  if (!supabase) return persistLocal()
  const { error } = await supabase.from('maps').upsert(row(saved))
  if (error) fail(error)
}

/** Adds many new maps at once (batch import): one write to the database. */
export async function saveClients(list: Client[]) {
  const now = Date.now()
  // Same creation instant would scramble the order; keep the list's order, first on top.
  const saved = list.map((c, i) => ({ ...c, createdAt: now - i, updatedAt: now }))
  clients = [...saved, ...clients].sort(byNewest)
  emit()
  if (!supabase) return persistLocal()
  const { error } = await supabase.from('maps').upsert(saved.map(row))
  if (error) fail(error)
}

export async function deleteClient(id: string) {
  clients = clients.filter((c) => c.id !== id)
  emit()
  if (!supabase) return persistLocal()
  const { error } = await supabase.from('maps').delete().eq('id', id)
  if (error) fail(error)
}

let settingsTimer: ReturnType<typeof setTimeout> | undefined
/** Settings are edited per keystroke, so writes are debounced. */
export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  emit()
  if (!supabase) return persistLocal()
  clearTimeout(settingsTimer)
  settingsTimer = setTimeout(async () => {
    const { error } = await supabase!.from('settings').upsert({ id: 1, data: settings, updated_at: new Date().toISOString() })
    if (error) fail(error)
  }, 600)
}

/** Maps saved in this browser before the database existed. */
export function localMaps(): Client[] {
  if (!supabase) return [] // already the browser's own list
  const ids = new Set(clients.map((c) => c.id))
  return read<Client[]>(KEY, []).map(migrateClient).filter((c) => !ids.has(c.id))
}

/** Sends this browser's maps to the database, then forgets the local copy. */
export async function importLocalMaps() {
  const list = localMaps()
  if (!list.length) return 0
  const { error } = await supabase!.from('maps').upsert(list.map(row))
  if (error) throw error
  clients = [...clients, ...list].sort(byNewest)
  emit()
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // Nothing to clean up.
  }
  return list.length
}

export function toMapData(c: Client, s: Settings = settings): MapData {
  const slug = c.slug || 'company'
  const base = s.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return {
    lang: c.lang,
    company: c.company,
    stages: c.stages,
    stageNotes: c.stageNotes ?? DEFAULT_NOTES[c.lang ?? 'en'],
    start: c.start ?? '',
    dangers: migrateDangers(c.dangers, c.lang ?? 'en'),
    destination: c.destination,
    url: `${base}/${slug}`,
    qrUrl: `https://${base}/${slug}`,
  }
}
