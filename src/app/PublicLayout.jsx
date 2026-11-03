import { BrandLink } from './ui.jsx'

/** Moldura das páginas que o comprador vê. */
export default function PublicLayout({ children }) {
  return (
    <div className="public">
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
