import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, Logo, ease } from './shared.jsx'

const links = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#para-quem', label: 'Para quem' },
  { href: '#planos', label: 'Planos' },
  { href: '#duvidas', label: 'Dúvidas' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease }}
    >
      <div className="container nav__inner">
        <a href="#topo" className="brand">
          <Logo />
          <span>Fotly</span>
        </a>

        <nav className="nav__links" aria-label="Principal">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav__link">
              {l.label}
            </a>
          ))}
          <a href="/entrar" className="btn btn--light btn--sm">
            Criar minha página
          </a>
        </nav>

        <button
          type="button"
          className="nav__toggle"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="nav__mobile"
            aria-label="Menu móvel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="container nav__mobile-inner">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
              <a href="/entrar" className="btn btn--accent" onClick={() => setOpen(false)}>
                Criar minha página
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
