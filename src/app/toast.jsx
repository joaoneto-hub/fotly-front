import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, ease } from '../components/shared.jsx'
import './toast.css'

const ToastContext = createContext(null)

const DURATION = { success: 3200, info: 4000, error: 6500 }
const ICON = { success: 'check', info: 'info', error: 'alert' }
const MAX = 4

/**
 * Avisos rápidos no canto da tela.
 *   const toast = useToast()
 *   toast.success('Link copiado')
 *   toast.error('Não foi possível salvar', { description: 'Sem conexão.' })
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone, title, { description, duration } = {}) => {
      const id = crypto.randomUUID()
      setItems((list) => [...list.slice(-(MAX - 1)), { id, tone, title, description }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration ?? DURATION[tone]))
      return id
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      success: (title, opts) => push('success', title, opts),
      error: (title, opts) => push('error', title, opts),
      info: (title, opts) => push('info', title, opts),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toaster" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.tone}`}
              role={t.tone === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              transition={{ duration: 0.28, ease }}
              onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
              onMouseLeave={() => timers.current.set(t.id, setTimeout(() => dismiss(t.id), 1800))}
            >
              <span className="toast__icon">
                <Icon name={ICON[t.tone]} size={16} stroke={2.4} />
              </span>
              <div className="toast__body">
                <p className="toast__title">{t.title}</p>
                {t.description && <p className="toast__desc">{t.description}</p>}
              </div>
              <button type="button" className="toast__close" aria-label="Fechar aviso" onClick={() => dismiss(t.id)}>
                <Icon name="close" size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return ctx
}
