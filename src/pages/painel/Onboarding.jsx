import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { createProfile, toSlug } from '../../lib/auth.js'
import { RESERVED_SLUGS } from '../../lib/profiles.js'
import AppShell from '../../app/AppShell.jsx'
import { useToast } from '../../app/toast.jsx'
import { Alert, Button, Page, errorMessage } from '../../app/ui.jsx'

/** Primeiro acesso: criar o perfil e reservar o endereço. */
export default function Onboarding() {
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.displayName ?? '')
  const [slug, setSlug] = useState(toSlug(user?.displayName ?? ''))
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!touchedSlug) setSlug(toSlug(name))
  }, [name, touchedSlug])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const clean = toSlug(slug)
    if (!name.trim()) return setError('Informe seu nome ou o nome do estúdio.')
    if (clean.length < 3) return setError('O endereço precisa ter pelo menos 3 caracteres.')
    if (RESERVED_SLUGS.includes(clean)) return setError('Esse endereço é reservado. Escolha outro.')
    setBusy(true)
    try {
      await createProfile({ displayName: name, slug: clean })
      toast.success('Página criada', { description: `fotly.com.br/${clean} é sua.` })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AppShell crumbs={[{ label: 'Primeiro acesso' }]} title="Bem-vindo à Fotly" bare>
      <Page className="onboarding">
        <div className="app-card app-card--pad onboarding__card">
          <span className="onboarding__step">Passo 1 de 2</span>
          <h2 className="app-h2">Vamos criar sua página</h2>
          <p className="muted">Esse é o endereço que você vai mandar para os clientes.</p>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="name">Seu nome ou do estúdio</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="slug">Endereço da página</label>
              <div className="slug-input">
                <span>fotly.com.br/</span>
                <input
                  id="slug"
                  className="input"
                  value={slug}
                  onChange={(e) => {
                    setTouchedSlug(true)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                  maxLength={30}
                  required
                />
              </div>
              <p className="hint">Letras minúsculas, números e hífen.</p>
            </div>
            <Alert>{error}</Alert>
            <Button type="submit" variant="accent" block loading={busy}>
              Criar minha página
            </Button>
          </form>
        </div>
      </Page>
    </AppShell>
  )
}
