// Peças das páginas públicas, usadas também na prévia da personalização.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { contactLinks, normalizePage } from '../lib/page.js'
import { brl } from '../lib/checkout.js'
import { usePreviewUrl } from './usePreviewUrl.js'
import PreviewImage from './PreviewImage.jsx'
import { MODE_LABEL } from './ui.jsx'
import { Icon, ease } from '../components/shared.jsx'
import './public-theme.css'

/** Imagem do Storage (capa, foto de perfil) com fade ao carregar. */
export function StorageImg({ path, alt = '', className = '' }) {
  const url = usePreviewUrl(path || null)
  const [loaded, setLoaded] = useState(false)
  if (!url) return null
  return <img src={url} alt={alt} className={`storage-img ${loaded ? 'is-loaded' : ''} ${className}`} onLoad={() => setLoaded(true)} draggable={false} />
}

export function Avatar({ photographer, page, size = 72 }) {
  const p = normalizePage(page)
  return (
    <div className="public-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatarPath ? <StorageImg path={p.avatarPath} /> : (photographer.displayName || '?').charAt(0).toUpperCase()}
    </div>
  )
}

/* ---------- Topo da página do fotógrafo ---------- */

/** Capa, foto, nome, chamada, cidade, bio e contatos. Três layouts: classic, cover, centered. */
export function ProfileHero({ photographer, page, interactive = true }) {
  const p = normalizePage(page)
  const layout = p.heroLayout

  if (layout === 'cover') {
    return (
      <header className={`phero phero--cover ${p.coverPath ? 'has-cover' : ''}`}>
        <div className="phero__bg">{p.coverPath && <StorageImg path={p.coverPath} />}</div>
        <div className="phero__shade" />
        <div className="container phero__body">
          <Avatar photographer={photographer} page={page} size={64} />
          <HeroText photographer={photographer} p={p} page={page} interactive={interactive} />
        </div>
      </header>
    )
  }

  if (layout === 'centered') {
    return (
      <header className={`phero phero--centered ${p.coverPath ? 'has-cover' : ''}`}>
        {p.coverPath && (
          <div className="phero__banner">
            <StorageImg path={p.coverPath} />
          </div>
        )}
        <div className="container phero__body">
          <Avatar photographer={photographer} page={page} size={104} />
          <HeroText photographer={photographer} p={p} page={page} interactive={interactive} />
        </div>
      </header>
    )
  }

  return (
    <header className={`phero phero--classic ${p.coverPath ? 'has-cover' : ''}`}>
      {p.coverPath && (
        <div className="container">
          <div className="phero__cover">
            <StorageImg path={p.coverPath} />
          </div>
        </div>
      )}
      <div className="container phero__body">
        <Avatar photographer={photographer} page={page} size={p.coverPath ? 104 : 88} />
        <HeroText photographer={photographer} p={p} page={page} interactive={interactive} />
      </div>
    </header>
  )
}

