import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { salesByAlbum } from '../../lib/stats.js'
import AppShell from '../../app/AppShell.jsx'
import { AlbumList, NewAlbumButton, NewAlbumModal, PageHead, Segmented } from '../../app/dashboard-parts.jsx'
import { useAlbums, useOrders } from '../../app/useOwnerData.js'
import { Page } from '../../app/ui.jsx'
import { Icon } from '../../components/shared.jsx'

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Rascunhos' },
]

export default function Albums() {
  const { profile } = useAuth()
  const [albums] = useAlbums()
  const [orders] = useOrders()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const byAlbum = useMemo(() => (orders ? salesByAlbum(orders) : {}), [orders])
  const visible = useMemo(() => {
    if (!albums) return null
    const q = search.trim().toLowerCase()
    return albums.filter((a) => (filter === 'all' || a.status === filter) && (!q || a.title.toLowerCase().includes(q)))
  }, [albums, filter, search])

  const files = albums?.reduce((s, a) => s + a.mediaCount, 0) ?? 0
  const filtering = filter !== 'all' || search.trim()

  return (
    <AppShell crumbs={[{ label: 'Painel', to: '/painel' }, { label: 'Álbuns' }]} actions={<NewAlbumButton profile={profile} onClick={() => setNewOpen(true)} />}>
      <Page>
        <PageHead
          title="Álbuns"
          sub={albums ? `${albums.length} ${albums.length === 1 ? 'álbum' : 'álbuns'} · ${files} ${files === 1 ? 'arquivo' : 'arquivos'}` : 'Carregando…'}
        />

        <section className="app-card">
          <div className="toolbar">
            <label className="search">
              <Icon name="search" size={16} />
              <span className="sr-only">Buscar álbum</span>
              <input className="input" placeholder="Buscar pelo nome" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <Segmented id="album-filter" value={filter} onChange={setFilter} options={FILTERS} label="Filtrar álbuns" />
          </div>
          <AlbumList
            albums={visible}
            byAlbum={byAlbum}
            driveConnected={profile.driveConnected}
            onNew={() => setNewOpen(true)}
            emptyText={filtering ? 'Nenhum álbum com esse filtro' : undefined}
          />
        </section>

        <NewAlbumModal open={newOpen} onClose={() => setNewOpen(false)} />
      </Page>
    </AppShell>
  )
}
