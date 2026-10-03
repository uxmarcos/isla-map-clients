import { useState, type ReactNode } from 'react'
import { REQUIRE_LOGIN, signInWithPassword, signOut, supabase } from '../supabase'
import { QR_BASE } from '../qr'
import { Button, Mark, Rise } from '../ui/kit'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-24 text-center">
      <Mark className="fade-up mb-10 h-9 w-auto text-porcelain" />
      {children}
    </main>
  )
}

/** Env vars the Studio can't work without: Supabase, and the base of the gift links. */
export function missingSetup() {
  return [
    REQUIRE_LOGIN && !supabase && 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY',
    !QR_BASE && 'VITE_QR_BASE_URL (test: https://testv2.isla.to/gift, prod: https://gift.isla.to)',
  ].filter(Boolean) as string[]
}

export function Setup({ missing }: { missing: string[] }) {
  return (
    <Shell>
      <p className="eyebrow fade-up">Configuração pendente</p>
      <h1 className="text-h2 mt-6">
        Falta configurar o <em>ambiente</em>.
      </h1>
      <p className="text-lede mt-6 max-w-md">Defina no ambiente e publique de novo:</p>
      <ul className="mt-4 max-w-md text-[14px] text-grey-1">
        {missing.map((m) => (
          <li key={m} className="mt-1 font-mono">
            {m}
          </li>
        ))}
      </ul>
    </Shell>
  )
}

// Password only: the shared Auth's email template sends an 8-digit code, not a link, and the
// Studio's domain isn't in the Redirect URLs, so a magic link would never get back here.
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      await signInWithPassword(email.trim(), password)
      // The session change swaps this screen out.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(/invalid login credentials/i.test(msg) ? 'email ou senha incorretos.' : msg)
      setState('error')
    }
  }

  return (
    <Shell>
      <p className="eyebrow fade-up">Isla · Map Studio</p>
      <Rise text="Entre para abrir os *mapas*." className="text-h2 mt-6" />
      <form onSubmit={submit} className="fade-up mt-10 flex w-full max-w-sm flex-col gap-3" style={{ animationDelay: '200ms' }}>
        <input
          className="field text-center"
          type="email"
          required
          autoFocus
          placeholder="voce@isla.to"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field text-center"
          type="password"
          required
          placeholder="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button size="lg" arrow disabled={state === 'sending'}>
          {state === 'sending' ? 'Entrando…' : 'Entrar'}
        </Button>
        {state === 'error' && <p className="text-[13px] text-grey-1">Não foi possível entrar: {error}</p>}
      </form>
      <p className="fade-up mt-8 text-[12px] text-grey-2" style={{ animationDelay: '300ms' }}>
        Uso interno. Entre com a mesma conta de super admin do app da Isla.
      </p>
    </Shell>
  )
}

export function Denied({ email }: { email: string }) {
  return (
    <Shell>
      <p className="eyebrow">Sem acesso</p>
      <h1 className="text-h2 mt-6">
        Só para <em>super admins</em> da Isla.
      </h1>
      <p className="text-lede mt-6 max-w-md">
        {email} entrou, mas não é super admin da Isla. O Map Studio usa as mesmas contas do app da Isla; peça acesso de super admin para quem administra o app.
      </p>
      <Button variant="ghost" className="mt-8" onClick={() => signOut()}>
        Sair
      </Button>
    </Shell>
  )
}

export function SyncError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Shell>
      <p className="eyebrow">Erro de conexão</p>
      <h1 className="text-h2 mt-6">
        Não deu para carregar os <em>mapas</em>.
      </h1>
      <p className="text-lede mt-6 max-w-md">{message}</p>
      <div className="mt-8 flex gap-2">
        <Button onClick={retry}>Tentar de novo</Button>
        <Button variant="ghost" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
    </Shell>
  )
}
