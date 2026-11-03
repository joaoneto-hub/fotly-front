import { motion } from 'framer-motion'
import { Icon, staggerChild, staggerParent } from './shared.jsx'

const items = [
  { icon: 'box', title: 'Sem custo de armazenamento', text: 'Os originais ficam no seu Drive.' },
  { icon: 'lock', title: 'Original protegido', text: "Prévia com marca d'água, entrega após o pagamento." },
  { icon: 'money', title: 'Pix e cartão', text: 'O dinheiro cai direto na sua conta.' },
  { icon: 'link', title: 'Sua página, seu link', text: 'Compartilhe no Instagram e no WhatsApp.' },
]

export default function ValueStrip() {
  return (
    <section className="strip">
      <motion.div
        className="container strip__grid"
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {items.map((it) => (
          <motion.div key={it.title} className="strip__item" variants={staggerChild}>
            <span className="strip__icon">
              <Icon name={it.icon} size={24} />
            </span>
            <div>
              <p className="strip__title">{it.title}</p>
              <p className="strip__text">{it.text}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
