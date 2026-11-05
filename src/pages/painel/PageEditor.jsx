import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { albumMedia } from '../../lib/albums.js'
import {
  ACCENTS,
  ALBUM_LAYOUTS,
  CORNERS,
  DEFAULT_PAGE,
  FONTS,
  GRIDS,
  HERO_LAYOUTS,
  LIMITS,
  MEDIA_LAYOUTS,
  PRESETS,
  SPACINGS,
  THEMES,
  loadFont,
  matchPreset,
  normalizePage,
  removeBrandingImage,
  savePage,
  uploadBrandingImage,
} from '../../lib/page.js'
import AppShell from '../../app/AppShell.jsx'
import { themeProps } from '../../app/PublicLayout.jsx'
import { PageHead, Segmented } from '../../app/dashboard-parts.jsx'
import { AlbumHero, AlbumsSection, Gallery, ProfileHero, SAMPLE_ALBUMS, SAMPLE_MEDIA, StorageImg } from '../../app/public-parts.jsx'
import { useToast } from '../../app/toast.jsx'
import { useAlbums } from '../../app/useOwnerData.js'
import { Button, ConfirmModal, Page, Spinner, errorMessage } from '../../app/ui.jsx'
import { Icon, ease } from '../../components/shared.jsx'
import { brl } from '../../lib/checkout.js'

const TABS = [
  { value: 'estilo', label: 'Estilo', icon: 'palette' },
  { value: 'layout', label: 'Layout', icon: 'layout' },
  { value: 'conteudo', label: 'Conteúdo', icon: 'text' },
  { value: 'contato', label: 'Contato', icon: 'chat' },
]

// Campos que só aparecem na página do álbum: ao mexer neles, a prévia troca de aba
const ALBUM_KEYS = new Set(['mediaLayout', 'grid', 'albumNote', 'buyLabel', 'spacing'])

const DEVICES = [
  { value: 'desktop', label: <Icon name="monitor" size={16} />, aria: 'Computador', width: 1180 },
  { value: 'mobile', label: <Icon name="phone" size={16} />, aria: 'Celular', width: 390 },
]

