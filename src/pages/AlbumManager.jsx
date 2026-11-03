import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { publishAlbum, updateAlbum, uploadMedia, watchAlbum, watchMedia } from '../lib/albums.js'
import { brl } from '../lib/checkout.js'
import { myOrders, salesByAlbum } from '../lib/stats.js'
import AppShell from '../app/AppShell.jsx'
import { Alert, FullPageSpinner, MODE_LABEL, MoneyInput, Page, Spinner, errorMessage } from '../app/ui.jsx'
import PreviewImage from '../app/PreviewImage.jsx'
import { Icon, ease } from '../components/shared.jsx'

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm'

export default function AlbumManager() {
  const { albumId } = useParams()
  const { user, profile } = useAuth()
  const [album, setAlbum] = useState(undefined)
  const [media, setMedia] = useState([])
  const [sales, setSales] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => watchAlbum(albumId, setAlbum, (e) => (setError(errorMessage(e)), setAlbum(null))), [albumId])
  useEffect(() => watchMedia(albumId, setMedia, (e) => setError(errorMessage(e))), [albumId])
  useEffect(() => {
    myOrders()
      .then((orders) => setSales(salesByAlbum(orders)[albumId] ?? { revenue: 0, sales: 0 }))
      .catch(() => setSales({ revenue: 0, sales: 0 }))
  }, [albumId])

  if (album === undefined) return <FullPageSpinner />
  if (!album || album.ownerId !== user.uid) {
    return (
      <AppShell crumbs={[{ label: 'Álbuns', to: '/painel#albuns' }, { label: 'Não encontrado' }]}>
        <Page>
          <div className="empty">
            <p className="empty__title">Álbum não encontrado</p>
            <Alert>{error}</Alert>
            <Link to="/painel" className="btn btn--ghost btn--sm">
              Voltar ao painel
            </Link>
          </div>
        </Page>
      </AppShell>
    )
  }

  const photos = media.filter((m) => m.kind !== 'video').length
  const bytes = media.reduce((s, m) => s + (m.size ?? 0), 0)

  return (
    <AppShell crumbs={[{ label: 'Álbuns', to: '/painel#albuns' }, { label: album.title }]}>
      <Page>
        <AlbumHeader album={album} slug={profile?.slug} count={media.length} />
        <Alert>{error}</Alert>

        <div className="stat-strip">
          <Stat label="Arquivos" value={media.length} sub={`${photos} fotos · ${media.length - photos} vídeos`} />
          <Stat label="Tamanho no Drive" value={formatBytes(bytes)} sub="Originais em Meu Drive › Fotly" />
          <Stat label="Vendas" value={sales ? sales.sales : '—'} sub="Pedidos pagos" />
          <Stat label="Receita" value={sales ? brl(sales.revenue) : '—'} sub="Total confirmado" />
        </div>

        <div className="album-layout">
          <Uploader album={album} />
          <MediaGrid media={media} />
        </div>
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

function formatBytes(n) {
  if (!n) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toLocaleString('pt-BR', { maximumFractionDigits: i >= 3 ? 1 : 0 })} ${units[i]}`
}

function AlbumHeader({ album, slug, count }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const published = album.status === 'published'
  const shareable = published && album.mode !== 'private'
  const publicPath = `/${slug}/${album.id}`

  async function togglePublish() {
    if (!published && count === 0) return setError('Suba pelo menos um arquivo antes de publicar.')
    setBusy(true)
    setError('')
    try {
      await publishAlbum(album.id, !published)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function savePrice(cents) {
    if (cents === album.defaultPrice) return
    try {
      await updateAlbum(album.id, { defaultPrice: cents })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.origin + publicPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="app-card app-card--pad album-hero">
      <div className="album-hero__info">
        <div className="album-hero__badges">
          <span className={`status status--${published ? 'good' : 'muted'}`}>{published ? 'Publicado' : 'Rascunho'}</span>
          <span className="tag">{MODE_LABEL[album.mode]}</span>
        </div>
        <h2 className="app-h1">{album.title}</h2>
        {shareable ? (
          <div className="url-box url-box--inline">
            <span className="url-box__text">fotly.com.br{publicPath}</span>
            <button type="button" className="icon-btn icon-btn--sm" onClick={copyLink} aria-label="Copiar link">
              <Icon name={copied ? 'check' : 'copy'} size={16} />
            </button>
            <Link to={publicPath} target="_blank" rel="noreferrer" className="icon-btn icon-btn--sm" aria-label="Abrir página">
              <Icon name="external" size={16} />
            </Link>
          </div>
        ) : (
          <p className="hint">
            {album.mode === 'private'
              ? 'Galerias privadas com senha chegam em breve. Por enquanto, este álbum não aparece publicamente.'
              : 'Publique para gerar o link de venda.'}
          </p>
        )}
      </div>

      <div className="album-hero__actions">
        <div className="field">
          <label htmlFor="price">Preço por item</label>
          <MoneyInput id="price" value={album.defaultPrice} onChange={savePrice} />
        </div>
        <button type="button" className={`btn btn--sm ${published ? 'btn--ghost' : 'btn--accent'}`} onClick={togglePublish} disabled={busy}>
          {busy && <Spinner size={16} />} {published ? 'Despublicar' : 'Publicar álbum'}
        </button>
      </div>
      <Alert>{error}</Alert>
      <p className="hint album-hero__note">Novos envios usam o preço atual. Itens já enviados mantêm o preço da hora do envio.</p>
    </div>
  )
}

/* ---------- Upload com fila ---------- */
function Uploader({ album }) {
  const [queue, setQueue] = useState([])
  const [dragging, setDragging] = useState(false)
  const running = useRef(false)
  const input = useRef(null)

  const patch = useCallback((id, data) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...data } : i))), [])

  function addFiles(list) {
    const items = [...list]
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: 'waiting' }))
    setQueue((q) => [...q, ...items])
  }

  // Processa um arquivo por vez
  useEffect(() => {
    if (running.current) return
    const next = queue.find((i) => i.status === 'waiting')
    if (!next) return
    running.current = true
    patch(next.id, { status: 'uploading' })
    uploadMedia({ album, file: next.file, onProgress: (p) => patch(next.id, { progress: p }) })
      .then(() => patch(next.id, { status: 'done', progress: 1 }))
      .catch((e) => patch(next.id, { status: 'error', error: errorMessage(e) }))
      .finally(() => {
        running.current = false
        setQueue((q) => [...q])
      })
  }, [queue, album, patch])

  const busy = queue.some((i) => i.status === 'uploading' || i.status === 'waiting')

  // Avisa antes de fechar a aba no meio de um envio
  useEffect(() => {
    if (!busy) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const done = queue.filter((i) => i.status === 'done').length

  return (
    <section className="app-card">
      <div
        className={`dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <span className="dropzone__icon">
          <Icon name="image" size={26} />
        </span>
        <p className="dropzone__title">Arraste fotos e vídeos aqui</p>
        <p className="muted">JPG, PNG, WEBP, MP4, MOV ou WEBM. Os originais vão direto para o seu Drive.</p>
        <button type="button" className="btn btn--light btn--sm" onClick={() => input.current?.click()}>
          Escolher arquivos
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="queue">
          <div className="queue__head">
            <p>
              {done} de {queue.length} enviados
            </p>
            {!busy && (
              <button type="button" className="link-btn" onClick={() => setQueue([])}>
                Limpar lista
              </button>
            )}
          </div>
          <ul className="queue__list">
            <AnimatePresence initial={false}>
              {queue.map((i) => (
                <motion.li
                  key={i.id}
                  className={`queue__item queue__item--${i.status}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <span className="queue__name">{i.file.name}</span>
                  <span className="queue__status">
                    {i.status === 'waiting' && 'Na fila'}
                    {i.status === 'uploading' && `${Math.round(i.progress * 100)}%`}
                    {i.status === 'done' && <Icon name="check" size={16} stroke={2.6} />}
                    {i.status === 'error' && 'Erro'}
                  </span>
                  <span className="queue__bar">
                    <motion.span
                      className="queue__fill"
                      animate={{ width: `${Math.round(i.progress * 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                  {i.error && <span className="queue__error">{i.error}</span>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </section>
  )
}

function MediaGrid({ media }) {
  if (media.length === 0) return null
  return (
    <section className="app-card">
      <div className="app-card__head">
        <div>
          <h3 className="app-card__title">No álbum</h3>
          <p className="app-card__sub">Prévias com marca d'água, como o cliente vê</p>
        </div>
      </div>
      <div className="media-grid">
        <AnimatePresence initial={false}>
          {media.map((m) => (
            <motion.figure
              key={m.id}
              className="media-tile"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease }}
            >
              <PreviewImage path={m.previewPath} alt={m.name} />
              {m.kind === 'video' && (
                <span className="media-tile__badge">
                  <Icon name="play" size={12} stroke={2.4} /> Vídeo
                </span>
              )}
              <figcaption className="media-tile__cap">
                <span className="media-tile__name">{m.name}</span>
                <span>{brl(m.price)}</span>
              </figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
