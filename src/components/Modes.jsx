import { motion } from 'framer-motion'
import { Icon, SectionHead, staggerChild, staggerParent } from './shared.jsx'

const eventTiles = ['#3E4C5A', '#4B5B6A', '#3A4754', '#556677', '#45556A', '#39475A', '#4F6073', '#3F4E5E']

function EventVisual() {
  return (
    <div className="mode__visual mode__visual--event">
      <div className="mini-grid">
        {eventTiles.map((c, i) => (
          <span key={i} className="mini-grid__tile" style={{ background: c, transitionDelay: `${i * 30}ms` }} />
        ))}
      </div>
      <span className="chip chip--search">
        <Icon name="search" size={15} stroke={2} />
        Nº de peito 1284
      </span>
    </div>
  )
}

function PrivateVisual() {
  return (
    <div className="mode__visual mode__visual--private">
      <span className="chip chip--lock">
        <Icon name="lock" size={15} stroke={2} />
        Galeria privada
      </span>
      <span className="pass" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
    </div>
  )
}

function StockVisual() {
  return (
    <div className="mode__visual mode__visual--stock">
      <span className="stock-card" />
      <span className="stock-card stock-card--center">
        <span className="play">
          <Icon name="play" size={22} stroke={2} />
        </span>
      </span>
      <span className="stock-card" />
    </div>
  )
}

const modes = [
  {
    title: 'Eventos e esportes',
    text: 'Álbum público para corridas, shows e formaturas. Qualquer pessoa encontra suas fotos e compra avulsas ou em pacote.',
    Visual: EventVisual,
  },
  {
    title: 'Casamentos e ensaios',
    text: 'Galeria com senha para o seu cliente. Ele seleciona as favoritas, recebe as do pacote e compra as extras.',
    Visual: PrivateVisual,
  },
  {
    title: 'Banco de imagens e vídeos',
    text: 'Venda fotos, vídeos e presets como numa loja. Para quem quer renda com o acervo que já tem.',
    Visual: StockVisual,
  },
]

export default function Modes() {
  return (
    <section id="para-quem" className="container section">
      <SectionHead
        eyebrow="Para todo tipo de fotógrafo"
        title="Uma conta, três jeitos de vender."
        lead="Cada álbum escolhe o seu modo. Casamento no sábado, corrida no domingo: tudo na mesma conta."
      />
      <motion.div
        className="modes"
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        {modes.map(({ title, text, Visual }) => (
          <motion.article key={title} className="mode" variants={staggerChild} whileHover={{ y: -6 }}>
            <Visual />
            <div className="mode__body">
              <h3 className="h3">{title}</h3>
              <p className="muted">{text}</p>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  )
}
