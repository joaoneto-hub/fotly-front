const items = [
  { label: 'Casamento', color: '#4A3F35' },
  { label: 'Corrida de rua', color: '#2F3A45' },
  { label: 'Ensaio gestante', color: '#6E5A4B' },
  { label: 'Formatura', color: '#3D3A33' },
  { label: 'Show', color: '#5C6B66' },
  { label: 'Newborn', color: '#7A7166' },
  { label: 'Corporativo', color: '#45556A' },
  { label: 'Aniversário', color: '#5A4A3E' },
  { label: 'Futebol', color: '#3A4A3F' },
  { label: 'Batizado', color: '#6B6157' },
]

export default function Marquee() {
  // A lista é duplicada para o loop ficar contínuo
  const loop = [...items, ...items]
  return (
    <section className="marquee" aria-label="Tipos de trabalho que você pode vender">
      <div className="marquee__track">
        {loop.map((it, i) => (
          <div key={i} className="marquee__item" style={{ background: it.color }} aria-hidden={i >= items.length}>
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
