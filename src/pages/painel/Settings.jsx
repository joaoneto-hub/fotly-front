import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { logout } from '../../lib/auth.js'
import { updateDisplayName } from '../../lib/profiles.js'
import AppShell from '../../app/AppShell.jsx'
import { DriveCard, PageHead } from '../../app/dashboard-parts.jsx'
import { useToast } from '../../app/toast.jsx'
import { Page, Spinner, copyText, errorMessage } from '../../app/ui.jsx'
import { Icon } from '../../components/shared.jsx'

export default function Settings() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(profile.displayName)
  const [busy, setBusy] = useState(false)

  useEffect(() => setName(profile.displayName), [profile.displayName])

  async function saveName(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await updateDisplayName(name)
      toast.success('Nome atualizado')
    } catch (err) {
      toast.error('Não foi possível salvar', { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const url = `${window.location.origin}/${profile.slug}`

  return (
    <AppShell crumbs={[{ label: 'Painel', to: '/painel' }, { label: 'Configurações' }]}>
      <Page>
        <PageHead title="Configurações" sub="Perfil, conexão com o Google Drive e conta." />

        <div className="settings-grid">
          <section className="app-card app-card--pad">
            <h3 className="app-card__title">Perfil</h3>
            <p className="app-card__sub">Como você aparece para os clientes.</p>
            <form className="form" onSubmit={saveName}>
              <div className="field">
                <label htmlFor="display-name">Nome ou estúdio</label>
                <input id="display-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </div>
              <div className="field">
                <span className="field__label">Endereço da página</span>
                <div className="url-box">
                  <span className="url-box__text">fotly.com.br/{profile.slug}</span>
                  <button type="button" className="icon-btn icon-btn--sm" onClick={() => copyText(url, toast)} aria-label="Copiar link">
                    <Icon name="copy" size={16} />
                  </button>
                </div>
                <p className="hint">O endereço não muda depois de criado, para não quebrar links já enviados.</p>
              </div>
              <div>
                <button type="submit" className="btn btn--accent btn--sm" disabled={busy || name.trim() === profile.displayName}>
                  {busy && <Spinner size={14} />} Salvar
                </button>
              </div>
            </form>
          </section>

          <DriveCard profile={profile} />

          <section className="app-card app-card--pad">
            <h3 className="app-card__title">Conta</h3>
            <p className="app-card__sub">Você entra com a conta Google abaixo.</p>
            <div className="account-row">
              <span className="avatar avatar--sm">
                {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : (user?.email ?? '?').charAt(0).toUpperCase()}
              </span>
              <span className="account-row__email">{user?.email}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
                <Icon name="logout" size={14} /> Sair
              </button>
            </div>
          </section>
        </div>
      </Page>
    </AppShell>
  )
}
