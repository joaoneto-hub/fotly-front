import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, ease, staggerChild, staggerParent } from './shared.jsx'

const tiles = ['#4A3F35', '#5C6B66', '#2F3A45', '#6E5A4B', '#3D3A33', '#7A7166']
// Ordem em que o "cliente" seleciona as fotos na demonstração
const pickOrder = [1, 3, 5]
// Etapas: 0 nenhuma, 1..3 fotos selecionadas, 4 pagamento confirmado
const STEPS = 5

export default function Hero() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS), 1300)
    return () => clearInterval(id)
  }, [])

  const selectedCount = Math.min(step, 3)
  const selected = pickOrder.slice(0, selectedCount)
  const paid = step === 4

  return (
    <section id="topo" className="container hero">
      <motion.div className="hero__copy" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="pill" variants={staggerChild}>
          <Icon name="drive" size={16} className="accent" stroke={2} />
          Integrado ao seu Google Drive
        </motion.p>

        <h1 className="h1">
          <motion.span className="h1__line" variants={staggerChild}>
            Venda suas fotos.
          </motion.span>
          <motion.span className="h1__line" variants={staggerChild}>
            Os arquivos continuam{' '}
            <span className="h1__accent">
              seus.
              <svg className="h1__underline" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                <motion.path
                  d="M2 14 C 50 4, 120 4, 198 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 0.9, ease }}
                />
              </svg>
            </span>
          </motion.span>
        </h1>

        <motion.p className="lead lead--hero" variants={staggerChild}>
          A Fotly cria sua página de vendas e guarda os originais numa pasta do seu próprio Google Drive. Sem pagar
          armazenamento extra, sem prender seu trabalho numa plataforma.
        </motion.p>

        <motion.div className="hero__actions" variants={staggerChild}>
          <a href="/entrar" className="btn btn--accent btn--lg btn--arrow">
            Começar grátis
            <Icon name="arrow" size={18} stroke={2.2} />
          </a>
          <a href="#como-funciona" className="btn btn--ghost btn--lg">
            Ver como funciona
          </a>
        </motion.div>

        <motion.p className="hero__note" variants={staggerChild}>
          Pix e cartão · Marca d'água automática · Página pronta em minutos
        </motion.p>
      </motion.div>

      <motion.div
        className="hero__mock"
        initial={{ opacity: 0, y: 40, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease }}
      >
        <motion.div
          className="browser"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="browser__bar">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span className="browser__url">fotly.com.br/seunome</span>
          </div>

          <div className="browser__body">
            <div className="album-head">
              <div>
                <p className="album-head__title">[Nome do Estúdio]</p>
                <p className="album-head__meta">Casamento Ana &amp; Pedro · 248 fotos</p>
              </div>
              <span className="cart-badge">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={selectedCount}
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 12, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="cart-badge__num"
                  >
                    {selectedCount}
                  </motion.span>
                </AnimatePresence>
                no carrinho
              </span>
            </div>

            <motion.div
              className="photo-grid"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.6 } } }}
              initial="hidden"
              animate="show"
            >
              {tiles.map((color, i) => {
                const isSel = selected.includes(i)
                return (
                  <motion.div
                    key={i}
                    className={`photo ${isSel ? 'photo--selected' : ''}`}
                    style={{ background: color }}
                    variants={{
                      hidden: { opacity: 0, scale: 0.85 },
                      show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
                    }}
                  >
                    <Icon name="image" size={28} className="photo__glyph" stroke={1.4} />
                    <span className="photo__mark">FOTLY</span>
                    <AnimatePresence>
                      {isSel && (
                        <motion.span
                          className="photo__check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        >
                          <Icon name="check" size={14} stroke={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>

            <div className="checkout">
              <span className="checkout__where">
                Originais salvos em <strong>Meu Drive › Fotly</strong>
              </span>
              <span className={`checkout__pay ${selectedCount === 3 && !paid ? 'is-ready' : ''}`}>Pagar com Pix</span>
            </div>
          </div>

          <AnimatePresence>
            {paid && (
              <motion.div
                className="toast"
                role="status"
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.35, ease }}
              >
                <span className="toast__icon">
                  <Icon name="check" size={16} stroke={3} />
                </span>
                <span>
                  <strong>Pagamento confirmado</strong>
                  <br />3 fotos enviadas ao cliente
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </section>
  )
}
