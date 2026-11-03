import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { createProfile, toSlug } from '../lib/auth.js'
import { connectDrive, disconnectDrive } from '../lib/drive.js'
import { createAlbum, myAlbums } from '../lib/albums.js'
import { RESERVED_SLUGS } from '../lib/profiles.js'
import { brl } from '../lib/checkout.js'
import { ORDER_STATUS, albumSummaries, computeKpis, myOrders, salesByAlbum, timeAgo } from '../lib/stats.js'
import AppShell from '../app/AppShell.jsx'
import { RevenueChart, Sparkline } from '../app/charts.jsx'
import PreviewImage from '../app/PreviewImage.jsx'
import { Alert, MODE_LABEL, Modal, MoneyInput, Page, Spinner, errorMessage } from '../app/ui.jsx'
import { Icon, ease, staggerChild, staggerParent } from '../components/shared.jsx'

export default function Dashboard() {
  const { profile } = useAuth()
  return profile ? <Home profile={profile} /> : <Onboarding />
}

/* ---------- Primeiro acesso: criar perfil ---------- */
function Onboarding() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [slug, setSlug] = useState(toSlug(user?.displayName ?? ''))
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!touchedSlug) setSlug(toSlug(name))
  }, [name, touchedSlug])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const clean = toSlug(slug)
    if (!name.trim()) return setError('Informe seu nome ou o nome do estúdio.')
    if (clean.length < 3) return setError('O endereço precisa ter pelo menos 3 caracteres.')
    if (RESERVED_SLUGS.includes(clean)) return setError('Esse endereço é reservado. Escolha outro.')
    setBusy(true)
    try {
      await createProfile({ displayName: name, slug: clean })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AppShell crumbs={[{ label: 'Primeiro acesso' }]} title="Bem-vindo à Fotly">
      <Page className="onboarding">
        <div className="app-card app-card--pad onboarding__card">
          <span className="onboarding__step">Passo 1 de 2</span>
          <h2 className="app-h2">Vamos criar sua página</h2>
          <p className="muted">Esse é o endereço que você vai mandar para os clientes.</p>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="name">Seu nome ou do estúdio</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="slug">Endereço da página</label>
              <div className="slug-input">
                <span>fotly.com.br/</span>
                <input
                  id="slug"
                  className="input"
                  value={slug}
                  onChange={(e) => {
                    setTouchedSlug(true)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                  maxLength={30}
                  required
                />
              </div>
              <p className="hint">Letras minúsculas, números e hífen.</p>
            </div>
            <Alert>{error}</Alert>
            <button type="submit" className="btn btn--accent btn--block" disabled={busy}>
              {busy && <Spinner size={18} />} Criar minha página
            </button>
          </form>
        </div>
      </Page>
    </AppShell>
  )
}

/* ---------- Painel ---------- */
const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

function Home({ profile }) {
  const [albums, setAlbums] = useState(null)
  const [orders, setOrders] = useState(null)
  const [days, setDays] = useState(30)
  const [newOpen, setNewOpen] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let alive = true
    myAlbums()
      .then(albumSummaries)
      .then((a) => alive && setAlbums(a))
      .catch((e) => {
        console.error(e)
        if (alive) (setLoadError(errorMessage(e)), setAlbums([]))
      })
    myOrders()
      .then((o) => alive && setOrders(o))
      .catch((e) => {
        console.error(e)
        if (alive) setOrders([])
      })
    return () => {
      alive = false
    }
  }, [])

  const kpis = useMemo(() => (orders ? computeKpis(orders, days) : null), [orders, days])
  const byAlbum = useMemo(() => (orders ? salesByAlbum(orders) : {}), [orders])
  const firstName = profile.displayName.split(' ')[0]
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const newAlbumBtn = (
    <button
      type="button"
      className="btn btn--accent btn--sm"
      onClick={() => setNewOpen(true)}
      disabled={!profile.driveConnected}
      title={profile.driveConnected ? undefined : 'Conecte o Google Drive primeiro'}
    >
      <Icon name="plus" size={16} stroke={2.4} /> <span className="hide-sm">Novo álbum</span>
    </button>
  )

  return (
    <AppShell crumbs={[{ label: 'Painel' }, { label: 'Visão geral' }]} actions={newAlbumBtn}>
      <Page>
        <div className="dash-hero">
          <div>
            <p className="dash-hero__date">{today}</p>
            <h2 className="app-h1">Olá, {firstName}</h2>
            <p className="muted">Aqui está o resumo das suas vendas e álbuns.</p>
          </div>
          <Segmented value={days} onChange={setDays} options={PERIODS.map((p) => ({ value: p.days, label: p.label }))} label="Período" />
        </div>

        <Alert>{loadError}</Alert>

        <Checklist profile={profile} albums={albums} orders={orders} onNewAlbum={() => setNewOpen(true)} />

        <motion.div className="kpi-grid" variants={staggerParent} initial="hidden" animate="show">
          <Kpi
            label="Receita"
            icon="money"
            value={kpis && brl(kpis.current.revenue)}
            delta={kpis?.delta.revenue}
            spark={kpis?.series.map((d) => d.revenue)}
          />
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
                  <span>{kpis.current.items} {kpis.current.items === 1 ? 'arquivo vendido' : 'arquivos vendidos'}</span>
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
          <section id="albuns" className="app-card" aria-labelledby="albums-title">
            <div className="app-card__head">
              <div>
                <h3 id="albums-title" className="app-card__title">Álbuns</h3>
                <p className="app-card__sub">
                  {albums ? `${albums.length} ${albums.length === 1 ? 'álbum' : 'álbuns'} · ${albums.reduce((s, a) => s + a.mediaCount, 0)} arquivos` : 'Carregando…'}
                </p>
              </div>
            </div>
            <AlbumList albums={albums} byAlbum={byAlbum} driveConnected={profile.driveConnected} onNew={() => setNewOpen(true)} />
          </section>

          <section id="vendas" className="app-card" aria-labelledby="orders-title">
            <div className="app-card__head">
              <div>
                <h3 id="orders-title" className="app-card__title">Pedidos recentes</h3>
                <p className="app-card__sub">Atualizado ao abrir o painel</p>
              </div>
            </div>
            <RecentOrders orders={orders} albums={albums} />
          </section>
        </div>

        <NewAlbumModal open={newOpen} onClose={() => setNewOpen(false)} />
      </Page>
    </AppShell>
  )
}

