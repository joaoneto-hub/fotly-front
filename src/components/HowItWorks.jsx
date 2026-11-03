import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { SectionHead, staggerChild, staggerParent } from './shared.jsx'

const steps = [
  {
    n: '01',
    title: 'Conecte seu Google Drive',
    text: (
      <>
        Entre com sua conta Google. A Fotly cria a pasta <strong>Fotly</strong> no seu Drive, e é lá que seus originais
        vão morar.
      </>
    ),
  },
  {
    n: '02',
    title: 'Suba fotos e vídeos',
    text: "Crie um álbum, arraste os arquivos e defina os preços. As prévias com marca d'água são geradas sozinhas.",
  },
  {
    n: '03',
    title: 'Compartilhe e venda',
    text: 'Envie o link do álbum. O cliente escolhe, paga com Pix ou cartão e recebe o original na hora, por um link seguro.',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="como-funciona" className="container section" ref={ref}>
      <SectionHead eyebrow="Como funciona" title="Do cartão de memória à venda em três passos." />

      <div className="steps-wrap">
        <motion.div className="steps__line" style={{ scaleX: lineScale }} aria-hidden="true" />
        <motion.ol
          className="steps"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {steps.map((s) => (
            <motion.li key={s.n} className="card step" variants={staggerChild} whileHover={{ y: -6 }}>
              <span className="step__n">{s.n}</span>
              <h3 className="h3">{s.title}</h3>
              <p className="muted">{s.text}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
