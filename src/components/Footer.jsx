export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__brand">Fotly</span>
        <nav aria-label="Rodapé" className="footer__links">
          <a href="#">Termos de uso</a>
          <a href="#">Privacidade</a>
          <a href="#">Contato</a>
        </nav>
        <span>© {new Date().getFullYear()} Fotly</span>
      </div>
    </footer>
  )
}