/* ---------- Peças do painel ---------- */
function Segmented({ value, onChange, options, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`seg__btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && <motion.span layoutId="seg-pill" className="seg__pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="seg__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

function Kpi({ label, icon, value, delta, deltaKind = 'pct', spark, hint }) {
  return (
    <motion.div variants={staggerChild} className="app-card kpi" title={hint}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      {value == null ? <Skeleton h={34} w="60%" /> : <p className="kpi__value">{value}</p>}
      <div className="kpi__foot">
        <Delta value={delta} kind={deltaKind} />
        {spark && <Sparkline values={spark} />}
      </div>
    </motion.div>
  )
}

function Delta({ value, kind }) {
  if (value === undefined) return <span className="delta delta--flat">&nbsp;</span>
  if (value === null) return <span className="delta delta--flat">sem base anterior</span>
  const text = kind === 'pp' ? `${Math.abs(Math.round(value * 100))} p.p.` : `${Math.abs(Math.round(value * 100))}%`
  const dir = value > 0.0049 ? 'up' : value < -0.0049 ? 'down' : 'flat'
  return (
    <span className={`delta delta--${dir}`}>
      {dir !== 'flat' && <Icon name={dir} size={14} stroke={2.4} />}
      {dir === 'flat' ? 'estável' : text}
      <span className="delta__vs">vs. período anterior</span>
    </span>
  )
}

function Skeleton({ h = 16, w = '100%' }) {
  return <span className="skeleton" style={{ height: h, width: w }} />
}

function Checklist({ profile, albums, orders, onNewAlbum }) {
  if (!albums || !orders) return null
  const steps = [
    { done: true, label: 'Criar sua página' },
    { done: !!profile.driveConnected, label: 'Conectar o Google Drive' },
    { done: albums.length > 0, label: 'Criar o primeiro álbum', action: profile.driveConnected && !albums.length ? onNewAlbum : null },
    { done: albums.some((a) => a.status === 'published'), label: 'Publicar um álbum' },
    { done: orders.some((o) => o.status === 'paid'), label: 'Fazer a primeira venda' },
  ]
  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null

  return (
    <motion.section className="app-card checklist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div className="checklist__head">
        <div>
          <h3 className="app-card__title">Primeiros passos</h3>
          <p className="app-card__sub">
            {done} de {steps.length} concluídos
          </p>
        </div>
        <div className="progress" aria-hidden="true">
          <motion.span className="progress__fill" initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 0.8, ease }} />
        </div>
      </div>
      <ol className="checklist__list">
        {steps.map((s) => (
          <li key={s.label} className={`checklist__item ${s.done ? 'is-done' : ''}`}>
            <span className="checklist__mark">{s.done && <Icon name="check" size={12} stroke={3} />}</span>
            {s.action ? (
              <button type="button" className="link-btn" onClick={s.action}>
                {s.label}
              </button>
            ) : (
              s.label
            )}
          </li>
        ))}
      </ol>
    </motion.section>
  )
}

function AlbumList({ albums, byAlbum, driveConnected, onNew }) {
  if (!albums) {
    return (
      <div className="rows">
        {[0, 1, 2].map((i) => (
          <div key={i} className="row">
            <Skeleton h={44} w={44} />
            <Skeleton h={14} w="50%" />
          </div>
        ))}
      </div>
    )
  }
  if (albums.length === 0) {
    return (
      <div className="empty empty--compact">
        <Icon name="albums" size={30} />
        <p className="empty__title">Nenhum álbum ainda</p>
        <p className="muted">{driveConnected ? 'Crie seu primeiro álbum e suba as fotos do último trabalho.' : 'Conecte o Google Drive para criar seu primeiro álbum.'}</p>
        {driveConnected && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onNew}>
            <Icon name="plus" size={16} /> Novo álbum
          </button>
        )}
      </div>
    )
  }
  return (
    <ul className="rows">
      {albums.map((a) => {
        const s = byAlbum[a.id]
        return (
          <li key={a.id}>
            <Link to={`/painel/album/${a.id}`} className="row row--link">
              <span className="row__thumb">{a.coverPath ? <PreviewImage path={a.coverPath} alt="" /> : <Icon name="image" size={18} />}</span>
              <span className="row__main">
                <span className="row__title">{a.title}</span>
                <span className="row__meta">
                  <span className={`status status--${a.status === 'published' ? 'good' : 'muted'}`}>{a.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                  {MODE_LABEL[a.mode]} · {a.mediaCount} {a.mediaCount === 1 ? 'item' : 'itens'} · {brl(a.defaultPrice)}
                </span>
              </span>
              <span className="row__end">
                <span className="row__value">{brl(s?.revenue ?? 0)}</span>
                <span className="row__meta">{s?.sales ?? 0} vendas</span>
              </span>
              <Icon name="chevron" size={16} className="row__chev" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function RecentOrders({ orders, albums }) {
  if (!orders) {
    return (
      <div className="rows">
        {[0, 1, 2].map((i) => (
          <div key={i} className="row">
            <Skeleton h={14} w="70%" />
          </div>
        ))}
      </div>
    )
  }
  const recent = orders.filter((o) => o.status !== 'failed').slice(0, 7)
  if (recent.length === 0) {
    return (
      <div className="empty empty--compact">
        <Icon name="receipt" size={30} />
        <p className="empty__title">Nenhum pedido ainda</p>
        <p className="muted">Quando um cliente gerar um Pix, o pedido aparece aqui.</p>
      </div>
    )
  }
  const titles = Object.fromEntries((albums ?? []).map((a) => [a.id, a.title]))
  return (
    <ul className="rows">
      {recent.map((o) => {
        const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'muted' }
        return (
          <li key={o.id} className="row">
            <span className="row__avatar" aria-hidden="true">
              {(o.buyerEmail ?? '?').charAt(0).toUpperCase()}
            </span>
            <span className="row__main">
              <span className="row__title">{o.buyerEmail}</span>
              <span className="row__meta">
                {titles[o.albumId] ?? 'Álbum'} · {o.items?.length ?? 0} {o.items?.length === 1 ? 'arquivo' : 'arquivos'} · {timeAgo(o.createdAt)}
              </span>
            </span>
            <span className="row__end">
              <span className="row__value">{brl(o.total ?? 0)}</span>
              <span className={`status status--${st.tone}`}>{st.label}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PageCard({ profile, albums }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/${profile.slug}`
  const published = albums?.filter((a) => a.status === 'published' && a.mode !== 'private').length ?? 0

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="app-card side-card">
      <div className="side-card__head">
        <span className="side-card__icon">
          <Icon name="globe" size={18} />
        </span>
        <div>
          <h3 className="app-card__title">Sua página</h3>
          <p className="app-card__sub">
            {published} {published === 1 ? 'álbum visível' : 'álbuns visíveis'}
          </p>
        </div>
      </div>
      <div className="url-box">
        <span className="url-box__text">fotly.com.br/{profile.slug}</span>
        <button type="button" className="icon-btn icon-btn--sm" onClick={copy} aria-label="Copiar link">
          <Icon name={copied ? 'check' : 'copy'} size={16} />
        </button>
      </div>
      <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm btn--block">
        Abrir página <Icon name="external" size={14} />
      </a>
    </section>
  )
}

