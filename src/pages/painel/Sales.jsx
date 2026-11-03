import { useMemo, useState } from 'react'
import { brl } from '../../lib/checkout.js'
import AppShell from '../../app/AppShell.jsx'
import { OrderList, PageHead, Segmented } from '../../app/dashboard-parts.jsx'
import { useAlbums, useOrders } from '../../app/useOwnerData.js'
import { Page } from '../../app/ui.jsx'
import { Icon } from '../../components/shared.jsx'

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'other', label: 'Outros' },
]

const matches = (o, f) => f === 'all' || (f === 'other' ? !['paid', 'pending'].includes(o.status) : o.status === f)

export default function Sales() {
  const [albums] = useAlbums()
  const [orders, reload] = useOrders()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Pedidos que falharam ao gerar o Pix não interessam ao fotógrafo
  const real = useMemo(() => orders?.filter((o) => o.status !== 'failed') ?? null, [orders])
  const visible = useMemo(() => {
    if (!real) return null
    const q = search.trim().toLowerCase()
    return real.filter((o) => matches(o, filter) && (!q || (o.buyerEmail ?? '').includes(q)))
  }, [real, filter, search])

  const paid = real?.filter((o) => o.status === 'paid') ?? []
  const pending = real?.filter((o) => o.status === 'pending') ?? []
  const revenue = paid.reduce((s, o) => s + (o.total ?? 0), 0)

  return (
    <AppShell
      crumbs={[{ label: 'Painel', to: '/painel' }, { label: 'Vendas' }]}
      actions={
        <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
          <Icon name="clock" size={16} /> <span className="hide-sm">Atualizar</span>
        </button>
      }
    >
      <Page>
        <PageHead title="Vendas" sub="Todos os pedidos gerados nas suas páginas." />

        <div className="stat-strip stat-strip--3">
          <Stat label="Receita confirmada" value={real ? brl(revenue) : '—'} sub={`${paid.length} ${paid.length === 1 ? 'pedido pago' : 'pedidos pagos'}`} />
          <Stat
            label="Aguardando Pix"
            value={real ? pending.length : '—'}
            sub={real ? `${brl(pending.reduce((s, o) => s + (o.total ?? 0), 0))} em aberto` : ''}
          />
          <Stat
            label="Arquivos vendidos"
            value={real ? paid.reduce((s, o) => s + (o.items?.length ?? 0), 0) : '—'}
            sub="Entregues pelo seu Drive"
          />
        </div>

        <section className="app-card">
          <div className="toolbar">
            <label className="search">
              <Icon name="search" size={16} />
              <span className="sr-only">Buscar por e-mail</span>
              <input className="input" placeholder="Buscar por e-mail do cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <Segmented id="order-filter" value={filter} onChange={setFilter} options={FILTERS} label="Filtrar pedidos" />
          </div>
          <OrderList orders={visible} albums={albums} emptyText={filter !== 'all' || search.trim() ? 'Nenhum pedido com esse filtro' : undefined} />
        </section>
      </Page>
    </AppShell>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="app-card stat">
      <span className="kpi__label">{label}</span>
      <span className="stat__value">{value}</span>
      <span className="stat__sub">{sub}</span>
    </div>
  )
}
