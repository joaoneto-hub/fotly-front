import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { signInWithGoogle } from '../lib/auth.js'
import { Alert, BrandLink, FullPageSpinner, Page, Spinner, errorMessage } from '../app/ui.jsx'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to={location.state?.from ?? '/painel'} replace />

  async function handleLogin() {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
      navigate(location.state?.from ?? '/painel', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <header className="container auth-layout__top">
        <BrandLink />
      </header>
      <Page className="auth-card-wrap">
        <div className="panel panel--narrow auth-card">
          <h1 className="h2 auth-card__title">Entre na Fotly</h1>
          <p className="muted">Use sua conta Google. Depois você conecta o Drive onde os originais vão ficar.</p>
          <button type="button" className="btn btn--light btn--lg btn--block auth-card__btn" onClick={handleLogin} disabled={busy}>
            {busy ? <Spinner size={18} /> : <GoogleMark />}
            Entrar com Google
          </button>
          <Alert>{error}</Alert>
          <p className="fine">
            Ao entrar, você concorda com os <a href="#">Termos de uso</a> e a <a href="#">Política de privacidade</a>.
          </p>
        </div>
      </Page>
    </div>
  )
}