function DriveCard({ profile }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function disconnect() {
    if (!confirm('Desconectar o Google Drive? Seus arquivos continuam no Drive, mas as vendas ficam paradas até você conectar de novo.')) return
    run(disconnectDrive)
  }

  const ok = profile.driveConnected
  return (
    <section className={`app-card side-card ${ok ? '' : 'side-card--attention'}`}>
      <div className="side-card__head">
        <span className={`side-card__icon ${ok ? 'side-card__icon--ok' : 'side-card__icon--accent'}`}>
          <Icon name={ok ? 'check' : 'drive'} size={18} stroke={ok ? 2.6 : 1.8} />
        </span>
        <div>
          <h3 className="app-card__title">Google Drive</h3>
          <p className="app-card__sub">{ok ? 'Conectado' : 'Necessário para vender'}</p>
        </div>
      </div>
      <p className="side-card__text">
        {ok ? (
          <>
            Seus originais ficam em <strong>Meu Drive › Fotly</strong>. A entrega é automática após o Pix.
          </>
        ) : (
          <>A Fotly cria a pasta <strong>Fotly</strong> e só enxerga o que você enviar por ela.</>
        )}
      </p>
      <Alert>{error}</Alert>
      {ok ? (
        <button type="button" className="btn btn--ghost btn--sm btn--block" onClick={disconnect} disabled={busy}>
          {busy && <Spinner size={14} />} Desconectar
        </button>
      ) : (
        <button type="button" className="btn btn--accent btn--sm btn--block" onClick={() => run(connectDrive)} disabled={busy}>
          {busy && <Spinner size={14} />} Conectar Drive
        </button>
      )}
    </section>
  )
}