export default function PageEditor() {
  const { profile } = useAuth()
  const toast = useToast()
  const [albums] = useAlbums()
  const saved = useMemo(() => ({ page: normalizePage(profile.page), bio: profile.bio ?? '' }), [profile.page, profile.bio])
  const [page, setPage] = useState(saved.page)
  const [bio, setBio] = useState(saved.bio)
  const [busy, setBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [tab, setTab] = useState('estilo')
  const [view, setView] = useState('perfil')
  const [device, setDevice] = useState('desktop')
  const [full, setFull] = useState(false)
  // Imagens enviadas nesta edição: se o fotógrafo descartar, apagamos do Storage
  const uploaded = useRef(new Set())

  const norm = normalizePage(page)
  const dirty = JSON.stringify(norm) !== JSON.stringify(saved.page) || bio.trim() !== saved.bio
  const set = (key) => (value) => {
    setPage((p) => ({ ...p, [key]: value }))
    if (ALBUM_KEYS.has(key)) setView('album')
    else if (key !== 'accent' && key !== 'theme' && key !== 'font' && key !== 'corners') setView('perfil')
  }

  useEffect(() => {
    if (!full) return
    const onKey = (e) => e.key === 'Escape' && setFull(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [full])

  // As amostras de tipografia precisam das fontes carregadas
  useEffect(() => FONTS.forEach((f) => loadFont(f.value)), [])

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save() {
    if (!dirty || busy) return
    setBusy(true)
    try {
      await savePage({ page, bio })
      // Imagens trocadas: apaga as que não estão mais em uso
      const keep = new Set([page.avatarPath, page.coverPath])
      for (const path of [saved.page.avatarPath, saved.page.coverPath, ...uploaded.current]) {
        if (path && !keep.has(path)) removeBrandingImage(path)
      }
      uploaded.current.clear()
      toast.success('Página atualizada', {
        description: 'Seus clientes já veem o novo visual.',
        action: { label: 'Ver página', onClick: () => window.open(`/${profile.slug}`, '_blank', 'noopener') },
      })
    } catch (e) {
      toast.error('Não foi possível salvar', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  // Ctrl/Cmd + S salva
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function discard() {
    for (const path of uploaded.current) removeBrandingImage(path)
    uploaded.current.clear()
    setPage(saved.page)
    setBio(saved.bio)
    toast.info('Alterações descartadas')
  }

  function resetDefaults() {
    const before = page
    setPage({ ...DEFAULT_PAGE, avatarPath: page.avatarPath, coverPath: page.coverPath })
    toast.info('Visual padrão aplicado', { description: 'Salve para publicar.', action: { label: 'Desfazer', onClick: () => setPage(before) } })
  }

  function applyPreset(preset) {
    const before = page
    setPage((p) => ({ ...p, ...preset.values }))
    setView('perfil')
    toast.info(`Estilo “${preset.label}” aplicado`, { description: 'Ajuste o que quiser e salve.', action: { label: 'Desfazer', onClick: () => setPage(before) } })
  }

  const previewAlbums = albums?.filter((a) => a.status === 'published' && a.mode !== 'private').slice(0, 4)
  const sampleAlbum = previewAlbums?.[0]
  const realMedia = usePreviewMedia(sampleAlbum?.id)
  const preset = matchPreset(page)

  const preview = (
    <PreviewContent
      view={view}
      page={page}
      photographer={{ ...profile, bio: bio.trim() }}
      albums={previewAlbums?.length ? previewAlbums : SAMPLE_ALBUMS}
      album={sampleAlbum ?? SAMPLE_ALBUMS[0]}
      media={realMedia?.length ? realMedia : SAMPLE_MEDIA}
    />
  )

  const previewBar = (
    <div className="pv-bar">
      <Segmented
        id="pv-view"
        value={view}
        onChange={setView}
        label="Página da prévia"
        options={[
          { value: 'perfil', label: 'Perfil' },
          { value: 'album', label: 'Álbum' },
        ]}
      />
      <div className="pv-bar__right">
        <Segmented id="pv-device" value={device} onChange={setDevice} label="Dispositivo" options={DEVICES} />
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => setFull((f) => !f)} aria-label={full ? 'Fechar tela cheia' : 'Prévia em tela cheia'}>
          <Icon name={full ? 'close' : 'expand'} size={16} />
        </button>
      </div>
    </div>
  )

  return (
    <AppShell
      crumbs={[{ label: 'Painel', to: '/painel' }, { label: 'Minha página' }]}
      actions={
        <>
          <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            <Icon name="external" size={14} /> <span className="hide-sm">Ver página</span>
          </a>
          <Button variant="accent" size="sm" onClick={save} disabled={!dirty} loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <Page>
        <PageHead title="Minha página" sub="Deixe a página de venda com a cara do seu trabalho. A prévia mostra o resultado na hora." />

        <div className="editor">
          <div className="editor__form">
            <div className="tabs" role="tablist" aria-label="Seções da personalização">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`tab-${t.value}`}
                  aria-selected={tab === t.value}
                  aria-controls={`panel-${t.value}`}
                  className={`tabs__btn ${tab === t.value ? 'is-active' : ''}`}
                  onClick={() => setTab(t.value)}
                >
                  {tab === t.value && <motion.span layoutId="tabs-line" className="tabs__line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Icon name={t.icon} size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                className="editor__panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease }}
              >
                {tab === 'estilo' && (
                  <>
                    <Section title="Estilos prontos" sub="Um clique aplica tema, fonte e layout combinados. Textos e imagens não mudam." icon="sparkle">
                      <div className="presets">
                        {PRESETS.map((pr) => (
                          <button key={pr.id} type="button" className={`preset ${preset === pr.id ? 'is-active' : ''}`} onClick={() => applyPreset(pr)} aria-pressed={preset === pr.id}>
                            <PresetThumb values={pr.values} />
                            <span className="preset__label">{pr.label}</span>
                            <span className="preset__hint">{pr.hint}</span>
                          </button>
                        ))}
                      </div>
                    </Section>

                    <Section title="Tema" sub="O fundo da página. Fotos ficam mais fortes em fundos escuros." icon="palette">
                      <div className="choice-grid choice-grid--4" role="radiogroup" aria-label="Tema">
                        {THEMES.map((t) => (
                          <Choice key={t.value} active={norm.theme === t.value} onClick={() => set('theme')(t.value)} label={t.label} hint={t.hint}>
                            <span className="theme-thumb" style={{ background: t.palette.ink, borderColor: t.palette.line }}>
                              <span style={{ background: t.palette.surface }} />
                              <span style={{ background: t.palette.text }} />
                              <span style={{ background: norm.accent }} />
                            </span>
                          </Choice>
                        ))}
                      </div>
                    </Section>

                    <Section title="Cor de destaque" sub="Botões, seleção das fotos e detalhes.">
                      <div className="swatches" role="radiogroup" aria-label="Cor de destaque">
                        {ACCENTS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={norm.accent === c}
                            aria-label={c}
                            className={`swatch ${norm.accent === c ? 'is-active' : ''}`}
                            style={{ background: c }}
                            onClick={() => set('accent')(c)}
                          />
                        ))}
                        <label className={`swatch swatch--custom ${ACCENTS.includes(norm.accent) ? '' : 'is-active'}`} title="Outra cor">
                          <input type="color" value={norm.accent} onChange={(e) => set('accent')(e.target.value)} aria-label="Escolher outra cor" />
                          <Icon name="plus" size={14} stroke={2.4} />
                        </label>
                        <span className="swatch__value">{norm.accent}</span>
                      </div>
                    </Section>

                    <Section title="Tipografia dos títulos" sub="Nome, títulos dos álbuns e chamadas." icon="type">
                      <div className="choice-grid choice-grid--3" role="radiogroup" aria-label="Tipografia">
                        {FONTS.map((f) => (
                          <Choice key={f.value} active={norm.font === f.value} onClick={() => set('font')(f.value)} label={f.label}>
                            <span className="font-sample" style={{ fontFamily: f.display }}>
                              {profile.displayName.split(' ')[0] || 'Fotly'}
                            </span>
                          </Choice>
                        ))}
                      </div>
                    </Section>
                  </>
                )}

                {tab === 'layout' && (
                  <>
                    <Section title="Topo da página" sub="Como sua apresentação aparece para quem chega." icon="layout">
                      <div className="choice-grid choice-grid--3" role="radiogroup" aria-label="Topo da página">
                        {HERO_LAYOUTS.map((l) => (
                          <Choice key={l.value} active={norm.heroLayout === l.value} onClick={() => set('heroLayout')(l.value)} label={l.label} hint={l.hint}>
                            <Wire kind={`hero-${l.value}`} />
                          </Choice>
                        ))}
                      </div>
                      {norm.heroLayout === 'cover' && !norm.coverPath && (
                        <p className="hint editor__tip">
                          <Icon name="info" size={14} /> Esse layout brilha com uma foto de capa. Envie na aba <button type="button" className="link-btn" onClick={() => setTab('conteudo')}>Conteúdo</button>.
                        </p>
                      )}
                    </Section>

                    <Section title="Galerias" sub="Como seus álbuns aparecem na página principal.">
                      <div className="choice-grid choice-grid--3" role="radiogroup" aria-label="Galerias">
                        {ALBUM_LAYOUTS.map((l) => (
                          <Choice key={l.value} active={norm.albumLayout === l.value} onClick={() => set('albumLayout')(l.value)} label={l.label}>
                            <Wire kind={`albums-${l.value}`} />
                          </Choice>
                        ))}
                      </div>
                    </Section>

                    <Section title="Fotos dentro do álbum" sub="O que o cliente vê ao escolher as fotos.">
                      <div className="choice-grid choice-grid--2" role="radiogroup" aria-label="Fotos dentro do álbum">
                        {MEDIA_LAYOUTS.map((l) => (
                          <Choice key={l.value} active={norm.mediaLayout === l.value} onClick={() => set('mediaLayout')(l.value)} label={l.label} hint={l.hint}>
                            <Wire kind={`media-${l.value}`} />
                          </Choice>
                        ))}
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <span className="field__label">Tamanho das fotos</span>
                          <Segmented id="grid" value={norm.grid} onChange={set('grid')} options={GRIDS} label="Tamanho das fotos" />
                        </div>
                        <div className="field">
                          <span className="field__label">Espaço entre fotos</span>
                          <Segmented id="spacing" value={norm.spacing} onChange={set('spacing')} options={SPACINGS} label="Espaço entre fotos" />
                        </div>
                        <div className="field">
                          <span className="field__label">Cantos</span>
                          <Segmented id="corners" value={norm.corners} onChange={set('corners')} options={CORNERS} label="Cantos" />
                        </div>
                      </div>
                    </Section>
                  </>
                )}

                {tab === 'conteudo' && (
                  <>
                    <Section title="Imagens" sub="Foto de perfil e capa do topo da página." icon="image">
                      <div className="image-pickers">
                        <ImagePicker
                          label="Foto de perfil"
                          hint="Quadrada, pelo menos 400 px."
                          kind="avatar"
                          path={norm.avatarPath}
                          onChange={(p) => {
                            if (p) uploaded.current.add(p)
                            set('avatarPath')(p)
                          }}
                        />
                        <ImagePicker
                          label="Capa"
                          hint="Horizontal, pelo menos 2000 px de largura."
                          kind="cover"
                          path={norm.coverPath}
                          onChange={(p) => {
                            if (p) uploaded.current.add(p)
                            set('coverPath')(p)
                          }}
                        />
                      </div>
                    </Section>

                    <Section title="Apresentação" sub="O que o cliente lê ao abrir sua página." icon="text">
                      <TextField id="headline" label="Chamada" placeholder="Ex.: Fotografia de casamentos e ensaios" value={page.headline} onChange={set('headline')} max={LIMITS.headline} />
                      <TextField id="location" label="Cidade" placeholder="Ex.: Belo Horizonte, MG" value={page.location ?? ''} onChange={set('location')} max={LIMITS.location} />
                      <TextField id="bio" label="Sobre você" placeholder="Conte em poucas linhas como é o seu trabalho." value={bio} onChange={setBio} max={LIMITS.bio} multiline />
                      <TextField id="albums-title" label="Título da seção de álbuns" placeholder="Galerias" value={page.albumsTitle ?? ''} onChange={set('albumsTitle')} max={LIMITS.albumsTitle} />
                    </Section>

                    <Section title="Venda" sub="Textos da página do álbum.">
                      <TextField
                        id="album-note"
                        label="Recado nos álbuns"
                        placeholder="Ex.: Os arquivos chegam em alta resolução, sem marca d'água."
                        value={page.albumNote}
                        onChange={set('albumNote')}
                        max={LIMITS.albumNote}
                        multiline
                      />
                      <TextField id="buy-label" label="Texto do botão de compra" value={page.buyLabel} onChange={set('buyLabel')} max={LIMITS.buyLabel} />
                      <label className="toggle">
                        <input type="checkbox" checked={norm.showPrices} onChange={(e) => set('showPrices')(e.target.checked)} />
                        <span className="toggle__track" aria-hidden="true" />
                        <span>
                          <span className="toggle__label">Mostrar preços na lista de álbuns</span>
                          <span className="hint">O valor sempre aparece na hora da compra.</span>
                        </span>
                      </label>
                    </Section>
                  </>
                )}

                {tab === 'contato' && (
                  <Section title="Contato" sub="Aparecem como botões no topo da página. Deixe em branco para esconder." icon="chat">
                    <TextField id="whatsapp" label="WhatsApp" placeholder="(31) 99999-9999" value={page.whatsapp} onChange={set('whatsapp')} max={LIMITS.whatsapp} inputMode="tel" />
                    <TextField id="instagram" label="Instagram" placeholder="@seuestudio" value={page.instagram} onChange={set('instagram')} max={LIMITS.instagram} />
                    <TextField id="email" label="E-mail" placeholder="contato@seuestudio.com.br" value={page.email} onChange={set('email')} max={LIMITS.email} type="email" />
                  </Section>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="editor__foot">
              <button type="button" className="link-btn" onClick={() => setResetOpen(true)}>
                Restaurar visual padrão
              </button>
            </div>
          </div>

          <aside className="editor__preview" aria-label="Prévia da página">
            {previewBar}
            <PreviewFrame device={device} slug={profile.slug} view={view}>
              {preview}
            </PreviewFrame>
          </aside>
        </div>

        <AnimatePresence>
          {full && (
            <motion.div className="pv-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="pv-full__inner">
                {previewBar}
                <PreviewFrame device={device} slug={profile.slug} view={view} tall>
                  {preview}
                </PreviewFrame>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dirty && (
            <motion.div
              className="savebar"
              role="region"
              aria-label="Alterações não salvas"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
            >
              <span className="savebar__dot" aria-hidden="true" />
              <p className="savebar__text">
                Alterações não salvas <span className="savebar__kbd hide-sm">Ctrl + S</span>
              </p>
              <Button size="sm" onClick={discard} disabled={busy}>
                Descartar
              </Button>
              <Button variant="accent" size="sm" onClick={save} loading={busy}>
                Salvar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmModal open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={resetDefaults} title="Restaurar o visual padrão?" confirmLabel="Restaurar">
          Tema, cor, tipografia, layout, textos e contatos voltam ao padrão da Fotly. Suas imagens são mantidas. Nada muda até você salvar.
        </ConfirmModal>
      </Page>
    </AppShell>
  )
}

/** Busca até 12 fotos reais de um álbum para a prévia (sem bloquear a tela). */
function usePreviewMedia(albumId) {
  const [media, setMedia] = useState(null)
  useEffect(() => {
    if (!albumId) return
    let alive = true
    albumMedia(albumId)
      .then((list) => alive && setMedia(list.slice(0, 12)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [albumId])
  return media
}

/* ---------- Prévia ---------- */

function PreviewContent({ view, page, photographer, albums, album, media }) {
  const theme = themeProps(page)
  const p = normalizePage(page)
  const cover = media.find((m) => m.kind !== 'video') ?? media[0]
  return (
    <div className={`${theme.className} pv-page`} style={theme.style}>
      {view === 'perfil' ? (
        <div className="public-profile">
          <ProfileHero photographer={photographer} page={page} interactive={false} />
          <AlbumsSection albums={albums} page={page} animate={false} />
        </div>
      ) : (
        <div className="public-album">
          <AlbumHero photographer={photographer} page={page} album={{ ...album, sample: cover?.sample ? cover.sample : undefined }} count={album.mediaCount ?? media.length} coverPath={cover?.previewPath} />
          <div className="atoolbar">
            <div className="container atoolbar__inner">
              <p className="atoolbar__hint">
                <span className="atoolbar__hint-dot" aria-hidden="true" />
                <strong>2 selecionadas</strong>
              </p>
              <span className="btn btn--ghost btn--sm">Selecionar todas</span>
            </div>
          </div>
          <div className="container">
            {p.albumNote && <p className="album-note">{p.albumNote}</p>}
            <Gallery media={media} page={page} selected={new Set(media.slice(1, 3).map((m) => m.id))} onToggle={() => {}} animate={false} />
          </div>
          <div className="cart-bar cart-bar--static">
            <div className="container cart-bar__inner">
              <p className="cart-bar__sum">
                <span className="cart-bar__icon">
                  <Icon name="cart" size={18} />
                </span>
                <span>
                  <strong>2 itens</strong>
                  <span className="cart-bar__total">{brl((album.defaultPrice ?? 1500) * 2)}</span>
                </span>
              </p>
              <span className="btn btn--accent">{p.buyLabel}</span>
            </div>
          </div>
        </div>
      )}
      <footer className="public__foot">
        <div className="container public__foot-inner">Página criada com Fotly</div>
      </footer>
    </div>
  )
}

/** Moldura de navegador/celular. Renderiza a página na largura real e reduz em escala. */
function PreviewFrame({ device, slug, view, tall = false, children }) {
  const width = DEVICES.find((d) => d.value === device).width
  return (
    <div className={`preview-frame preview-frame--${device} ${tall ? 'is-tall' : ''}`}>
      <div className="preview-frame__bar">
        {device === 'desktop' ? (
          <>
            <span />
            <span />
            <span />
          </>
        ) : null}
        <p>
          fotly.com.br/{slug}
          {view === 'album' ? '/álbum' : ''}
        </p>
      </div>
      <div className="preview-frame__viewport">
        <Scaled width={width}>{children}</Scaled>
      </div>
    </div>
  )
}

function Scaled({ width, children }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [box, setBox] = useState({ scale: 0, height: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return
      const scale = Math.min(1, outer.current.clientWidth / width)
      setBox({ scale, height: inner.current.offsetHeight * scale })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer.current)
    ro.observe(inner.current)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={outer} className="scaled" style={{ height: box.height }}>
      <div ref={inner} className="scaled__inner" inert style={{ width, transform: `scale(${box.scale})`, opacity: box.scale ? 1 : 0 }}>
        {children}
      </div>
    </div>
  )
}

/* ---------- Controles ---------- */

function Section({ title, sub, icon, children }) {
  return (
    <section className="app-card app-card--pad editor__section">
      <div className="editor__section-head">
        {icon && (
          <span className="editor__section-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        <div>
          <h3 className="app-card__title">{title}</h3>
          <p className="app-card__sub">{sub}</p>
        </div>
      </div>
      <div className="form">{children}</div>
    </section>
  )
}

function Choice({ active, onClick, label, hint, children }) {
  return (
    <button type="button" role="radio" aria-checked={active} className={`choice ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="choice__art">{children}</span>
      <span className="choice__label">
        {label}
        {active && (
          <span className="choice__check">
            <Icon name="check" size={11} stroke={3} />
          </span>
        )}
      </span>
      {hint && <span className="choice__hint">{hint}</span>}
    </button>
  )
}

/** Miniatura do estilo pronto com as cores e a fonte dele. */
function PresetThumb({ values }) {
  const theme = THEMES.find((t) => t.value === values.theme).palette
  const font = FONTS.find((f) => f.value === values.font)
  const accent = values.accent === theme.ink ? theme.text : values.accent
  return (
    <span className="preset__thumb" style={{ background: theme.ink, color: theme.text, borderColor: theme.line }}>
      <span className="preset__name" style={{ fontFamily: font.display }}>
        Aa
      </span>
      <span className="preset__tiles">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ background: i === 0 ? accent : theme.surface, borderRadius: values.corners === 'square' ? 1 : values.corners === 'round' ? 6 : 3 }} />
        ))}
      </span>
    </span>
  )
}

/** Desenhos simples dos layouts. */
function Wire({ kind }) {
  const b = 'var(--wire-b)'
  const f = 'var(--wire-f)'
  const a = 'var(--wire-a)'
  const shapes = {
    'hero-classic': (
      <>
        <rect x="6" y="6" width="88" height="22" rx="3" fill={f} />
        <circle cx="18" cy="32" r="7" fill={a} />
        <rect x="29" y="31" width="34" height="5" rx="2" fill={b} />
        <rect x="29" y="39" width="22" height="3" rx="1.5" fill={f} />
        <rect x="6" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="37" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="68" y="48" width="26" height="10" rx="2" fill={f} />
      </>
    ),
    'hero-cover': (
      <>
        <rect x="0" y="0" width="100" height="44" fill={f} />
        <rect x="8" y="24" width="48" height="8" rx="2" fill={b} />
        <rect x="8" y="35" width="28" height="3" rx="1.5" fill={b} opacity="0.6" />
        <rect x="6" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="37" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="68" y="48" width="26" height="10" rx="2" fill={f} />
      </>
    ),
    'hero-centered': (
      <>
        <rect x="0" y="0" width="100" height="18" fill={f} />
        <circle cx="50" cy="19" r="8" fill={a} />
        <rect x="32" y="31" width="36" height="5" rx="2" fill={b} />
        <rect x="38" y="39" width="24" height="3" rx="1.5" fill={f} />
        <rect x="6" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="37" y="48" width="27" height="10" rx="2" fill={f} />
        <rect x="68" y="48" width="26" height="10" rx="2" fill={f} />
      </>
    ),
    'albums-cards': (
      <>
        {[6, 37, 68].map((x) => (
          <g key={x}>
            <rect x={x} y="8" width="26" height="22" rx="3" fill={f} />
            <rect x={x} y="34" width="18" height="4" rx="2" fill={b} />
            <rect x={x} y="41" width="11" height="3" rx="1.5" fill={f} />
          </g>
        ))}
      </>
    ),
    'albums-mosaic': (
      <>
        <rect x="6" y="6" width="56" height="48" rx="3" fill={f} />
        <rect x="66" y="6" width="28" height="22" rx="3" fill={f} />
        <rect x="66" y="32" width="28" height="22" rx="3" fill={f} />
        <rect x="11" y="44" width="24" height="5" rx="2" fill={b} />
      </>
    ),
    'albums-list': (
      <>
        <rect x="6" y="6" width="52" height="22" rx="3" fill={f} />
        <rect x="64" y="12" width="28" height="5" rx="2" fill={b} />
        <rect x="64" y="20" width="16" height="3" rx="1.5" fill={a} />
        <rect x="42" y="33" width="52" height="22" rx="3" fill={f} />
        <rect x="8" y="39" width="28" height="5" rx="2" fill={b} />
        <rect x="8" y="47" width="16" height="3" rx="1.5" fill={a} />
      </>
    ),
    'media-grid': (
      <>
        {[0, 1, 2, 3].map((c) =>
          [0, 1].map((r) => <rect key={`${c}${r}`} x={8 + c * 22} y={6 + r * 25} width="19" height="22" rx="2" fill={f} />)
        )}
      </>
    ),
    'media-masonry': (
      <>
        <rect x="8" y="6" width="19" height="28" rx="2" fill={f} />
        <rect x="8" y="37" width="19" height="17" rx="2" fill={f} />
        <rect x="30" y="6" width="19" height="16" rx="2" fill={f} />
        <rect x="30" y="25" width="19" height="29" rx="2" fill={f} />
        <rect x="52" y="6" width="19" height="22" rx="2" fill={f} />
        <rect x="52" y="31" width="19" height="23" rx="2" fill={f} />
        <rect x="74" y="6" width="19" height="31" rx="2" fill={f} />
        <rect x="74" y="40" width="19" height="14" rx="2" fill={f} />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 100 60" className="wire" aria-hidden="true">
      {shapes[kind]}
    </svg>
  )
}

function TextField({ id, label, value, onChange, max, multiline, ...rest }) {
  const Tag = multiline ? 'textarea' : 'input'
  const near = value.length > max * 0.9
  return (
    <div className="field">
      <div className="field__top">
        <label htmlFor={id}>{label}</label>
        <span className={`field__count ${near ? 'is-near' : ''}`}>
          {value.length}/{max}
        </span>
      </div>
      <Tag id={id} className={`input ${multiline ? 'input--area' : ''}`} value={value} maxLength={max} rows={multiline ? 3 : undefined} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  )
}

function ImagePicker({ label, hint, kind, path, onChange }) {
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function pick(file) {
    if (!file) return
    setBusy(true)
    try {
      const newPath = await uploadBrandingImage(file, kind)
      onChange(newPath)
      toast.success(`${label} enviada`, { description: 'Salve para publicar.' })
    } catch (e) {
      toast.error(`Não foi possível enviar a ${label.toLowerCase()}`, { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`image-picker image-picker--${kind} ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        pick(e.dataTransfer.files?.[0])
      }}
    >
      <button type="button" className="image-picker__preview" onClick={() => input.current?.click()} disabled={busy} aria-label={`${path ? 'Trocar' : 'Enviar'} ${label.toLowerCase()}`}>
        {busy ? <Spinner size={20} /> : path ? <StorageImg path={path} alt="" /> : <Icon name={kind === 'avatar' ? 'camera' : 'image'} size={22} />}
        {!busy && (
          <span className="image-picker__over">
            <Icon name="upload" size={16} />
          </span>
        )}
      </button>
      <div className="image-picker__info">
        <p className="image-picker__label">{label}</p>
        <p className="hint">{hint} Arraste ou clique.</p>
        <div className="image-picker__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current?.click()} disabled={busy}>
            <Icon name="upload" size={14} /> {path ? 'Trocar' : 'Enviar'}
          </button>
          {path && (
            <button type="button" className="icon-btn icon-btn--sm" aria-label={`Remover ${label.toLowerCase()}`} onClick={() => onChange('')} disabled={busy}>
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
