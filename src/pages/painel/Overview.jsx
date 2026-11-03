import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { brl } from '../../lib/checkout.js'
import { computeKpis, salesByAlbum } from '../../lib/stats.js'
import AppShell from '../../app/AppShell.jsx'
import { RevenueChart } from '../../app/charts.jsx'
import {
  AlbumList,
  Checklist,
  DriveCard,
  Kpi,
  NewAlbumButton,
  NewAlbumModal,
  OrderList,
  PageCard,
  Segmented,
  Skeleton,
} from '../../app/dashboard-parts.jsx'
import { useAlbums, useOrders } from '../../app/useOwnerData.js'
import { Page } from '../../app/ui.jsx'
import { Icon, staggerParent } from '../../components/shared.jsx'

const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
]

export default function Overview() {
  const { profile } = useAuth()
  const [albums] = useAlbums()
  const [orders] = useOrders()
  const [days, setDays] = useState(30)
  const [newOpen, setNewOpen] = useState(false)

  const kpis = useMemo(() => (orders ? computeKpis(orders, days) : null), [orders, days])
  const byAlbum = useMemo(() => (orders ? salesByAlbum(orders) : {}), [orders])
  const firstName = profile.displayName.split(' ')[0]
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AppShell crumbs={[{ label: 'Painel' }, { label: 'Visão geral' }]} actions={<NewAlbumButton profile={profile} onClick={() => setNewOpen(true)} />}>
      <Page>
        <div className="dash-hero">
          <div>
            <p className="dash-hero__date">{today}</p>
            <h2 className="app-h1">Olá, {firstName}</h2>
            <p className="muted">Aqui está o resumo das suas vendas e álbuns.</p>
          </div>
          <Segmented value={days} onChange={setDays} options={PERIODS} label="Período" />
        </div>

        <Checklist profile={profile} albums={albums} orders={orders} onNewAlbum={() => setNewOpen(true)} />

        <motion.div className="kpi-grid" variants={staggerParent} initial="hidden" animate="show">
          <Kpi label="Receita" icon="money" value={kpis && brl(kpis.current.revenue)} delta={kpis?.delta.revenue} spark={kpis?.series.map((d) => d.revenue)} />
          <Kpi label="Vendas pagas" icon="receipt" value={kpis?.current.sales.toLocaleString('pt-BR')} delta={kpis?.delta.sales} spark={kpis?.series.map((d) => d.sales)} />
          <Kpi label="Ticket médio" icon="chart" value={kpis && brl(kpis.current.avgTicket)} delta={kpis?.delta.avgTicket} />
          <Kpi
            label="Pix pagos"
            icon="check"
            value={kpis && (kpis.current.conversion == null ? '—' : `${Math.round(kpis.current.conversion * 100)}%`)}
            delta={kpis?.delta.conversion}
            deltaKind="pp"
            hint="Pedidos gerados que viraram pagamento"
          />
        </motion.div>

        <div className="dash-grid">
          <section className="app-card dash-grid__wide" aria-labelledby="rev-title">
            <div className="app-card__head">
              <div>
                <h3 id="rev-title" className="app-card__title">Receita por dia</h3>
                <p className="app-card__sub">Pagamentos confirmados nos últimos {days} dias</p>
              </div>
              {kpis && (
                <div className="app-card__figure">
                  <strong>{brl(kpis.current.revenue)}</strong>
                  <span>
                    {kpis.current.items} {kpis.current.items === 1 ? 'arquivo vendido' : 'arquivos vendidos'}
                  </span>
                </div>
              )}
            </div>
            {kpis ? <RevenueChart series={kpis.series} /> : <Skeleton h={240} />}
          </section>

          <div className="dash-grid__side">
            <DriveCard profile={profile} />
            <PageCard profile={profile} albums={albums} />
          </div>
        </div>

        <div className="dash-grid dash-grid--even">
          <section className="app-card" aria-labelledby="albums-title">
            <CardHead id="albums-title" title="Álbuns recentes" to="/painel/albuns" />
            <AlbumList albums={albums?.slice(0, 5) ?? null} byAlbum={byAlbum} driveConnected={profile.driveConnected} onNew={() => setNewOpen(true)} />
          </section>

          <section className="app-card" aria-labelledby="orders-title">
            <CardHead id="orders-title" title="Pedidos recentes" to="/painel/vendas" />
            <OrderList orders={orders?.filter((o) => o.status !== 'failed') ?? null} albums={albums} max={6} />
          </section>
        </div>

        <NewAlbumModal open={newOpen} onClose={() => setNewOpen(false)} />
      </Page>
    </AppShell>
  )
}

function CardHead({ id, title, to }) {
  return (
    <div className="app-card__head">
      <h3 id={id} className="app-card__title">
        {title}
      </h3>
      <Link to={to} className="card-link">
        Ver todos <Icon name="chevron" size={14} />
      </Link>
    </div>
  )
}
