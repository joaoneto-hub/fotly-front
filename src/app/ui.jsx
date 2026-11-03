import { Component, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, Logo, ease } from '../components/shared.jsx'

export function Spinner({ size = 22, label = 'Carregando' }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label} />
}

export function FullPageSpinner() {
  return (
    <div className="full-center">
      <Spinner size={32} />
    </div>
  )
}

export function BrandLink({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <Logo />
      <span>Fotly</span>
    </Link>
  )
}

/** Página animada (entra com fade). */
export function Page({ children, className = '' }) {
  return (
    <motion.div
      className={`page ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      {children}
    </motion.div>
  )
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foca o primeiro campo do modal
    setTimeout(() => panel.current?.querySelector('input, select, textarea, button')?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            ref={panel}
            className="modal"
            style={{ maxWidth: width }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="modal__head">
              <h2 className="modal__title">{title}</h2>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
                <Icon name="close" size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Pede confirmação antes de uma ação. onConfirm pode ser assíncrono. */
export function ConfirmModal({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirmar', danger = false }) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} width={440}>
      <div className="form">
        <p className="muted confirm__text">{children}</p>
        <div className="confirm__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={`btn btn--sm ${danger ? 'btn--danger' : 'btn--accent'}`} onClick={confirm} disabled={busy}>
            {busy && <Spinner size={14} />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Copia um texto e avisa com toast. */
export async function copyText(text, toast, label = 'Link copiado') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label)
  } catch {
    toast.error('Não foi possível copiar', { description: 'Selecione o texto e copie manualmente.' })
  }
}

export function Alert({ children, tone = 'error' }) {
  if (!children) return null
  return (
    <p className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

/** Campo de valor em reais. Trabalha em centavos: value={1500} mostra "15,00". */
export function MoneyInput({ id, value, onChange, ...rest }) {
  const [text, setText] = useState(formatCents(value))
  useEffect(() => setText(formatCents(value)), [value])
  return (
    <div className="money">
      <span className="money__prefix">R$</span>
      <input
        id={id}
        className="input money__input"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d,.]/g, ''))}
        onBlur={() => {
          const cents = parseCents(text)
          setText(formatCents(cents))
          onChange(cents)
        }}
        {...rest}
      />
    </div>
  )
}

export function formatCents(cents) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseCents(text) {
  const clean = String(text).trim().replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(clean)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}

export const MODE_LABEL = { public: 'Público', private: 'Privado', store: 'Loja' }

/** Mostra erros de carregamento (ex.: .env faltando) em vez de tela branca. */
export class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const missing = error.code === 'fotly/missing-config'
    return (
      <div className="full-center">
        <div className="panel panel--narrow">
          <h1 className="h3">{missing ? 'Falta configurar o Firebase' : 'Algo deu errado'}</h1>
          <p className="muted">{error.message}</p>
          <Link to="/" className="btn btn--ghost" onClick={() => this.setState({ error: null })}>
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }
}

/** Mensagens amigáveis para erros do Firebase. */
export function errorMessage(e) {
  const code = e?.code ?? ''
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return 'A janela de login foi fechada.'
  if (code.includes('popup-blocked')) return 'O navegador bloqueou a janela. Libere popups para este site.'
  if (code.includes('network')) return 'Sem conexão. Verifique sua internet.'
  if (code.includes('permission-denied')) return 'Você não tem permissão para isso.'
  return e?.message ?? 'Erro inesperado.'
}
