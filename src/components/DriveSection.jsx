import { motion } from 'framer-motion'
import { CountUp, Icon, Reveal, ease } from './shared.jsx'

const folders = [
  { name: 'Casamento Ana & Pedro', count: 248 },
  { name: 'Corrida de Rua', count: 1204 },
  { name: 'Ensaio Gestante — Júlia', count: 86 },
]

export default function DriveSection() {
  return (
    <section className="container section">
      <Reveal className="drive">
        <div className="drive__copy">
          <h2 className="h2">Seu acervo não fica preso aqui.</h2>
          <p className="drive__text">
            Outras plataformas guardam seus arquivos e cobram pelo espaço. Na Fotly, os originais ficam no seu Google
            Drive, numa pasta que você controla. Se um dia sair, eles continuam lá.
          </p>
        </div>

        <div className="finder">
          <p className="finder__path">Meu Drive › Fotly</p>
          <ul className="finder__list">
            {folders.map((f, i) => (
              <motion.li
                key={f.name}
                className="finder__row"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.25 + i * 0.15, ease }}
              >
                <Icon name="folder" size={20} />
                <span>{f.name}</span>
                <span className="finder__count">
                  <CountUp to={f.count} /> itens
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}
