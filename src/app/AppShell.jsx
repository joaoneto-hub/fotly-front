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
 * bare esconde o menu (primeiro acesso, antes de existir perfil).
 */
export default function AppShell({ children, title, crumbs, actions, bare = false }) {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="Menu principal">
        <SidebarContent bare={bare} />
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
              <SidebarContent bare={bare} />
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

const MENU = [
  { to: '/painel', label: 'Visão geral', icon: 'grid', match: (p) => p === '/painel' },
  { to: '/painel/albuns', label: 'Álbuns', icon: 'albums', match: (p) => p.startsWith('/painel/albuns') || p.startsWith('/painel/album/') },
  { to: '/painel/vendas', label: 'Vendas', icon: 'receipt', match: (p) => p.startsWith('/painel/vendas') },
  { to: '/painel/pagina', label: 'Minha página', icon: 'palette', match: (p) => p.startsWith('/painel/pagina') },
  { to: '/painel/configuracoes', label: 'Configurações', icon: 'settings', match: (p) => p.startsWith('/painel/configuracoes') },
]

function SidebarContent({ bare }) {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  return (
    <>
      <div className="app-sidebar__brand">
        <BrandLink to="/painel" />
      </div>

      {!bare && (
        <nav className="app-nav">
          <p className="app-nav__label">Menu</p>
          {MENU.map((i) => {
            const active = i.match(pathname)
            return (
              <Link key={i.to} to={i.to} className={`app-nav__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                <Icon name={i.icon} size={18} />
                {i.label}
              </Link>
            )
          })}
          {profile?.slug && (
            <a href={`/${profile.slug}`} target="_blank" rel="noreferrer" className="app-nav__item">
              <Icon name="globe" size={18} />
              Abrir minha página
              <Icon name="external" size={14} className="app-nav__ext" />
            </a>
          )}
        </nav>
      )}

      {profile && (
        <div className="app-sidebar__foot">
          <Link to="/painel/configuracoes" className={`drive-pill ${profile.driveConnected ? 'is-ok' : ''}`}>
            <span className="drive-pill__dot" />
            <div>
              <p className="drive-pill__title">Google Drive</p>
              <p className="drive-pill__sub">{profile.driveConnected ? 'Conectado · Meu Drive › Fotly' : 'Não conectado'}</p>
            </div>
          </Link>
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
            {profile && (
              <Link role="menuitem" className="user-menu__item" to="/painel/configuracoes" onClick={() => setOpen(false)}>
                <Icon name="settings" size={16} /> Configurações
              </Link>
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
