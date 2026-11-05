import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { albumMedia, getAlbum } from '../lib/albums.js'
import { photographerBySlug } from '../lib/profiles.js'
import { brl, startCheckout } from '../lib/checkout.js'
import { normalizePage } from '../lib/page.js'
import PublicLayout from '../app/PublicLayout.jsx'
import Lightbox from '../app/Lightbox.jsx'
import { AlbumHero, Gallery } from '../app/public-parts.jsx'
import { useToast } from '../app/toast.jsx'
import { Alert, Button, LoadError, Modal, Page, Skeleton, errorMessage } from '../app/ui.jsx'
import { Icon, ease } from '../components/shared.jsx'
import NotFound from './NotFound.jsx'

export default function PublicAlbum() {
  const { slug, albumId } = useParams()
  const [state, setState] = useState({ loading: true })
  const [selected, setSelected] = useState(() => new Set())
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [photographer, album] = await Promise.all([photographerBySlug(slug), getAlbum(albumId)])
        if (!photographer || !album || album.ownerId !== photographer.id || album.status !== 'published') {
          return alive && setState({ loading: false, notFound: true })
        }
        const media = await albumMedia(albumId)
        if (alive) setState({ loading: false, photographer, album, media })
      } catch (e) {
        // Álbum privado ou removido: as regras negam a leitura, e para o visitante isso é 404
        if (e?.code === 'permission-denied') {
          if (alive) setState({ loading: false, notFound: true })
          return
        }
        console.error('Falha ao carregar o álbum', e)
        if (alive) setState({ loading: false, error: e })
      }
    })()
    return () => {
      alive = false
    }
  }, [slug, albumId, attempt])

  const total = useMemo(
    () => (state.media ?? []).filter((m) => selected.has(m.id)).reduce((sum, m) => sum + m.price, 0),
    [selected, state.media]
  )

  useEffect(() => {
    if (state.album) document.title = `${state.album.title} · ${state.photographer.displayName}`
  }, [state.album, state.photographer])

  if (state.loading) return <AlbumSkeleton />
  if (state.notFound) return <NotFound />
  if (state.error) return <LoadError error={state.error} onRetry={() => setAttempt((n) => n + 1)} />

  const { photographer, album, media } = state
  const page = normalizePage(photographer.page)

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = media.length > 0 && selected.size === media.length
  const cover = media.find((m) => m.kind !== 'video') ?? media[0]

  return (
    <PublicLayout page={photographer.page}>
      <Page className="public-album">
        <AlbumHero photographer={photographer} page={photographer.page} album={album} count={media.length} coverPath={cover?.previewPath} backTo={`/${slug}`} />

        <div className="atoolbar">
          <div className="container atoolbar__inner">
            <p className="atoolbar__hint">
              <span className="atoolbar__hint-dot" aria-hidden="true" />
              <span>
                {selected.size > 0 ? (
                  <strong>
                    {selected.size} {selected.size === 1 ? 'selecionada' : 'selecionadas'}
                  </strong>
                ) : (
                  'Marque as fotos que quer comprar'
                )}
                <span className="atoolbar__hint-text"> · toque na foto para ampliar</span>
              </span>
            </p>
            {media.length > 1 && (
              <div className="atoolbar__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(allSelected ? new Set() : new Set(media.map((m) => m.id)))}>
                  {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="container">
          {page.albumNote && <p className="album-note">{page.albumNote}</p>}
          {media.length === 0 ? (
            <div className="albums__empty" style={{ marginTop: 24 }}>
              <Icon name="image" size={28} />
              <p>Este álbum ainda não tem fotos</p>
            </div>
          ) : (
            <Gallery media={media} page={photographer.page} selected={selected} onToggle={toggle} onOpen={setViewing} />
          )}
        </div>
      </Page>

      <Lightbox
        items={media}
        index={viewing}
        onIndex={setViewing}
        caption={(m) => m.name}
        footer={(m) => <span className="lightbox__meta">{brl(m.price)}</span>}
        actions={(m) => {
          const on = selected.has(m.id)
          return (
            <button type="button" className={`lightbox__pick ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(m.id)}>
              <span className="lightbox__pick-box">{on && <Icon name="check" size={14} stroke={3} />}</span>
              <span className="lightbox__pick-label">{on ? 'Selecionada' : 'Selecionar'}</span>
            </button>
          )
        }}
      />

      <AnimatePresence>
        {selected.size > 0 && viewing == null && (
          <motion.div
            className="cart-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="container cart-bar__inner">
              <p className="cart-bar__sum">
                <span className="cart-bar__icon">
                  <Icon name="cart" size={18} />
                </span>
                <span>
                  <strong>
                    {selected.size} {selected.size === 1 ? 'item' : 'itens'}
                  </strong>
                  <span className="cart-bar__total">{brl(total)}</span>
                </span>
              </p>
              <button type="button" className="btn btn--accent" onClick={() => setCheckoutOpen(true)}>
                {page.buyLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        albumId={album.id}
        mediaIds={[...selected]}
        total={total}
      />
    </PublicLayout>
  )
}

function AlbumSkeleton() {
  return (
    <div className="public" aria-busy="true" aria-label="Carregando álbum">
      <span className="top-progress" aria-hidden="true" />
      <Skeleton h={300} style={{ borderRadius: 0 }} />
      <div className="container">
        <div className="public-skel__photos">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} h="auto" style={{ aspectRatio: '1', borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckoutModal({ open, onClose, albumId, mediaIds, total }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { orderId, token, pix } = await startCheckout({ albumId, mediaIds, buyerEmail: email })
      // O QR do Pix só vem na criação: guardamos para a página do pedido
      try {
        sessionStorage.setItem(`fotly:pix:${orderId}`, JSON.stringify(pix))
      } catch {
        /* armazenamento indisponível: a página do pedido mostra só o status */
      }
      toast.success('Pix gerado', { description: 'Pague pelo app do seu banco.' })
      navigate(`/pedido/${orderId}?t=${encodeURIComponent(token)}`)
    } catch (err) {
      // Erro de validação (e-mail, item) fica no formulário; falha do servidor vira aviso
      if (err?.code?.includes('invalid-argument')) setError(errorMessage(err))
      else toast.error('Não foi possível gerar o Pix', { description: errorMessage(err) })
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Finalizar compra">
      <form className="form" onSubmit={submit}>
        <div className="summary">
          <span>
            {mediaIds.length} {mediaIds.length === 1 ? 'item' : 'itens'}
          </span>
          <strong>{brl(total)}</strong>
        </div>
        <div className="field">
          <label htmlFor="buyer-email">Seu e-mail</label>
          <input
            id="buyer-email"
            type="email"
            className="input"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <p className="hint">Usamos para identificar seu pedido.</p>
        </div>
        <Alert>{error}</Alert>
        <Button type="submit" variant="accent" size="lg" block loading={busy}>
          {busy ? 'Gerando Pix…' : 'Gerar Pix'}
        </Button>
        <p className="fine">O valor final é confirmado pelo servidor na hora de gerar o Pix.</p>
      </form>
    </Modal>
  )
}
