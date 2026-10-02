import { createClient, type Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'

/**
 * Sign-in with the Isla product's Supabase Auth (same project), for Isla super admins only:
 * maps live in the `maps` schema (migration in isla-app) and RLS lets nobody else in.
 * Off = no login, maps saved only in this browser (local development without the env vars).
 */
export const REQUIRE_LOGIN = true

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Null when the env vars are missing; the app then explains how to configure it.
 * Data lives in the `maps` schema of the product's project.
 */
export const supabase = REQUIRE_LOGIN && url && key ? createClient(url, key, { db: { schema: 'maps' } }) : null

// Session as an external store so components re-render on sign in/out.
let session: Session | null = null
let ready = !supabase
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    session = data.session
    ready = true
    emit()
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    session = s
    ready = true
    emit()
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useSession = () => useSyncExternalStore(subscribe, () => session)
export const useAuthReady = () => useSyncExternalStore(subscribe, () => ready)
export const currentEmail = () => session?.user.email ?? null

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Shared Auth with the Isla product: never create users from here.
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
  })
  if (error) throw error
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export const signOut = () => supabase?.auth.signOut()
