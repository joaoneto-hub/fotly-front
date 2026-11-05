import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { brl } from '../../lib/checkout.js'
import { computeKpis, salesByAlbum, topAlbums } from '../../lib/stats.js'
import AppShell from '../../app/AppShell.jsx'
import { RevenueChart } from '../../app/charts.jsx'
import {
  AlbumTiles,
  Checklist,
  DriveCard,
  Kpi,
  NewAlbumButton,
  NewAlbumModal,
  OrderList,
  PageCard,
  PendingBanner,
  Segmented,
  Skeleton,
  TopAlbums,
} from '../../app/dashboard-parts.jsx'
import { useAlbums, useOrders } from '../../app/useOwnerData.js'
import { Page } from '../../app/ui.jsx'
import { Icon, staggerParent } from '../../components/shared.jsx'

const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Overview() {
  const { profile } = useAuth()
  const [albums] = useAlbums()
  const [orders] = useOrders()
  const [days, setDays] = useState(30)
  const [newOpen, setNewOpen] = useState(false)

  const kpis = useMemo(() => (orders ? computeKpis(orders, days) : null), [orders, days])
  const byAlbum = useMemo(() => (orders ? salesByAlbum(orders) : {}), [orders])
  const top = useMemo(() => (orders ? topAlbums(orders, days) : null), [orders, days])
  const firstName = profile.displayName.split(' ')[0]
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const photos = albums?.reduce((s, a) => s + (a.mediaCount ?? 0), 0)

  return (
    <AppShell crumbs={[{ label: 'Painel' }, { label: 'Visão geral' }]} actions={<NewAlbumButton profile={profile} onClick={() => setNewOpen(true)} />}>
      <Page>
        <div className="dash-hero">
          <div>
            <p className="dash-hero__date">{today}</p>
            <h2 className="app-h1">
              {greeting()}, {firstName}
            </h2>
            <p className="muted">
              {albums ? (
                <>
                  {albums.length} {albums.length === 1 ? 'álbum' : 'álbuns'} · {photos.toLocaleString('pt-BR')} {photos === 1 ? 'arquivo' : 'arquivos'} na sua vitrine
                </>
              ) : (
                'Aqui está o resumo das suas vendas e álbuns.'
              )}
            </p>
          </div>
          <Segmented id="period" value={days} onChange={setDays} options={PERIODS} label="Período" />
        </div>

        <PendingBanner pending={kpis?.pending} />

        <Checklist profile={profile} albums={albums} orders={orders} onNewAlbum={() => setNewOpen(true)} />

        <motion.div className="kpi-grid" variants={staggerParent} initial="hidden" animate="show">
          <Kpi label="Receita" icon="money" value={kpis?.current.revenue} format={brl} delta={kpis?.delta.revenue} spark={kpis?.series.map((d) => d.revenue)} />
          <Kpi label="Vendas pagas" icon="receipt" value={kpis?.current.sales} delta={kpis?.delta.sales} spark={kpis?.series.map((d) => d.sales)} />
          <Kpi label="Ticket médio" icon="chart" value={kpis?.current.avgTicket} format={brl} delta={kpis?.delta.avgTicket} />
          <Kpi
            label="Pix pagos"
            icon="check"
            value={kpis ? (kpis.current.conversion == null ? null : kpis.current.conversion * 100) : undefined}
            format={(v) => `${Math.round(v)}%`}
            delta={kpis?.delta.conversion}
            deltaKind="pp"
            hint="Pedidos gerados que viraram pagamento"
          />
        </motion.div>

        <div className="dash-grid">
          <section className="app-card dash-grid__wide" aria-labelledby="rev-title">
            <div className="app-card__head">
              <div>
                <h3 id="rev-title" className="app-card__title">
                  Receita por dia
                </h3>
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
            {kpis ? <RevenueChart key={days} series={kpis.series} prevSeries={kpis.prevSeries} /> : <Skeleton h={260} />}
          </section>

          <section className="app-card" aria-labelledby="top-title">
            <div className="app-card__head">
              <div>
                <h3 id="top-title" className="app-card__title">
                  Álbuns que mais vendem
                </h3>
                <p className="app-card__sub">Receita nos últimos {days} dias</p>
              </div>
            </div>
            <TopAlbums top={top} albums={albums} days={days} />
          </section>
        </div>

        <section className="app-card" aria-labelledby="albums-title">
          <CardHead id="albums-title" title="Seus álbuns" sub="Os mais recentes primeiro" to="/painel/albuns" />
          <AlbumTiles albums={albums?.slice(0, 6) ?? null} byAlbum={byAlbum} driveConnected={profile.driveConnected} onNew={() => setNewOpen(true)} />
        </section>

        <div className="dash-grid">
          <section className="app-card dash-grid__wide" aria-labelledby="orders-title">
            <CardHead id="orders-title" title="Pedidos recentes" to="/painel/vendas" />
            <OrderList orders={orders?.filter((o) => o.status !== 'failed') ?? null} albums={albums} max={6} />
          </section>

          <div className="dash-grid__side">
            <PageCard profile={profile} albums={albums} />
            <DriveCard profile={profile} />
          </div>
        </div>

        <NewAlbumModal open={newOpen} onClose={() => setNewOpen(false)} />
      </Page>
    </AppShell>
  )
}

function CardHead({ id, title, sub, to }) {
  return (
    <div className="app-card__head">
      <div>
        <h3 id={id} className="app-card__title">
          {title}
        </h3>
        {sub && <p className="app-card__sub">{sub}</p>}
      </div>
      <Link to={to} className="card-link">
        Ver todos <Icon name="chevron" size={14} />
      </Link>
    </div>
  )
}
