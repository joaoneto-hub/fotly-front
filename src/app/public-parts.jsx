// Peças das páginas públicas, usadas também na prévia da personalização.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { contactLinks, normalizePage } from '../lib/page.js'
import { brl } from '../lib/checkout.js'
import { usePreviewUrl } from './usePreviewUrl.js'
import { MODE_LABEL } from './ui.jsx'
import { Icon } from '../components/shared.jsx'
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

/** Topo da página do fotógrafo: capa, foto, nome, chamada, bio e contatos. */
export function ProfileHero({ photographer, page, interactive = true }) {
  const p = normalizePage(page)
  const links = contactLinks(page)
  return (
    <header className={`profile-hero ${p.coverPath ? 'has-cover' : ''}`}>
      {p.coverPath && (
        <div className="profile-hero__cover">
          <StorageImg path={p.coverPath} />
        </div>
      )}
      <div className="profile-hero__body">
        <Avatar photographer={photographer} page={page} size={p.coverPath ? 96 : 80} />
        <div className="profile-hero__text">
          <h1 className="profile-hero__name">{photographer.displayName}</h1>
          {p.headline && <p className="profile-hero__headline">{p.headline}</p>}
          {photographer.bio && <p className="profile-hero__bio">{photographer.bio}</p>}
          {links.length > 0 && (
            <div className="profile-hero__links">
              {links.map((l) =>
                interactive ? (
                  <a key={l.kind} href={l.href} target="_blank" rel="noreferrer noopener" className="chip-link">
                    <Icon name={l.icon} size={15} /> {l.label}
                  </a>
                ) : (
                  <span key={l.kind} className="chip-link">
                    <Icon name={l.icon} size={15} /> {l.label}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/** Card de álbum na página do fotógrafo. `to` ausente = card só ilustrativo (prévia). */
export function AlbumCard({ album, page, to }) {
  const p = normalizePage(page)
  const body = (
    <>
      <div className="album-card__cover">{album.coverPath ? <StorageImg path={album.coverPath} /> : <Icon name="image" size={30} />}</div>
      <div className="album-card__body">
        <p className="album-card__title">{album.title}</p>
        <p className="album-card__meta">
          <span>{MODE_LABEL[album.mode]}</span>
          {p.showPrices && <span>{brl(album.defaultPrice)} por item</span>}
          {album.mediaCount != null && <span>{album.mediaCount} itens</span>}
        </p>
      </div>
    </>
  )
  return to ? (
    <Link to={to} className="album-card">
      {body}
    </Link>
  ) : (
    <div className="album-card">{body}</div>
  )
}
