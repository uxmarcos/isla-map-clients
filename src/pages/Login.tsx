import { useState, type ReactNode } from 'react'
import { sendMagicLink, signInWithPassword, signOut, supabase } from '../supabase'
import { Button, Mark, Rise } from '../ui/kit'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="container-page flex min-h-screen flex-col items-center justify-center py-24 text-center">
      <Mark className="fade-up mb-10 h-9 w-auto text-porcelain" />
      {children}
    </main>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  if (!supabase) {
    return (
      <Shell>
        <p className="eyebrow fade-up">Configuração pendente</p>
        <h1 className="text-h2 mt-6">
          Falta conectar o <em>banco</em>.
        </h1>
        <p className="text-lede mt-6 max-w-md">
          Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente e publique de novo.
        </p>
      </Shell>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      if (mode === 'password') {
        await signInWithPassword(email.trim(), password)
        return // the session change swaps this screen out
      }
      await sendMagicLink(email.trim())
      setState('sent')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // shouldCreateUser is off, so unknown emails are refused.
      setError(
        /invalid login credentials/i.test(msg)
          ? 'email ou senha incorretos.'
          : /signup|not allowed|not found/i.test(msg)
            ? 'este email não tem conta. Peça para alguém da equipe liberar seu acesso.'
            : msg,
      )
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <Shell>
        <p className="eyebrow fade-up">Link enviado</p>
        <Rise text="Confira seu *email*." className="text-h2 mt-6" />
        <p className="text-lede fade-up mt-6 max-w-md" style={{ animationDelay: '200ms' }}>
          Mandamos um link de acesso para {email.trim()}. Abra neste mesmo navegador.
        </p>
        <Button variant="quiet" size="sm" className="mt-8" onClick={() => setState('idle')}>
          Usar outro email
        </Button>
      </Shell>
    )
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
        {mode === 'password' && (
          <input
            className="field text-center"
            type="password"
            required
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <Button size="lg" arrow disabled={state === 'sending'}>
          {state === 'sending' ? (mode === 'password' ? 'Entrando…' : 'Enviando…') : mode === 'password' ? 'Entrar' : 'Receber link de acesso'}
        </Button>
        {state === 'error' && <p className="text-[13px] text-grey-1">Não foi possível entrar: {error}</p>}
        <button
          type="button"
          className="mt-1 cursor-pointer text-[13px] text-grey-2 transition-colors duration-500 hover:text-porcelain"
          onClick={() => {
            setMode(mode === 'password' ? 'link' : 'password')
            setState('idle')
          }}
        >
          {mode === 'password' ? 'Prefiro receber um link por email' : 'Entrar com senha'}
        </button>
      </form>
      <p className="fade-up mt-8 text-[12px] text-grey-2" style={{ animationDelay: '300ms' }}>
        Uso interno. Só emails liberados pela equipe têm acesso.
      </p>
    </Shell>
  )
}

export function Denied({ email }: { email: string }) {
  return (
    <Shell>
      <p className="eyebrow">Sem acesso</p>
      <h1 className="text-h2 mt-6">
        Este email ainda não está <em>liberado</em>.
      </h1>
      <p className="text-lede mt-6 max-w-md">
        {email} não está na lista da equipe. Peça para alguém adicionar você em maps.allowed_emails no Supabase.
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
