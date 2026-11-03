import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { albumMedia, getAlbum } from '../lib/albums.js'
import { photographerBySlug } from '../lib/profiles.js'
import { brl, startCheckout } from '../lib/checkout.js'
import PublicLayout from '../app/PublicLayout.jsx'
import PreviewImage from '../app/PreviewImage.jsx'
import { Alert, FullPageSpinner, Modal, Page, Spinner, errorMessage } from '../app/ui.jsx'
import { Icon, ease } from '../components/shared.jsx'
import NotFound from './NotFound.jsx'

export default function PublicAlbum() {
  const { slug, albumId } = useParams()
  const [state, setState] = useState({ loading: true })
  const [selected, setSelected] = useState(() => new Set())
  const [checkoutOpen, setCheckoutOpen] = useState(false)

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
        console.error(e)
        if (alive) setState({ loading: false, notFound: true })
      }
    })()
    return () => {
      alive = false
    }
  }, [slug, albumId])

  const total = useMemo(
    () => (state.media ?? []).filter((m) => selected.has(m.id)).reduce((sum, m) => sum + m.price, 0),
    [selected, state.media]
  )

  if (state.loading) return <FullPageSpinner />
  if (state.notFound) return <NotFound />

  const { photographer, album, media } = state
  document.title = `${album.title} · ${photographer.displayName}`

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = media.length > 0 && selected.size === media.length

  return (
    <PublicLayout>
      <Page className="container public-album">
        <Link to={`/${slug}`} className="back-link">
          <span aria-hidden="true">←</span> {photographer.displayName}
        </Link>
        <header className="public-album__head">
          <div>
            <h1 className="h2">{album.title}</h1>
            <p className="muted">
              {media.length} {media.length === 1 ? 'item' : 'itens'} · {brl(album.defaultPrice)} cada · toque para selecionar
            </p>
          </div>
          {media.length > 1 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setSelected(allSelected ? new Set() : new Set(media.map((m) => m.id)))}
            >
              {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
            </button>
          )}
        </header>

        <div className="media-grid media-grid--public">
          {media.map((m, i) => {
            const isSel = selected.has(m.id)
            return (
              <motion.button
                type="button"
                key={m.id}
                className={`media-tile media-tile--pick ${isSel ? 'is-selected' : ''}`}
                aria-pressed={isSel}
                aria-label={`${isSel ? 'Remover' : 'Selecionar'} ${m.name}, ${brl(m.price)}`}
                onClick={() => toggle(m.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.6), ease }}
                whileTap={{ scale: 0.97 }}
              >
                <PreviewImage path={m.previewPath} alt="" />
                {m.kind === 'video' && (
                  <span className="media-tile__badge">
                    <Icon name="play" size={12} stroke={2.4} /> Vídeo
                  </span>
                )}
                <AnimatePresence>
                  {isSel && (
                    <motion.span
                      className="photo__check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    >
                      <Icon name="check" size={14} stroke={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </Page>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="cart-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="container cart-bar__inner">
              <p>
                <strong>
                  {selected.size} {selected.size === 1 ? 'item' : 'itens'}
                </strong>{' '}
                · {brl(total)}
              </p>
              <button type="button" className="btn btn--accent" onClick={() => setCheckoutOpen(true)}>
                Comprar com Pix
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

function CheckoutModal({ open, onClose, albumId, mediaIds, total }) {
  const navigate = useNavigate()
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
      navigate(`/pedido/${orderId}?t=${encodeURIComponent(token)}`)
    } catch (err) {
      setError(errorMessage(err))
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
        <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={busy}>
          {busy && <Spinner size={18} />} Gerar Pix
        </button>
        <p className="fine">O valor final é confirmado pelo servidor na hora de gerar o Pix.</p>
      </form>
    </Modal>
  )
}
