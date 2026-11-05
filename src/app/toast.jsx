import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, ease } from '../components/shared.jsx'
import './toast.css'

const ToastContext = createContext(null)

const DURATION = { success: 3600, info: 4500, warning: 6000, error: 7000, loading: 0 }
const ICON = { success: 'check', info: 'info', warning: 'alert', error: 'alert' }
const TITLE_A11Y = { success: 'Sucesso', info: 'Aviso', warning: 'Atenção', error: 'Erro', loading: 'Carregando' }
const MAX = 4

/**
 * Avisos rápidos no canto da tela.
 *
 *   const toast = useToast()
 *   toast.success('Link copiado')
 *   toast.error('Não foi possível salvar', { description: 'Sem conexão.' })
 *   toast.info('Álbum despublicado', { action: { label: 'Desfazer', onClick: undo } })
 *   const id = toast.loading('Enviando…'); toast.update(id, { tone: 'success', title: 'Enviado' })
 *   await toast.promise(save(), { loading: 'Salvando…', success: 'Salvo', error: (e) => e.message })
 *
 * O tempo de exibição é uma animação CSS da barra de progresso: pausa no hover/foco
 * e o aviso some quando ela termina. Avisos iguais se agrupam com um contador.
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback((tone, title, opts = {}) => {
    const id = opts.id ?? crypto.randomUUID()
    setItems((list) => {
      // Mesmo aviso já na tela: soma o contador e reinicia o tempo
      const twin = list.find((t) => t.id === id || (tone !== 'loading' && t.tone === tone && t.title === title && t.description === opts.description))
      if (twin) {
        return list.map((t) => (t === twin ? { ...t, count: t.count + 1, run: t.run + 1 } : t))
      }
      return [...list.slice(-(MAX - 1)), make(id, tone, title, opts)]
    })
    return id
  }, [])

  const update = useCallback((id, { tone, title, ...opts }) => {
    setItems((list) =>
      list.map((t) =>
        t.id === id ? { ...make(id, tone ?? t.tone, title ?? t.title, { description: t.description, action: t.action, ...opts }), count: t.count, run: t.run + 1 } : t
      )
    )
  }, [])

  const api = useMemo(() => {
    const promise = async (p, msgs) => {
      const id = push('loading', msgs.loading ?? 'Carregando…', { description: msgs.loadingDescription })
      try {
        const result = await p
        const s = typeof msgs.success === 'function' ? msgs.success(result) : msgs.success
        if (s) update(id, { tone: 'success', ...(typeof s === 'string' ? { title: s, description: undefined } : s) })
        else dismiss(id)
        return result
      } catch (e) {
        const er = typeof msgs.error === 'function' ? msgs.error(e) : msgs.error
        update(id, { tone: 'error', ...(typeof er === 'string' ? { title: er, description: undefined } : er ?? { title: 'Algo deu errado' }) })
        throw e
      }
    }
    return {
      success: (title, opts) => push('success', title, opts),
      error: (title, opts) => push('error', title, opts),
      info: (title, opts) => push('info', title, opts),
      warning: (title, opts) => push('warning', title, opts),
      loading: (title, opts) => push('loading', title, opts),
      update,
      promise,
      dismiss,
    }
  }, [push, update, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section className="toaster" aria-label="Avisos">
        <ol className="toaster__list">
          <AnimatePresence initial={false}>
            {items.map((t, i) => (
              <ToastItem key={t.id} t={t} depth={items.length - 1 - i} onDismiss={() => dismiss(t.id)} />
            ))}
          </AnimatePresence>
        </ol>
      </section>
    </ToastContext.Provider>
  )
}

function make(id, tone, title, { description, duration, action } = {}) {
  return { id, tone, title, description, action, duration: duration ?? DURATION[tone], count: 1, run: 0 }
}

function ToastItem({ t, depth, onDismiss }) {
  const timed = t.tone !== 'loading' && t.duration > 0
  return (
    <motion.li
      layout
      className={`toast toast--${t.tone}`}
      role={t.tone === 'error' ? 'alert' : 'status'}
      aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: depth > 2 ? 0.6 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ duration: 0.32, ease }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.1, right: 0.9 }}
      onDragEnd={(_, info) => (info.offset.x > 90 || info.velocity.x > 600) && onDismiss()}
    >
      <span className="toast__icon" aria-hidden="true">
        {t.tone === 'loading' ? <span className="toast__spin" /> : <Icon name={ICON[t.tone]} size={16} stroke={2.4} />}
      </span>
      <div className="toast__body">
        <p className="toast__title">
          <span className="sr-only">{TITLE_A11Y[t.tone]}: </span>
          {t.title}
          {t.count > 1 && <span className="toast__count">×{t.count}</span>}
        </p>
        {t.description && <p className="toast__desc">{t.description}</p>}
        {t.action && (
          <button
            type="button"
            className="toast__action"
            onClick={() => {
              t.action.onClick?.()
              onDismiss()
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button type="button" className="toast__close" aria-label="Fechar aviso" onClick={onDismiss}>
        <Icon name="close" size={14} />
      </button>
      {timed && (
        <span className="toast__timer" aria-hidden="true">
          <span key={t.run} className="toast__timer-fill" style={{ animationDuration: `${t.duration}ms` }} onAnimationEnd={onDismiss} />
        </span>
      )}
    </motion.li>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return ctx
}
