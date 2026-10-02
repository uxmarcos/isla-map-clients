import { useMemo, useState } from 'react'
import { slugify, toMapData, useClients, useSettings } from '../store'
import { LANG_LABEL, STATUS_LABEL, STYLE_LABEL, type Client } from '../types'
import { Button, Rise } from '../ui/kit'
import { navigate } from '../router'

/** A client is every map made for the same company; its details come from the latest one. */
interface Customer {
  key: string
  latest: Client
  maps: Client[]
}

function group(maps: Client[]): Customer[] {
  const by = new Map<string, Client[]>()
  for (const m of maps) {
    const key = slugify(m.company) || m.id
    by.set(key, [...(by.get(key) ?? []), m])
  }
  return [...by.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt)
      return { key, latest: sorted[0], maps: sorted }
    })
    .sort((a, b) => a.latest.company.localeCompare(b.latest.company, 'pt-BR'))
}

const date = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function Clients() {
  const maps = useClients()
  const settings = useSettings()
  const [q, setQ] = useState('')
  const customers = useMemo(() => group(maps), [maps])
  const needle = slugify(q)
  const shown = needle ? customers.filter((c) => c.key.includes(needle) || slugify(c.latest.destination).includes(needle)) : customers

  return (
    <main className="container-page pb-32 pt-[calc(var(--nav-h)+72px)] md:pt-[calc(var(--nav-h)+96px)]">
      <section className="max-w-3xl">
        <p className="eyebrow eyebrow-line fade-up">Clientes</p>
        <Rise text="Quem já tem *mapa*." className="text-h1 mt-6" />
        <p className="text-lede fade-up mt-6 max-w-xl" style={{ animationDelay: '200ms' }}>
          Cada empresa com mapa vira um cliente, com o nome, a meta, o logo e a demo do último mapa. Use para consultar ou para fazer outro mapa já preenchido.
        </p>
      </section>

      <section className="fade-up mt-14" style={{ animationDelay: '300ms' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <input className="field" type="search" value={q} placeholder="Buscar por empresa ou meta" onChange={(e) => setQ(e.target.value)} />
          </div>
          <p className="text-[13px] text-grey-2">
            {customers.length} {customers.length === 1 ? 'cliente' : 'clientes'} · {maps.length} {maps.length === 1 ? 'mapa' : 'mapas'}
          </p>
        </div>

        {shown.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center rounded-3xl px-6 py-20 text-center">
            <h2 className="text-h3">{customers.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda.'}</h2>
            <p className="mt-3 max-w-sm text-[15px] text-grey-1">
              {customers.length ? 'Tente outro nome.' : 'Quando você salvar o primeiro mapa, a empresa aparece aqui.'}
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {shown.map(({ key, latest: c, maps: list }) => (
              <li key={key} className="card rounded-3xl p-5 sm:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center">
                    {c.logo ? (
                      <img src={c.logo} alt={`Logo ${c.company}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[12px] text-grey-2">Sem logo</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-h3 truncate">{c.company || <span className="text-grey-2">Sem nome</span>}</h2>
                    <dl className="mt-3 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 xl:grid-cols-4">
                      <Field label="Meta" value={c.destination || '—'} />
                      <Field label="Demo" value={toMapData(c, settings).url} />
                      <Field label="Mapa" value={`${STYLE_LABEL[c.style]} · ${LANG_LABEL[c.lang]}`} />
                      <Field label="Atualizado" value={date(c.updatedAt)} />
                    </dl>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`#/client/${c.id}`)}>
                      Último mapa
                    </Button>
                    <Button size="sm" arrow onClick={() => navigate(`#/new/from/${c.id}`)}>
                      Novo mapa
                    </Button>
                  </div>
                </div>

                <div className="hairline-t mt-5 flex flex-wrap items-center gap-2 pt-4">
                  <span className="mr-1 text-[12px] text-grey-2">
                    {list.length} {list.length === 1 ? 'mapa' : 'mapas'}:
                  </span>
                  {list.map((m) => (
                    <a
                      key={m.id}
                      href={`#/client/${m.id}`}
                      className="rounded-full border border-line px-3 py-1 text-[12px] text-grey-1 transition-colors duration-500 ease-heavy hover:border-line-strong hover:text-porcelain"
                    >
                      {date(m.createdAt)} · {STATUS_LABEL[m.status]}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-grey-2">{label}</dt>
      <dd className="truncate text-porcelain">{value}</dd>
    </div>
  )
}
