// Peças reaproveitadas pelas páginas do painel.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { connectDrive, disconnectDrive } from '../lib/drive.js'
import { createAlbum } from '../lib/albums.js'
import { brl } from '../lib/checkout.js'
import { ORDER_STATUS, timeAgo } from '../lib/stats.js'
import { Sparkline } from './charts.jsx'
import PreviewImage from './PreviewImage.jsx'
import { useToast } from './toast.jsx'
import { Alert, ConfirmModal, MODE_LABEL, Modal, MoneyInput, Spinner, copyText, errorMessage } from './ui.jsx'
import { Icon, ease, staggerChild } from '../components/shared.jsx'

export function Segmented({ value, onChange, options, label, id = 'seg' }) {
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
          {value === o.value && <motion.span layoutId={`${id}-pill`} className="seg__pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="seg__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Kpi({ label, icon, value, delta, deltaKind = 'pct', spark, hint }) {
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

export function Skeleton({ h = 16, w = '100%' }) {
  return <span className="skeleton" style={{ height: h, width: w }} />
}

/** Cabeçalho de página do painel: título, texto e ações à direita. */
export function PageHead({ title, sub, children }) {
  return (
    <div className="dash-hero">
      <div>
        <h2 className="app-h1">{title}</h2>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="page-head__actions">{children}</div>}
    </div>
  )
}

export function Checklist({ profile, albums, orders, onNewAlbum }) {
  if (!albums || !orders) return null
  const steps = [
    { done: true, label: 'Criar sua página' },
    { done: !!profile.driveConnected, label: 'Conectar o Google Drive', to: profile.driveConnected ? null : '/painel/configuracoes' },
    { done: !!profile.page, label: 'Personalizar a página', to: profile.page ? null : '/painel/pagina' },
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
            ) : s.to ? (
              <Link to={s.to} className="link-btn">
                {s.label}
              </Link>
            ) : (
              s.label
            )}
          </li>
        ))}
      </ol>
    </motion.section>
  )
}

function RowsSkeleton({ thumb }) {
  return (
    <div className="rows">
      {[0, 1, 2].map((i) => (
        <div key={i} className="row">
          {thumb && <Skeleton h={44} w={44} />}
          <Skeleton h={14} w={thumb ? '50%' : '70%'} />
        </div>
      ))}
    </div>
  )
}

export function AlbumList({ albums, byAlbum, driveConnected, onNew, emptyText }) {
  if (!albums) return <RowsSkeleton thumb />
  if (albums.length === 0) {
    return (
      <div className="empty empty--compact">
        <Icon name="albums" size={30} />
        <p className="empty__title">{emptyText ?? 'Nenhum álbum ainda'}</p>
        {!emptyText && (
          <p className="muted">{driveConnected ? 'Crie seu primeiro álbum e suba as fotos do último trabalho.' : 'Conecte o Google Drive para criar seu primeiro álbum.'}</p>
        )}
        {!emptyText && driveConnected && onNew && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onNew}>
            <Icon name="plus" size={16} /> Novo álbum
          </button>
        )}
        {!emptyText && !driveConnected && (
          <Link to="/painel/configuracoes" className="btn btn--ghost btn--sm">
            Conectar Drive
          </Link>
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

export function OrderList({ orders, albums, max, emptyText }) {
  if (!orders) return <RowsSkeleton />
  const list = max ? orders.slice(0, max) : orders
  if (list.length === 0) {
    return (
      <div className="empty empty--compact">
        <Icon name="receipt" size={30} />
        <p className="empty__title">{emptyText ?? 'Nenhum pedido ainda'}</p>
        {!emptyText && <p className="muted">Quando um cliente gerar um Pix, o pedido aparece aqui.</p>}
      </div>
    )
  }
  const titles = Object.fromEntries((albums ?? []).map((a) => [a.id, a.title]))
  return (
    <ul className="rows">
      {list.map((o) => {
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

export function PageCard({ profile, albums }) {
  const toast = useToast()
  const url = `${window.location.origin}/${profile.slug}`
  const published = albums?.filter((a) => a.status === 'published' && a.mode !== 'private').length ?? 0

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
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => copyText(url, toast)} aria-label="Copiar link">
          <Icon name="copy" size={16} />
        </button>
      </div>
      <div className="side-card__row">
        <Link to="/painel/pagina" className="btn btn--ghost btn--sm">
          <Icon name="palette" size={14} /> Personalizar
        </Link>
        <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
          Abrir <Icon name="external" size={14} />
        </a>
      </div>
    </section>
  )
}

export function DriveCard({ profile }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function connect() {
    setBusy(true)
    try {
      await connectDrive()
      toast.success('Google Drive conectado', { description: 'A pasta Fotly está pronta no seu Drive.' })
    } catch (e) {
      toast.error('Não foi possível conectar o Drive', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    try {
      await disconnectDrive()
      toast.info('Google Drive desconectado', { description: 'Seus arquivos continuam no Drive.' })
    } catch (e) {
      toast.error('Não foi possível desconectar', { description: errorMessage(e) })
    }
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
      {ok ? (
        <button type="button" className="btn btn--ghost btn--sm btn--block" onClick={() => setConfirmOpen(true)}>
          Desconectar
        </button>
      ) : (
        <button type="button" className="btn btn--accent btn--sm btn--block" onClick={connect} disabled={busy}>
          {busy && <Spinner size={14} />} Conectar Drive
        </button>
      )}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={disconnect}
        title="Desconectar o Google Drive?"
        confirmLabel="Desconectar"
        danger
      >
        Seus arquivos continuam no Drive, mas as vendas ficam paradas até você conectar de novo.
      </ConfirmModal>
    </section>
  )
}

/* ---------- Novo álbum ---------- */
const MODES = [
  { value: 'public', title: 'Público', text: 'Eventos e esportes. Qualquer pessoa com o link vê e compra.' },
  { value: 'private', title: 'Privado', text: 'Casamentos e ensaios. Galeria só do cliente (senha em breve).' },
  { value: 'store', title: 'Loja', text: 'Banco de imagens, vídeos e presets.' },
]

export function NewAlbumModal({ open, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
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
      toast.success('Álbum criado', { description: 'Agora é só arrastar as fotos.' })
      navigate(`/painel/album/${id}`)
    } catch (err) {
      toast.error('Não foi possível criar o álbum', { description: errorMessage(err) })
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

/** Botão "Novo álbum" do topo (desligado sem Drive). */
export function NewAlbumButton({ profile, onClick }) {
  return (
    <button
      type="button"
      className="btn btn--accent btn--sm"
      onClick={onClick}
      disabled={!profile.driveConnected}
      title={profile.driveConnected ? undefined : 'Conecte o Google Drive primeiro'}
    >
      <Icon name="plus" size={16} stroke={2.4} /> <span className="hide-sm">Novo álbum</span>
    </button>
  )
}
