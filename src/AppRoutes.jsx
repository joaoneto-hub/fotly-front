import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './app/toast.jsx'
import { ErrorBoundary, FullPageSpinner } from './app/ui.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/painel/Onboarding.jsx'
import Overview from './pages/painel/Overview.jsx'
import Albums from './pages/painel/Albums.jsx'
import Sales from './pages/painel/Sales.jsx'
import PageEditor from './pages/painel/PageEditor.jsx'
import Settings from './pages/painel/Settings.jsx'
import AlbumManager from './pages/AlbumManager.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import PublicAlbum from './pages/PublicAlbum.jsx'
import Order from './pages/Order.jsx'
import NotFound from './pages/NotFound.jsx'

/** Painel: exige login e, antes de qualquer tela, o perfil criado. */
function Painel({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner text="Abrindo seu painel…" />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (!profile) return <Onboarding />
  return children
}

const PAINEL = [
  ['/painel', Overview],
  ['/painel/albuns', Albums],
  ['/painel/album/:albumId', AlbumManager],
  ['/painel/vendas', Sales],
  ['/painel/pagina', PageEditor],
  ['/painel/configuracoes', Settings],
]

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<Login />} />
            {PAINEL.map(([path, Screen]) => (
              <Route
                key={path}
                path={path}
                element={
                  <Painel>
                    <Screen />
                  </Painel>
                }
              />
            ))}
            <Route path="/pedido/:orderId" element={<Order />} />
            <Route path="/:slug" element={<PublicProfile />} />
            <Route path="/:slug/:albumId" element={<PublicAlbum />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
