import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ErrorBoundary, FullPageSpinner } from './app/ui.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AlbumManager from './pages/AlbumManager.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import PublicAlbum from './pages/PublicAlbum.jsx'
import Order from './pages/Order.jsx'
import NotFound from './pages/NotFound.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  return children
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route
            path="/painel"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/painel/album/:albumId"
            element={
              <Protected>
                <AlbumManager />
              </Protected>
            }
          />
          <Route path="/pedido/:orderId" element={<Order />} />
          <Route path="/:slug" element={<PublicProfile />} />
          <Route path="/:slug/:albumId" element={<PublicAlbum />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}
