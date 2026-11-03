import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { photographerBySlug } from '../lib/profiles.js'
import { publicAlbums } from '../lib/albums.js'
import { brl } from '../lib/checkout.js'
import PublicLayout from '../app/PublicLayout.jsx'
import { FullPageSpinner, MODE_LABEL, Page } from '../app/ui.jsx'
import { Icon, staggerChild, staggerParent } from '../components/shared.jsx'
import NotFound from './NotFound.jsx'

export default function PublicProfile() {
  const { slug } = useParams()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    ;(async () => {
      try {
        const photographer = await photographerBySlug(slug)
        if (!photographer) return alive && setState({ loading: false, notFound: true })
        const albums = await publicAlbums(photographer.id)
        if (alive) setState({ loading: false, photographer, albums })
      } catch (e) {
        console.error(e)
        if (alive) setState({ loading: false, notFound: true })
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  if (state.loading) return <FullPageSpinner />
  if (state.notFound) return <NotFound />

  const { photographer, albums } = state
  document.title = `${photographer.displayName} · Fotly`

  return (
    <PublicLayout>
      <Page className="container public-profile">
        <header className="public-profile__head">
          <div className="public-profile__avatar" aria-hidden="true">
            {photographer.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="h2">{photographer.displayName}</h1>
            {photographer.bio && <p className="lead">{photographer.bio}</p>}
          </div>
        </header>

        {albums.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhum álbum publicado ainda</p>
          </div>
        ) : (
          <motion.div className="album-grid" variants={staggerParent} initial="hidden" animate="show">
            {albums.map((a) => (
              <motion.div key={a.id} variants={staggerChild}>
                <Link to={`/${slug}/${a.id}`} className="album-card">
                  <div className="album-card__cover">
                    <Icon name="image" size={30} />
                  </div>
                  <div className="album-card__body">
                    <p className="album-card__title">{a.title}</p>
                    <p className="album-card__meta">
                      <span>{MODE_LABEL[a.mode]}</span>
                      <span>{brl(a.defaultPrice)} por item</span>
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </Page>
    </PublicLayout>
  )
}
