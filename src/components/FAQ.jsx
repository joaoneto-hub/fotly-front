import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon, Reveal, ease } from './shared.jsx'

const faqs = [
  {
    q: 'Preciso pagar pelo armazenamento?',
    a: 'Não. Os originais ficam no seu Google Drive. Você usa o espaço que já tem, ou amplia direto com o Google se precisar.',
  },
  {
    q: 'A Fotly consegue ver todo o meu Drive?',
    a: 'Não. A Fotly só acessa os arquivos que você envia por ela ou escolhe importar. O resto do seu Drive continua privado.',
  },
  {
    q: 'Como o cliente recebe a foto?',
    a: "Assim que o pagamento é confirmado, ele recebe um link de download seguro, que expira depois de um tempo. Antes disso, só vê a prévia com marca d'água.",
  },
  {
    q: 'Quando recebo o dinheiro das vendas?',
    a: '[PRAZO DE REPASSE]. O valor de cada venda vai direto para a sua conta, já descontada a taxa do plano.',
  },
]

function Item({ q, a, open, onToggle }) {
  const id = useId()
  return (
    <div className="faq__item">
      <h3 className="faq__q">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          {q}
          <motion.span className="faq__icon" animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }}>
            <Icon name="plus" size={20} stroke={2} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="faq__a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="duvidas" className="container container--narrow section">
      <Reveal>
        <h2 className="h2">Dúvidas frequentes</h2>
      </Reveal>
      <Reveal className="faq" delay={0.1}>
        {faqs.map((f, i) => (
          <Item key={f.q} {...f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </Reveal>
    </section>
  )
}
