import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  ACCENTS,
  DEFAULT_PAGE,
  FONTS,
  GRIDS,
  LIMITS,
  THEMES,
  normalizePage,
  removeBrandingImage,
  savePage,
  themeVars,
  uploadBrandingImage,
} from '../../lib/page.js'
import AppShell from '../../app/AppShell.jsx'
import { PageHead, Segmented } from '../../app/dashboard-parts.jsx'
import { AlbumCard, ProfileHero, StorageImg } from '../../app/public-parts.jsx'
import { useToast } from '../../app/toast.jsx'
import { useAlbums } from '../../app/useOwnerData.js'
import { ConfirmModal, Page, Spinner, errorMessage } from '../../app/ui.jsx'
import { Icon } from '../../components/shared.jsx'

const SAMPLE_ALBUMS = [
  { id: 'a', title: 'Casamento Ana & Pedro', mode: 'public', defaultPrice: 1500, mediaCount: 248 },
  { id: 'b', title: 'Corrida de Rua 2026', mode: 'public', defaultPrice: 1200, mediaCount: 1320 },
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
  // Imagens enviadas nesta edição: se o fotógrafo descartar, apagamos do Storage
  const uploaded = useRef(new Set())

  const dirty = JSON.stringify(normalizePage(page)) !== JSON.stringify(saved.page) || bio.trim() !== saved.bio
  const set = (key) => (value) => setPage((p) => ({ ...p, [key]: value }))

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
    setBusy(true)
    try {
      await savePage({ page, bio })
      // Imagens trocadas: apaga as que não estão mais em uso
      const keep = new Set([page.avatarPath, page.coverPath])
      for (const path of [saved.page.avatarPath, saved.page.coverPath, ...uploaded.current]) {
        if (path && !keep.has(path)) removeBrandingImage(path)
      }
      uploaded.current.clear()
      toast.success('Página atualizada', { description: 'Seus clientes já veem o novo visual.' })
    } catch (e) {
      toast.error('Não foi possível salvar', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  function discard() {
    for (const path of uploaded.current) removeBrandingImage(path)
    uploaded.current.clear()
    setPage(saved.page)
    setBio(saved.bio)
    toast.info('Alterações descartadas')
  }

  function resetDefaults() {
    setPage({ ...DEFAULT_PAGE, avatarPath: page.avatarPath, coverPath: page.coverPath })
    toast.info('Visual padrão aplicado', { description: 'Salve para publicar.' })
  }

  const previewAlbums = albums?.filter((a) => a.status === 'published' && a.mode !== 'private').slice(0, 2)

  return (
    <AppShell
      crumbs={[{ label: 'Painel', to: '/painel' }, { label: 'Minha página' }]}
      actions={
        <>
          <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            <Icon name="external" size={14} /> <span className="hide-sm">Ver página</span>
          </a>
          <button type="button" className="btn btn--accent btn--sm" onClick={save} disabled={!dirty || busy}>
            {busy && <Spinner size={14} />} Salvar
          </button>
        </>
      }
    >
      <Page>
        <PageHead title="Minha página" sub="Deixe a página de venda com a cara do seu trabalho. A prévia mostra o resultado na hora." />

        <div className="editor">
          <div className="editor__form">
            <Section title="Aparência" sub="Tema, cor de destaque e tipografia.">
              <div className="field">
                <span className="field__label">Tema</span>
                <Segmented id="theme" value={page.theme} onChange={set('theme')} options={THEMES} label="Tema" />
              </div>
              <div className="field">
                <span className="field__label">Cor de destaque</span>
                <div className="swatches" role="radiogroup" aria-label="Cor de destaque">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={page.accent === c}
                      aria-label={c}
                      className={`swatch ${page.accent === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => set('accent')(c)}
                    />
                  ))}
                  <label className={`swatch swatch--custom ${ACCENTS.includes(page.accent) ? '' : 'is-active'}`} title="Outra cor">
                    <input type="color" value={page.accent} onChange={(e) => set('accent')(e.target.value)} aria-label="Escolher outra cor" />
                    <Icon name="plus" size={14} stroke={2.4} />
                  </label>
                </div>
              </div>
              <div className="field">
                <span className="field__label">Tipografia dos títulos</span>
                <div className="font-options" role="radiogroup" aria-label="Tipografia">
                  {FONTS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={page.font === f.value}
                      className={`font-option ${page.font === f.value ? 'is-active' : ''}`}
                      onClick={() => set('font')(f.value)}
                    >
                      <span className="font-option__sample" style={{ fontFamily: f.display }}>
                        {f.sample}
                      </span>
                      <span className="font-option__label">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field__label">Tamanho das fotos no álbum</span>
                <Segmented id="grid" value={page.grid} onChange={set('grid')} options={GRIDS} label="Tamanho das fotos" />
              </div>
            </Section>

            <Section title="Imagens" sub="Foto de perfil e capa do topo da página.">
              <div className="image-pickers">
                <ImagePicker
                  label="Foto de perfil"
                  hint="Quadrada, pelo menos 400 px."
                  kind="avatar"
                  path={page.avatarPath}
                  onChange={(p) => {
                    if (p) uploaded.current.add(p)
                    set('avatarPath')(p)
                  }}
                />
                <ImagePicker
                  label="Capa"
                  hint="Horizontal, pelo menos 1600 px de largura."
                  kind="cover"
                  path={page.coverPath}
                  onChange={(p) => {
                    if (p) uploaded.current.add(p)
                    set('coverPath')(p)
                  }}
                />
              </div>
            </Section>

            <Section title="Textos" sub="O que o cliente lê ao abrir sua página.">
              <TextField id="headline" label="Chamada" placeholder="Ex.: Fotografia de casamentos em Belo Horizonte" value={page.headline} onChange={set('headline')} max={LIMITS.headline} />
              <TextField id="bio" label="Sobre você" placeholder="Conte em poucas linhas como é o seu trabalho." value={bio} onChange={setBio} max={LIMITS.bio} multiline />
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
                <input type="checkbox" checked={page.showPrices} onChange={(e) => set('showPrices')(e.target.checked)} />
                <span className="toggle__track" aria-hidden="true" />
                <span>
                  <span className="toggle__label">Mostrar preços na lista de álbuns</span>
                  <span className="hint">O valor sempre aparece na hora da compra.</span>
                </span>
              </label>
            </Section>

            <Section title="Contato" sub="Aparecem como botões no topo da página. Deixe em branco para esconder.">
              <TextField id="whatsapp" label="WhatsApp" placeholder="(31) 99999-9999" value={page.whatsapp} onChange={set('whatsapp')} max={LIMITS.whatsapp} inputMode="tel" />
              <TextField id="instagram" label="Instagram" placeholder="@seuestudio" value={page.instagram} onChange={set('instagram')} max={LIMITS.instagram} />
              <TextField id="email" label="E-mail" placeholder="contato@seuestudio.com.br" value={page.email} onChange={set('email')} max={LIMITS.email} type="email" />
            </Section>

            <div className="editor__foot">
              <button type="button" className="link-btn" onClick={() => setResetOpen(true)}>
                Restaurar visual padrão
              </button>
              {dirty && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={discard} disabled={busy}>
                  Descartar alterações
                </button>
              )}
              <button type="button" className="btn btn--accent btn--sm" onClick={save} disabled={!dirty || busy}>
                {busy && <Spinner size={14} />} Salvar alterações
              </button>
            </div>
          </div>

          <aside className="editor__preview" aria-label="Prévia da página">
            <div className="preview-frame">
              <div className="preview-frame__bar">
                <span />
                <span />
                <span />
                <p>fotly.com.br/{profile.slug}</p>
              </div>
              <div className={`preview-frame__page public public--${normalizePage(page).theme}`} style={themeVars(page)}>
                <div className="preview-frame__inner">
                  <ProfileHero photographer={{ ...profile, bio: bio.trim() }} page={page} interactive={false} />
                  <div className="album-grid album-grid--preview">
                    {(previewAlbums?.length ? previewAlbums : SAMPLE_ALBUMS).map((a) => (
                      <AlbumCard key={a.id} album={a} page={page} />
                    ))}
                  </div>
                  {normalizePage(page).albumNote && <p className="album-note">{normalizePage(page).albumNote}</p>}
                  <div className="preview-frame__cta">
                    <span className="btn btn--accent btn--sm">{normalizePage(page).buyLabel}</span>
                  </div>
                </div>
              </div>
            </div>
            {dirty && <p className="hint editor__unsaved">Alterações ainda não salvas.</p>}
          </aside>
        </div>

        <ConfirmModal open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={resetDefaults} title="Restaurar o visual padrão?" confirmLabel="Restaurar">
          Tema, cor, tipografia, textos e contatos voltam ao padrão da Fotly. Suas imagens são mantidas. Nada muda até você salvar.
        </ConfirmModal>
      </Page>
    </AppShell>
  )
}

function Section({ title, sub, children }) {
  return (
    <section className="app-card app-card--pad editor__section">
      <div>
        <h3 className="app-card__title">{title}</h3>
        <p className="app-card__sub">{sub}</p>
      </div>
      <div className="form">{children}</div>
    </section>
  )
}

function TextField({ id, label, value, onChange, max, multiline, ...rest }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="field">
      <div className="field__top">
        <label htmlFor={id}>{label}</label>
        <span className="field__count">
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
    <div className={`image-picker image-picker--${kind}`}>
      <div className="image-picker__preview">
        {busy ? <Spinner size={20} /> : path ? <StorageImg path={path} alt="" /> : <Icon name={kind === 'avatar' ? 'camera' : 'image'} size={22} />}
      </div>
      <div className="image-picker__info">
        <p className="image-picker__label">{label}</p>
        <p className="hint">{hint}</p>
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