function HeroText({ photographer, p, page, interactive }) {
  const links = contactLinks(page)
  return (
    <div className="phero__text">
      <h1 className="phero__name">{photographer.displayName}</h1>
      {(p.headline || p.location) && (
        <p className="phero__headline">
          {p.headline}
          {p.headline && p.location && <span className="phero__dot" aria-hidden="true" />}
          {p.location && (
            <span className="phero__loc">
              <Icon name="pin" size={15} /> {p.location}
            </span>
          )}
        </p>
      )}
      {photographer.bio && <p className="phero__bio">{photographer.bio}</p>}
      {links.length > 0 && (
        <div className="phero__links">
          {links.map((l) => {
            const inner = (
              <>
                <Icon name={l.icon} size={15} /> {l.label}
              </>
            )
            return interactive ? (
              <a key={l.kind} href={l.href} target="_blank" rel="noreferrer noopener" className="chip-link">
                {inner}
              </a>
            ) : (
              <span key={l.kind} className="chip-link">
                {inner}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------- Lista de álbuns ---------- */

/** Seção "Galerias" da página do fotógrafo. linkFor(album) → rota; ausente = só ilustrativo (prévia). */
export function AlbumsSection({ albums, page, linkFor, animate = true }) {
  const p = normalizePage(page)
  return (
    <section className="container albums" aria-labelledby="albums-title">
      <div className="albums__head">
        <h2 id="albums-title" className="albums__title">
          {p.albumsTitle || 'Galerias'}
        </h2>
        <span className="albums__count">
          {albums.length} {albums.length === 1 ? 'álbum' : 'álbuns'}
        </span>
      </div>
      {albums.length === 0 ? (
        <div className="albums__empty">
          <Icon name="albums" size={28} />
          <p>Nenhum álbum publicado ainda</p>
        </div>
      ) : (
        <div className={`albums__grid albums__grid--${p.albumLayout}`}>
          {albums.map((a, i) => (
            <motion.div
              key={a.id}
              className="albums__cell"
              initial={animate ? { opacity: 0, y: 24 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: Math.min(i * 0.07, 0.5), ease }}
            >
              <AlbumCard album={a} page={page} to={linkFor?.(a)} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

/** Card de álbum. `to` ausente = card só ilustrativo (prévia). */
export function AlbumCard({ album, page, to }) {
  const p = normalizePage(page)
  const count = album.mediaCount
  const body = (
    <>
      <div className="pcard__cover">
        {album.coverPath ? (
          <StorageImg path={album.coverPath} />
        ) : album.sample ? (
          <span className="pcard__sample" style={{ background: album.sample }} />
        ) : (
          <Icon name="image" size={30} />
        )}
        {count != null && (
          <span className="pcard__count">
            <Icon name="image" size={13} stroke={2} /> {count.toLocaleString('pt-BR')}
          </span>
        )}
      </div>
      <div className="pcard__body">
        <p className="pcard__title">{album.title}</p>
        <p className="pcard__meta">
          {p.showPrices && <span>{brl(album.defaultPrice)} por foto</span>}
          {album.mode === 'store' && <span>{MODE_LABEL.store}</span>}
        </p>
        <span className="pcard__go" aria-hidden="true">
          Ver álbum <Icon name="arrow" size={15} />
        </span>
      </div>
    </>
  )
  return to ? (
    <Link to={to} className="pcard">
      {body}
    </Link>
  ) : (
    <div className="pcard">{body}</div>
  )
}

/* ---------- Página do álbum ---------- */

/** Cabeçalho do álbum com a primeira foto desfocada ao fundo. */
export function AlbumHero({ photographer, page, album, count, coverPath, backTo }) {
  const p = normalizePage(page)
  const back = (
    <>
      <Icon name="left" size={16} />
      <Avatar photographer={photographer} page={page} size={26} />
      {photographer.displayName}
    </>
  )
  return (
    <header className={`ahero ${coverPath || album.sample ? 'has-cover' : ''}`}>
      <div className="ahero__bg" style={album.sample ? { background: album.sample } : undefined}>
        {coverPath && <StorageImg path={coverPath} />}
      </div>
      <div className="ahero__shade" />
      <div className="container ahero__inner">
        {backTo ? (
          <Link to={backTo} className="ahero__back">
            {back}
          </Link>
        ) : (
          <span className="ahero__back">{back}</span>
        )}
        <h1 className="ahero__title">{album.title}</h1>
        <p className="ahero__meta">
          <span>
            {count} {count === 1 ? 'arquivo' : 'arquivos'}
          </span>
          <span className="phero__dot" aria-hidden="true" />
          <span>{brl(album.defaultPrice)} cada</span>
          {p.location && (
            <>
              <span className="phero__dot" aria-hidden="true" />
              <span>{p.location}</span>
            </>
          )}
        </p>
      </div>
    </header>
  )
}

/**
 * Grade de fotos do álbum. Clique na foto amplia (onOpen); o círculo no canto seleciona (onToggle).
 * Layout grade (quadrado) ou mosaico (formato real), conforme a página.
 */
export function Gallery({ media, page, selected, onToggle, onOpen, animate = true }) {
  const p = normalizePage(page)
  const masonry = p.mediaLayout === 'masonry'
  return (
    <div className={`gallery gallery--${p.mediaLayout}`}>
      {media.map((m, i) => {
        const isSel = selected?.has(m.id)
        return (
          <motion.div
            key={m.id}
            className={`tile ${isSel ? 'is-selected' : ''}`}
            initial={animate ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: animate ? Math.min(i * 0.025, 0.5) : 0, ease }}
          >
            <button type="button" className="tile__open" onClick={() => onOpen?.(i)} aria-label={`Ampliar ${m.name ?? `foto ${i + 1}`}`} tabIndex={onOpen ? 0 : -1}>
              {m.sample ? (
                <span className="preview preview--sample" style={{ aspectRatio: masonry ? m.width / m.height : 1, background: m.sample }} />
              ) : (
                <PreviewImage path={m.previewPath} alt="" ratio={masonry ? 'auto' : 1} width={m.width} height={m.height} />
              )}
              <span className="tile__zoom" aria-hidden="true">
                <Icon name="expand" size={16} stroke={2} />
              </span>
            </button>
            {m.kind === 'video' && (
              <span className="tile__badge">
                <Icon name="play" size={11} stroke={2.4} /> Vídeo
              </span>
            )}
            {onToggle && (
              <button
                type="button"
                className="tile__pick"
                aria-pressed={!!isSel}
                aria-label={`${isSel ? 'Remover' : 'Selecionar'} ${m.name ?? `foto ${i + 1}`}, ${brl(m.price)}`}
                onClick={() => onToggle(m.id)}
              >
                <AnimatePresence initial={false}>
                  {isSel && (
                    <motion.span
                      className="tile__pick-on"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                    >
                      <Icon name="check" size={14} stroke={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/* ---------- Conteúdo de exemplo para a prévia ---------- */

// Gradientes com tons de foto (pôr do sol, mata, mar, pele, noite) no lugar de imagens reais
const TONES = [
  'linear-gradient(160deg, #f4b183 0%, #c8644a 45%, #3b2430 100%)',
  'linear-gradient(200deg, #9fb7a3 0%, #4c6b53 50%, #1d2b22 100%)',
  'linear-gradient(170deg, #b9d2e4 0%, #5d86a8 50%, #1f3446 100%)',
  'linear-gradient(150deg, #ecd5c3 0%, #c49a7f 50%, #6b4a3a 100%)',
  'linear-gradient(190deg, #3a3f5c 0%, #1c1f33 60%, #0b0c14 100%)',
  'linear-gradient(140deg, #f0e3c6 0%, #d3b57e 50%, #7b6233 100%)',
  'linear-gradient(175deg, #d8c3d6 0%, #9a6f96 50%, #3e2a3f 100%)',
  'linear-gradient(165deg, #c9c3b6 0%, #8a8273 50%, #2f2b25 100%)',
]
const RATIOS = [
  [3, 2],
  [2, 3],
  [4, 5],
  [3, 2],
  [1, 1],
  [2, 3],
  [16, 9],
  [4, 5],
  [3, 2],
  [2, 3],
  [3, 2],
  [4, 5],
]

export const SAMPLE_ALBUMS = [
  { id: 's1', title: 'Casamento Ana & Pedro', mode: 'public', defaultPrice: 1500, mediaCount: 248, sample: TONES[0] },
  { id: 's2', title: 'Corrida de Rua 2026', mode: 'public', defaultPrice: 1200, mediaCount: 1320, sample: TONES[2] },
  { id: 's3', title: 'Ensaio na serra', mode: 'public', defaultPrice: 2000, mediaCount: 86, sample: TONES[1] },
  { id: 's4', title: 'Formatura Medicina', mode: 'public', defaultPrice: 1800, mediaCount: 412, sample: TONES[3] },
]

export const SAMPLE_MEDIA = RATIOS.map(([w, h], i) => ({
  id: `m${i}`,
  name: `IMG_${4821 + i}.jpg`,
  kind: i === 6 ? 'video' : 'photo',
  price: 1500,
  width: w * 100,
  height: h * 100,
  sample: TONES[i % TONES.length],
}))
