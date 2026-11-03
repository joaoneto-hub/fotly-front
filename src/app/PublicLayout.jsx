import { normalizePage, themeVars } from '../lib/page.js'
import { BrandLink } from './ui.jsx'
import './public-theme.css'

/**
 * Moldura das páginas que o comprador vê.
 * `page` é a personalização do fotógrafo (tema, cor, fonte); sem ela, usa o visual padrão da Fotly.
 */
export default function PublicLayout({ children, page, className = '' }) {
  const theme = normalizePage(page).theme
  return (
    <div className={`public public--${theme} ${className}`} style={themeVars(page)}>
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
