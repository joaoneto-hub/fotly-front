import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { logout } from '../lib/auth.js'
import { BrandLink } from './ui.jsx'
import { Icon } from '../components/shared.jsx'
import './dashboard.css'

/**
 * Layout do painel: barra lateral + topo.
 * title / actions aparecem no topo; crumbs é uma lista [{ label, to? }].
 */
export default function AppShell({ children, title, crumbs, actions }) {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDrawer(false)
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Espera a seção renderizar (os dados podem estar chegando)
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="Menu principal">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="app-drawer__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="app-sidebar app-sidebar--drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              aria-label="Menu principal"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="icon-btn app-topbar__menu" aria-label="Abrir menu" onClick={() => setDrawer(true)}>
            <Icon name="menu" size={20} />
          </button>
          <div className="app-topbar__title">
            {crumbs?.length > 0 && (
              <nav className="crumbs" aria-label="Você está em">
                {crumbs.map((c, i) => (
                  <span key={i} className="crumbs__item">
                    {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
                    {i < crumbs.length - 1 && <Icon name="chevron" size={14} />}
                  </span>
                ))}
              </nav>
            )}
            {title && <h1 className="app-topbar__h">{title}</h1>}
          </div>
          <div className="app-topbar__actions">
            {actions}
            <UserMenu />
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent() {
  const { profile } = useAuth()
  const { pathname, hash } = useLocation()
  const inAlbum = pathname.startsWith('/painel/album')

  const items = [
    { to: '/painel', label: 'Visão geral', icon: 'grid', active: pathname === '/painel' && !hash },
    { to: '/painel#albuns', label: 'Álbuns', icon: 'albums', active: inAlbum || hash === '#albuns' },
    { to: '/painel#vendas', label: 'Vendas', icon: 'receipt', active: hash === '#vendas' },
  ]

  return (
    <>
      <div className="app-sidebar__brand">
        <BrandLink to="/painel" />
      </div>

      <nav className="app-nav">
        <p className="app-nav__label">Menu</p>
        {items.map((i) => (
          <Link key={i.label} to={i.to} className={`app-nav__item ${i.active ? 'is-active' : ''}`} aria-current={i.active ? 'page' : undefined}>
            <Icon name={i.icon} size={18} />
            {i.label}
          </Link>
        ))}
        {profile?.slug && (
          <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="app-nav__item">
            <Icon name="globe" size={18} />
            Minha página
            <Icon name="external" size={14} className="app-nav__ext" />
          </a>
        )}
      </nav>

      {profile && (
        <div className="app-sidebar__foot">
          <div className={`drive-pill ${profile.driveConnected ? 'is-ok' : ''}`}>
            <span className="drive-pill__dot" />
            <div>
              <p className="drive-pill__title">Google Drive</p>
              <p className="drive-pill__sub">{profile.driveConnected ? 'Conectado · Meu Drive › Fotly' : 'Não conectado'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function UserMenu() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const menu = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => !menu.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const name = profile?.displayName ?? user?.displayName ?? ''
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="user-menu" ref={menu}>
      <button
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar avatar--sm">
          {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : initial}
        </span>
        <span className="user-chip__name">{name.split(' ')[0]}</span>
        <Icon name="down" size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="user-menu__pop"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <p className="user-menu__name">{name}</p>
            <p className="user-menu__email">{user?.email}</p>
            {profile?.slug && (
              <a role="menuitem" className="user-menu__item" href={`/${profile.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" size={16} /> Ver minha página
              </a>
            )}
            <button type="button" role="menuitem" className="user-menu__item" onClick={logout}>
              <Icon name="logout" size={16} /> Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
