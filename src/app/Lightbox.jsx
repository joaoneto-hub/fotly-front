import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePreviewUrl } from './usePreviewUrl.js'
import { Icon, ease } from '../components/shared.jsx'
import './lightbox.css'

/**
 * Visualização ampliada das fotos, em tela cheia.
 *
 *   <Lightbox
 *     items={media}               // [{ id, previewPath, name, kind, width, height }]
 *     index={open}                // índice aberto ou null
 *     onIndex={setOpen}           // muda de foto (null fecha)
 *     caption={(m) => m.name}     // texto embaixo (opcional)
 *     actions={(m) => <button/>}  // ações da foto atual, ex.: selecionar (opcional)
 *   />
 *
 * Teclado: ← → navegam, Esc fecha. No celular: arraste para os lados ou para baixo.
 */
export default function Lightbox({ items, index, onIndex, caption, actions, footer }) {
  const open = index != null && items[index] != null
  return <AnimatePresence>{open && <Viewer key="lightbox" items={items} index={index} onIndex={onIndex} caption={caption} actions={actions} footer={footer} />}</AnimatePresence>
}

function Viewer({ items, index, onIndex, caption, actions, footer }) {
  const [dir, setDir] = useState(0)
  const [chrome, setChrome] = useState(true)
  const closeBtn = useRef(null)
  const strip = useRef(null)
  const item = items[index]
  const total = items.length

  const go = (step) => {
    const next = index + step
    if (next < 0 || next >= total) return
    setDir(step)
    onIndex(next)
  }
  const close = () => onIndex(null)

  // Teclado, rolagem travada e foco devolvido ao fechar
  useEffect(() => {
    const prevFocus = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Mantém a miniatura ativa visível na tira
  useEffect(() => {
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  return (
    <motion.div
      className={`lightbox ${chrome ? '' : 'is-bare'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${total}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="lightbox__top">
        <span className="lightbox__count">
          {index + 1} <span>/ {total}</span>
        </span>
        <div className="lightbox__top-actions">
          {actions?.(item)}
          <button ref={closeBtn} type="button" className="lightbox__btn" onClick={close} aria-label="Fechar (Esc)">
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      <div className="lightbox__stage" onClick={(e) => e.target === e.currentTarget && close()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={item.id}
            className="lightbox__slide"
            custom={dir}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 80, scale: 0.98 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d) => ({ opacity: 0, x: d * -80, scale: 0.98 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease }}
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.y > 120 || velocity.y > 800) close()
              else if (offset.x < -80 || velocity.x < -500) go(1)
              else if (offset.x > 80 || velocity.x > 500) go(-1)
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <BigImage item={item} onToggleChrome={() => setChrome((c) => !c)} />
          </motion.div>
        </AnimatePresence>

        {index > 0 && (
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Foto anterior (←)">
            <Icon name="left" size={26} />
          </button>
        )}
        {index < total - 1 && (
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Próxima foto (→)">
            <Icon name="right" size={26} />
          </button>
        )}
      </div>

      <div className="lightbox__bottom">
        {(caption || footer) && (
          <div className="lightbox__caption">
            {caption && <p>{caption(item)}</p>}
            {footer?.(item)}
          </div>
        )}
        {total > 1 && (
          <div className="lightbox__strip" ref={strip}>
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className={`lightbox__thumb ${i === index ? 'is-active' : ''}`}
                aria-current={i === index}
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => {
                  setDir(i > index ? 1 : -1)
                  onIndex(i)
                }}
              >
                <Thumb path={m.previewPath} near={Math.abs(i - index) < 12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pré-carrega as vizinhas para a navegação ser instantânea */}
      <Preload path={items[index + 1]?.previewPath} />
      <Preload path={items[index - 1]?.previewPath} />
    </motion.div>
  )
}

function BigImage({ item, onToggleChrome }) {
  const url = usePreviewUrl(item.previewPath)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="lightbox__frame">
      {!loaded && <span className="lightbox__loading" aria-hidden="true" />}
      {url && (
        <img
          src={url}
          alt={item.name ?? ''}
          className={loaded ? 'is-loaded' : ''}
          onLoad={() => setLoaded(true)}
          onDoubleClick={onToggleChrome}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}
      {item.kind === 'video' && (
        <span className="lightbox__video">
          <Icon name="play" size={14} stroke={2.4} /> Vídeo · prévia de um quadro
        </span>
      )}
    </div>
  )
}

function Thumb({ path, near }) {
  // Só resolve a URL das miniaturas próximas: álbuns grandes não disparam centenas de pedidos
  const url = usePreviewUrl(near ? path : null)
  return url ? <img src={url} alt="" loading="lazy" draggable={false} /> : <span className="lightbox__thumb-ph" />
}

function Preload({ path }) {
  const url = usePreviewUrl(path ?? null)
  useEffect(() => {
    if (url) new Image().src = url
  }, [url])
  return null
}
