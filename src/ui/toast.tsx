// Small notices at the bottom of the screen, in place of the browser's alert().
import { useSyncExternalStore } from 'react'

interface Toast {
  id: number
  message: string
  /** Extra lines, e.g. which maps came in without a logo. */
  detail?: string[]
  tone: 'ok' | 'error'
  action?: { label: string; run: () => void }
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, opts: { detail?: string[]; tone?: Toast['tone']; action?: Toast['action']; duration?: number } = {}) {
  const t: Toast = { id: nextId++, message, detail: opts.detail, tone: opts.tone ?? 'ok', action: opts.action }
  toasts = [...toasts.slice(-2), t]
  emit()
  // Longer when there is something to read or undo.
  const ms = opts.duration ?? (t.action || t.detail?.length ? 8000 : t.tone === 'error' ? 7000 : 3500)
  setTimeout(() => dismiss(t.id), ms)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-[var(--gutter)]">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-md items-start gap-4 rounded-2xl border border-line-strong bg-ink-2 px-4 py-3 text-[14px] shadow-[0_24px_48px_-12px_rgb(0_0_0/0.8)] fade-in"
        >
          <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${t.tone === 'error' ? 'bg-[#ff8a7a]' : 'bg-[#4ccb7e]'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-porcelain">{t.message}</p>
            {t.detail?.length ? (
              <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto text-[12px] text-grey-1">
                {t.detail.map((d) => <li key={d}>{d}</li>)}
              </ul>
            ) : null}
          </div>
          {t.action && (
            <button
              type="button"
              className="shrink-0 cursor-pointer text-[13px] font-medium text-porcelain underline underline-offset-4"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Fechar aviso" className="shrink-0 cursor-pointer text-grey-2 hover:text-porcelain" onClick={() => dismiss(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