/* ---------- Novo álbum ---------- */
const MODES = [
  { value: 'public', title: 'Público', text: 'Eventos e esportes. Qualquer pessoa com o link vê e compra.' },
  { value: 'private', title: 'Privado', text: 'Casamentos e ensaios. Galeria só do cliente (senha em breve).' },
  { value: 'store', title: 'Loja', text: 'Banco de imagens, vídeos e presets.' },
]

function NewAlbumModal({ open, onClose }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('public')
  const [price, setPrice] = useState(1500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Dê um nome ao álbum.')
    setBusy(true)
    setError('')
    try {
      const id = await createAlbum({ title, mode, defaultPrice: price })
      navigate(`/painel/album/${id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Novo álbum">
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="album-title">Nome do álbum</label>
          <input
            id="album-title"
            className="input"
            placeholder="Ex.: Casamento Ana & Pedro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        <fieldset className="field">
          <legend>Tipo</legend>
          <div className="mode-options">
            {MODES.map((m) => (
              <label key={m.value} className={`mode-option ${mode === m.value ? 'is-active' : ''}`}>
                <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} />
                <span className="mode-option__title">{m.title}</span>
                <span className="mode-option__text">{m.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="album-price">Preço por foto ou vídeo</label>
          <MoneyInput id="album-price" value={price} onChange={setPrice} />
          <p className="hint">Você pode mudar depois.</p>
        </div>

        <Alert>{error}</Alert>
        <button type="submit" className="btn btn--accent btn--block" disabled={busy}>
          {busy && <Spinner size={18} />} Criar álbum
        </button>
      </form>
    </Modal>
  )
}
