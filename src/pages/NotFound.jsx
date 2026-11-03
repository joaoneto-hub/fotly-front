import { Link } from 'react-router-dom'
import { Page } from '../app/ui.jsx'

export default function NotFound() {
  return (
    <div className="full-center">
      <Page className="panel panel--narrow not-found">
        <p className="not-found__code">404</p>
        <h1 className="h3">Página não encontrada</h1>
        <p className="muted">O endereço pode estar errado ou o álbum não está mais publicado.</p>
        <Link to="/" className="btn btn--ghost">
          Ir para o início
        </Link>
      </Page>
    </div>
  )
}
