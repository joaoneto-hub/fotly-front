import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { brl, watchOrder } from '../lib/checkout.js'
import PublicLayout from '../app/PublicLayout.jsx'
import { useToast } from '../app/toast.jsx'
import { Alert, FullPageSpinner, Page, Spinner, copyText } from '../app/ui.jsx'
import { Icon, ease } from '../components/shared.jsx'

const MESSAGES = {
  expired: 'O prazo de download deste pedido terminou. Fale com o fotógrafo.',
  cancelled: 'Este Pix foi cancelado ou expirou sem pagamento.',
  refunded: 'Este pedido foi estornado.',
  failed: 'Não foi possível gerar o pagamento deste pedido.',
  review: 'Recebemos o pagamento, mas ele está em análise. Fale com o fotógrafo.',
}

export default function Order() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [pix] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`fotly:pix:${orderId}`) ?? 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!token) {
      setError('Link do pedido incompleto.')
      return
    }
    return watchOrder(orderId, token, (o) => {
      setOrder(o)
      setError('')
    })
  }, [orderId, token])

  // Avisa só quando o Pix é pago com a página aberta, não ao reabrir um pedido já pago
  const toast = useToast()
  const lastStatus = useRef(null)
  useEffect(() => {
    if (!order) return
    if (lastStatus.current === 'pending' && order.status === 'paid') {
      toast.success('Pagamento confirmado', { description: 'Seus arquivos estão liberados.' })
    }
    lastStatus.current = order.status
  }, [order, toast])

  // watchOrder registra erros no console; se nada chegar em 10s, avisa
  useEffect(() => {
    if (order || error) return
    const t = setTimeout(() => setError('Não conseguimos encontrar este pedido. Confira o link.'), 10000)
    return () => clearTimeout(t)
  }, [order, error])

  if (!order && !error) return <FullPageSpinner />

  return (
    <PublicLayout>
      <Page className="container order">
        <div className="panel order__panel">
          {error && !order ? (
            <Alert>{error}</Alert>
          ) : (
            <AnimatePresence mode="wait">
              {order.status === 'pending' && <Pending key="pending" order={order} pix={pix} />}
              {order.status === 'paid' && <Paid key="paid" order={order} />}
              {MESSAGES[order.status] && (
                <motion.div key="other" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="h3">Pedido indisponível</h1>
                  <p className="muted">{MESSAGES[order.status]}</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </Page>
    </PublicLayout>
  )
}

function Pending({ order, pix }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  async function copy() {
    await copyText(pix.qrCode, toast, 'Código Pix copiado')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease }}>
      <p className="eyebrow">Pagamento</p>
      <h1 className="h2">Pague {brl(order.total)} com Pix</h1>

      {pix?.qrCodeBase64 ? (
        <>
          <img className="pix-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code do Pix" />
          {pix.qrCode && (
            <div className="pix-copy">
              <input className="input" value={pix.qrCode} readOnly aria-label="Pix copia e cola" onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn--light" onClick={copy}>
                <Icon name={copied ? 'check' : 'link'} size={18} /> {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Abra o app do seu banco e pague o Pix gerado para este pedido.</p>
      )}

      <p className="waiting">
        <Spinner size={16} /> Aguardando a confirmação do pagamento. Esta página atualiza sozinha.
      </p>
      <p className="fine">Guarde o link desta página: é por ele que você baixa os arquivos depois.</p>
    </motion.div>
  )
}

function Paid({ order }) {
  const expires = order.expiresAt ? new Date(order.expiresAt).toLocaleDateString('pt-BR') : null
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>
      <motion.span
        className="paid-mark"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
      >
        <Icon name="check" size={28} stroke={3} />
      </motion.span>
      <h1 className="h2">Pagamento confirmado</h1>
      <p className="muted">
        Seus arquivos estão prontos{expires ? `. Os links valem até ${expires}` : ''}.
      </p>
      <ul className="downloads">
        {order.items.map((i, idx) => (
          <motion.li
            key={i.mediaId}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.2 + idx * 0.05, ease }}
          >
            <span className="downloads__name">{i.name}</span>
            <a className="btn btn--accent btn--sm" href={i.downloadUrl} rel="noreferrer">
              Baixar
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
