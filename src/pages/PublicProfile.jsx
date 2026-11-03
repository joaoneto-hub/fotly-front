import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { photographerBySlug } from '../lib/profiles.js'
import { publicAlbums } from '../lib/albums.js'
import { albumSummaries } from '../lib/stats.js'
import PublicLayout from '../app/PublicLayout.jsx'
import { AlbumCard, ProfileHero } from '../app/public-parts.jsx'
import { FullPageSpinner, Page } from '../app/ui.jsx'
import { staggerChild, staggerParent } from '../components/shared.jsx'
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
        const albums = await publicAlbums(photographer.id).then(albumSummaries)
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

  useEffect(() => {
    if (state.photographer) document.title = `${state.photographer.displayName} · Fotly`
  }, [state.photographer])

  if (state.loading) return <FullPageSpinner />
  if (state.notFound) return <NotFound />

  const { photographer, albums } = state

  return (
    <PublicLayout page={photographer.page}>
      <Page className="container public-profile">
        <ProfileHero photographer={photographer} page={photographer.page} />

        {albums.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhum álbum publicado ainda</p>
          </div>
        ) : (
          <motion.div className="album-grid" variants={staggerParent} initial="hidden" animate="show">
            {albums.map((a) => (
              <motion.div key={a.id} variants={staggerChild}>
                <AlbumCard album={a} page={photographer.page} to={`/${slug}/${a.id}`} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Page>
    </PublicLayout>
  )
}
