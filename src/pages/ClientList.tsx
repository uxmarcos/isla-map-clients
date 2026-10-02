import { useMemo, useState } from 'react'
import { importLocalMaps, localMaps, useClients } from '../store'
import { STATUS_LABEL, STATUS_ORDER, type Status } from '../types'
import { MapCard } from '../ui/MapCard'
import { downloadZip } from '../map/export'
import { Button, Rise } from '../ui/kit'
import { navigate } from '../router'
import { toast } from '../ui/toast'

type Filter = Status | 'all'

export function ClientList() {
  const clients = useClients()
  const [filter, setFilter] = useState<Filter>('all')
  const [zipping, setZipping] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const pending = useMemo(() => localMaps().length, [clients])

  async function runImport() {
    setImporting(true)
    try {
      const n = await importLocalMaps()
      toast(`${n} ${n === 1 ? 'mapa importado' : 'mapas importados'} para o banco da equipe.`)
    } catch (e) {
      toast(`Não foi possível importar: ${e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)}`, { tone: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const counts = useMemo(() => {
    const c = { all: clients.length } as Record<Filter, number>
    STATUS_ORDER.forEach((s) => (c[s] = clients.filter((x) => x.status === s).length))
    return c
  }, [clients])

  const shown = filter === 'all' ? clients : clients.filter((c) => c.status === filter)

  async function exportAll() {
    setZipping(`0/${shown.length}`)
    try {
      await downloadZip(shown, (n) => setZipping(`${n}/${shown.length}`))
    } finally {
      setZipping(null)
    }
  }

  return (
    <main className="container-page pb-32 pt-[calc(var(--nav-h)+72px)] md:pt-[calc(var(--nav-h)+96px)]">
      <section className="max-w-3xl">
        <p className="eyebrow eyebrow-line fade-up">Campanha do baú</p>
        <Rise text="Um mapa para cada *baú*." className="text-h1 mt-6" />
        <p className="text-lede fade-up mt-6 max-w-xl" style={{ animationDelay: '200ms' }}>
          Cadastre a empresa, o logo e a meta. O mapa sai pronto para imprimir, com o QR que leva à demo.
        </p>
        <div className="fade-up mt-8 flex flex-wrap gap-2 sm:hidden" style={{ animationDelay: '250ms' }}>
          <Button arrow onClick={() => navigate('#/new')}>
            Novo mapa
          </Button>
          <Button variant="ghost" onClick={() => navigate('#/import')}>
            Criar mapas em lote
          </Button>
        </div>
      </section>

      {pending > 0 && (
        <div className="card fade-up mt-12 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-[14px] text-grey-1">
            Este navegador tem {pending} {pending === 1 ? 'mapa salvo' : 'mapas salvos'} antes do banco da equipe. Importe para todo mundo ver.
          </p>
          <Button size="sm" variant="ghost" disabled={importing} onClick={runImport}>
            {importing ? 'Importando…' : 'Importar mapas'}
          </Button>
        </div>
      )}

      <section className="fade-up mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4" style={{ animationDelay: '300ms' }}>
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-ink px-6 py-6">
            <div className="font-display text-[52px] leading-none tracking-[-0.03em] tabular-nums">{counts[s]}</div>
            <div className="mt-3 text-[13px] text-grey-1">{STATUS_LABEL[s]}</div>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="glass -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
            {(['all', ...STATUS_ORDER] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] transition-colors duration-500 ease-heavy ${filter === f ? 'bg-porcelain text-ink' : 'text-grey-1 hover:text-porcelain'}`}
              >
                {f === 'all' ? 'Todos' : STATUS_LABEL[f]} <span className="opacity-50">{counts[f]}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" disabled={!shown.length || !!zipping} onClick={exportAll}>
            {zipping ? `Gerando PDFs ${zipping}` : `Baixar PDFs (.zip)`}
          </Button>
        </div>

        {shown.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center rounded-3xl px-6 py-20 text-center">
            <h2 className="text-h3">
              {clients.length ? 'Nada aqui por enquanto.' : <>O primeiro mapa <em>começa aqui</em>.</>}
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-grey-1">
              {clients.length ? 'Nenhum mapa com esse status.' : 'Crie um mapa, preencha os dados da empresa e baixe o arquivo para impressão.'}
            </p>
            {!clients.length && (
              <Button className="mt-8" arrow onClick={() => navigate('#/new')}>
                Criar o primeiro mapa
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((c, i) => (
              <li key={c.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <MapCard client={c} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
