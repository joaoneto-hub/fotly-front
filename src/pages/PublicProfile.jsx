import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { photographerBySlug } from '../lib/profiles.js'
import { publicAlbums } from '../lib/albums.js'
import { albumSummaries } from '../lib/stats.js'
import PublicLayout from '../app/PublicLayout.jsx'
import { AlbumsSection, ProfileHero } from '../app/public-parts.jsx'
import { Page, Skeleton } from '../app/ui.jsx'
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
    if (state.photographer) document.title = `${state.photographer.displayName} · Fotografia`
  }, [state.photographer])

  if (state.loading) return <ProfileSkeleton />
  if (state.notFound) return <NotFound />

  const { photographer, albums } = state

  return (
    <PublicLayout page={photographer.page}>
      <Page className="public-profile">
        <ProfileHero photographer={photographer} page={photographer.page} />
        <AlbumsSection albums={albums} page={photographer.page} linkFor={(a) => `/${slug}/${a.id}`} />
      </Page>
    </PublicLayout>
  )
}

function ProfileSkeleton() {
  return (
    <div className="public" aria-busy="true" aria-label="Carregando página">
      <span className="top-progress" aria-hidden="true" />
      <div className="container public-skel">
        <div className="public-skel__hero">
          <Skeleton h={96} w={96} round />
          <div style={{ flex: 1 }}>
            <Skeleton h={40} w="min(420px, 80%)" />
            <Skeleton h={16} w="min(300px, 60%)" style={{ marginTop: 14 }} />
          </div>
        </div>
        <Skeleton h={28} w={160} style={{ marginBottom: 24 }} />
        <div className="public-skel__grid">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton h="auto" style={{ aspectRatio: '4 / 3', borderRadius: 14 }} />
              <Skeleton h={18} w="70%" style={{ marginTop: 14 }} />
              <Skeleton h={14} w="40%" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
