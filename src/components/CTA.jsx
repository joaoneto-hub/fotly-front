import { motion } from 'framer-motion'
import { Icon, Reveal } from './shared.jsx'

export default function CTA() {
  return (
    <section id="comecar" className="cta">
      <div className="container cta__inner">
        <Reveal as="h2" className="h1 cta__title">
          Sua próxima sessão já pode virar <span className="accent">venda.</span>
        </Reveal>
        <Reveal as="p" className="lead cta__lead" delay={0.1}>
          Crie sua página em minutos. É só entrar com sua conta Google.
        </Reveal>
        <Reveal delay={0.2}>
          <motion.a
            href="/entrar"
            className="btn btn--accent btn--lg btn--shine"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Icon name="plus" size={20} stroke={2.2} />
            Entrar com Google e começar
          </motion.a>
        </Reveal>
      </div>
    </section>
  )
}
