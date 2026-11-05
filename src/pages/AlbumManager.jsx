import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { publishAlbum, updateAlbum, uploadMedia, watchAlbum, watchMedia } from '../lib/albums.js'
import { brl } from '../lib/checkout.js'
import { myOrders, salesByAlbum } from '../lib/stats.js'
import AppShell from '../app/AppShell.jsx'
import { useToast } from '../app/toast.jsx'
import { Alert, Button, EmptyState, MODE_LABEL, MoneyInput, Page, Skeleton, copyText, errorMessage } from '../app/ui.jsx'
import PreviewImage from '../app/PreviewImage.jsx'
import Lightbox from '../app/Lightbox.jsx'
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

  if (album === undefined) return <ManagerSkeleton />
  if (!album || album.ownerId !== user.uid) {
    return (
      <AppShell crumbs={[{ label: 'Álbuns', to: '/painel/albuns' }, { label: 'Não encontrado' }]}>
        <Page>
          <EmptyState icon="albums" title="Álbum não encontrado" text={error || 'Ele pode ter sido removido ou o link está errado.'}>
            <Link to="/painel/albuns" className="btn btn--ghost btn--sm">
              Voltar aos álbuns
            </Link>
          </EmptyState>
        </Page>
      </AppShell>
    )
  }

  const photos = media.filter((m) => m.kind !== 'video').length
  const bytes = media.reduce((s, m) => s + (m.size ?? 0), 0)

  return (
    <AppShell crumbs={[{ label: 'Álbuns', to: '/painel/albuns' }, { label: album.title }]}>
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

function ManagerSkeleton() {
  return (
    <AppShell crumbs={[{ label: 'Álbuns', to: '/painel/albuns' }, { label: 'Carregando…' }]}>
      <div className="page" aria-busy="true" aria-label="Carregando álbum">
        <div className="app-card app-card--pad">
          <Skeleton h={20} w={160} />
          <Skeleton h={34} w="min(420px, 80%)" style={{ marginTop: 14 }} />
          <Skeleton h={38} w="min(320px, 70%)" style={{ marginTop: 14 }} />
        </div>
        <div className="stat-strip">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="app-card stat">
              <Skeleton h={12} w="50%" />
              <Skeleton h={26} w="70%" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div className="app-card">
          <Skeleton h={180} />
        </div>
      </div>
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
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const published = album.status === 'published'
  const shareable = published && album.mode !== 'private'
  const publicPath = `/${slug}/${album.id}`

  async function togglePublish() {
    if (!published && count === 0) return toast.info('Suba pelo menos um arquivo antes de publicar.')
    setBusy(true)
    try {
      await publishAlbum(album.id, !published)
      if (published) {
        toast.info('Álbum despublicado', {
          description: 'Ele saiu da sua página pública.',
          action: { label: 'Desfazer', onClick: () => publishAlbum(album.id, true).catch((e) => toast.error('Não foi possível republicar', { description: errorMessage(e) })) },
        })
      }
      else toast.success('Álbum publicado', { description: album.mode === 'private' ? 'Fica oculto até as galerias com senha chegarem.' : 'Copie o link e mande para os clientes.' })
    } catch (e) {
      toast.error('Não foi possível mudar a publicação', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  async function savePrice(cents) {
    if (cents === album.defaultPrice) return
    try {
      await updateAlbum(album.id, { defaultPrice: cents })
      toast.success('Preço atualizado', { description: `Novos envios custam ${brl(cents)}.` })
    } catch (e) {
      toast.error('Não foi possível salvar o preço', { description: errorMessage(e) })
    }
  }

  const copyLink = () => copyText(window.location.origin + publicPath, toast)

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
              <Icon name="copy" size={16} />
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
        <Button size="sm" variant={published ? 'ghost' : 'accent'} icon={published ? undefined : 'globe'} onClick={togglePublish} loading={busy}>
          {published ? 'Despublicar' : 'Publicar álbum'}
        </Button>
      </div>
      <p className="hint album-hero__note">Novos envios usam o preço atual. Itens já enviados mantêm o preço da hora do envio.</p>
    </div>
  )
}

/* ---------- Upload com fila ---------- */
function Uploader({ album }) {
  const toast = useToast()
  const [queue, setQueue] = useState([])
  const [dragging, setDragging] = useState(false)
  const running = useRef(false)
  const input = useRef(null)

  const patch = useCallback((id, data) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...data } : i))), [])

  function addFiles(list) {
    const all = [...list]
    const items = all
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: 'waiting' }))
    const skipped = all.length - items.length
    if (skipped) toast.info(`${skipped} ${skipped === 1 ? 'arquivo ignorado' : 'arquivos ignorados'}`, { description: 'Só fotos e vídeos podem ser enviados.' })
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

  // Resumo quando a fila termina
  const wasBusy = useRef(false)
  const reported = useRef(new Set())
  useEffect(() => {
    if (busy) {
      wasBusy.current = true
      return
    }
    if (!wasBusy.current) return
    wasBusy.current = false
    const batch = queue.filter((i) => !reported.current.has(i.id))
    batch.forEach((i) => reported.current.add(i.id))
    const ok = batch.filter((i) => i.status === 'done').length
    const failed = batch.filter((i) => i.status === 'error').length
    if (failed) toast.error(`${failed} ${failed === 1 ? 'arquivo não foi enviado' : 'arquivos não foram enviados'}`, { description: 'Veja o motivo na lista e tente de novo.' })
    if (ok) toast.success(`${ok} ${ok === 1 ? 'arquivo enviado' : 'arquivos enviados'}`, { description: 'Os originais estão no seu Drive.' })
  }, [busy, queue, toast])

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
                  <QueueThumb file={i.file} />
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

function QueueThumb({ file }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file.type.startsWith('image/')) return
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return (
    <span className="queue__thumb" aria-hidden="true">
      {url ? <img src={url} alt="" /> : <Icon name={file.type.startsWith('video/') ? 'play' : 'image'} size={14} />}
    </span>
  )
}

function MediaGrid({ media }) {
  const [viewing, setViewing] = useState(null)
  if (media.length === 0) {
    return (
      <section className="app-card">
        <EmptyState icon="image" title="Nenhuma foto ainda" text="Arraste os arquivos para a área acima. As prévias com marca d'água aparecem aqui." className="empty-state--compact" />
      </section>
    )
  }
  return (
    <section className="app-card">
      <div className="app-card__head">
        <div>
          <h3 className="app-card__title">No álbum</h3>
          <p className="app-card__sub">Prévias com marca d'água, como o cliente vê. Clique para ampliar.</p>
        </div>
      </div>
      <div className="media-grid">
        <AnimatePresence initial={false}>
          {media.map((m, i) => (
            <motion.figure
              key={m.id}
              className="media-tile"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease }}
            >
              <button type="button" className="media-tile__open" onClick={() => setViewing(i)} aria-label={`Ampliar ${m.name}`}>
                <PreviewImage path={m.previewPath} alt={m.name} />
                <span className="media-tile__zoom" aria-hidden="true">
                  <Icon name="expand" size={14} stroke={2} />
                </span>
              </button>
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
      <Lightbox
        items={media}
        index={viewing}
        onIndex={setViewing}
        caption={(m) => m.name}
        footer={(m) => (
          <span className="lightbox__meta">
            <span>{brl(m.price)}</span>
            {m.size ? <span>{formatBytes(m.size)}</span> : null}
            {m.width ? (
              <span>
                prévia {m.width}×{m.height}
              </span>
            ) : null}
          </span>
        )}
      />
    </section>
  )
}
