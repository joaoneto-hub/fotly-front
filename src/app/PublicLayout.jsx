import { useEffect } from 'react'
import { isLightTheme, loadFont, normalizePage, themeVars } from '../lib/page.js'
import { BrandLink } from './ui.jsx'
import './public-theme.css'

/** Classes e variáveis que aplicam o tema do fotógrafo (também usadas na prévia do editor). */
export function themeProps(page) {
  const p = normalizePage(page)
  return {
    className: `public public--${p.theme} ${isLightTheme(page) ? 'public--is-light' : ''}`,
    style: themeVars(page),
  }
}

/**
 * Moldura das páginas que o comprador vê.
 * `page` é a personalização do fotógrafo (tema, cor, fonte); sem ela, usa o visual padrão da Fotly.
 */
export default function PublicLayout({ children, page, className = '' }) {
  const font = normalizePage(page).font
  useEffect(() => loadFont(font), [font])

  const theme = themeProps(page)
  return (
    <div className={`${theme.className} ${className}`} style={theme.style}>
      <main>{children}</main>
      <footer className="public__foot">
        <div className="container public__foot-inner">
          <span>Página criada com</span>
          <BrandLink />
        </div>
      </footer>
    </div>
  )
}
