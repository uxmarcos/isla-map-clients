import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Status } from '../types'
import { STATUS_LABEL } from '../types'
import { MARK_PATH } from '../map/islaMark'

type Variant = 'primary' | 'ghost' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-500 ease-heavy active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer'
const variants: Record<Variant, string> = {
  primary:
    'bg-porcelain text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:shadow-[0_0_40px_rgb(245_245_242/0.22)]',
  ghost: 'border border-line-strong text-porcelain hover:border-porcelain/50 hover:bg-porcelain/[0.04]',
  quiet: 'text-grey-1 hover:text-porcelain',
}
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-[13px]', md: 'h-11 px-5 text-[14px]', lg: 'h-[52px] px-7 text-[15px]' }

export function Button({
  variant = 'primary', size = 'md', arrow, className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  )
}

export const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 ease-heavy group-hover:translate-x-0.5">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.25" />
  </svg>
)

export const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 840 805" className={className} aria-hidden>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d={MARK_PATH}
    />
  </svg>
)

/** Heading whose words rise out of a mask. Wrap the emphasised phrase in *asterisks*. */
export function Rise({ text, as: Tag = 'h1', className = '' }: { text: string; as?: 'h1' | 'h2'; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean)
  let i = 0
  const words = (s: string, italic: boolean): ReactNode[] =>
    s.split(/(\s+)/).map((w, k) =>
      /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={`${i}-${k}`} className="rise-mask">
          <span className="rise-word" style={{ animationDelay: `${i++ * 60}ms` }}>
            {italic ? <em>{w}</em> : w}
          </span>
        </span>
      ),
    )
  return (
    <Tag className={className}>
      {parts.map((p) => (p.startsWith('*') ? words(p.slice(1, -1), true) : words(p, false)))}
    </Tag>
  )
}

/** Status colours: grey draft, blue ready to print, purple printed, green shipped. */
export const STATUS_DOT: Record<Status, string> = {
  draft: 'bg-[#8a8a8a]',
  ready: 'bg-[#5b9cf5] shadow-[0_0_8px_rgb(91_156_245/0.55)]',
  printed: 'bg-[#a77bf0] shadow-[0_0_8px_rgb(167_123_240/0.55)]',
  shipped: 'bg-[#4ccb7e] shadow-[0_0_8px_rgb(76_203_126/0.55)]',
}

export const StatusDot = ({ status }: { status: Status }) => <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />

export function StatusPill({ status, chevron }: { status: Status; chevron?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[12px] text-grey-1">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
      {chevron && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="-mr-0.5 opacity-60">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </span>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium text-porcelain">{children}</span>
      {hint && <span className="text-[12px] text-grey-2">{hint}</span>}
    </div>
  )
}
