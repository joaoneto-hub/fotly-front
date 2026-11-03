import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Landing from './pages/Landing.jsx'
import { ErrorBoundary, FullPageSpinner } from './app/ui.jsx'

// O app (login, painel, páginas públicas) carrega sob demanda:
// a landing abre rápido e não depende do Firebase.
const AppRoutes = lazy(() => import('./AppRoutes.jsx'))

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="*"
          element={
            <ErrorBoundary>
              <Suspense fallback={<FullPageSpinner />}>
                <AppRoutes />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </MotionConfig>
  )
}
