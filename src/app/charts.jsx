import { useMemo, useRef, useState } from 'react'
import { brl } from '../lib/checkout.js'

// Cor da série: laranja da marca, um passo mais escuro para passar na faixa de luminosidade no fundo escuro
const SERIES = '#f0602f'

const W = 720
const H = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

/** Gráfico de área com a receita diária. Passe o mouse para ver o valor do dia. */
export function RevenueChart({ series }) {
  const svg = useRef(null)
  const [hover, setHover] = useState(null)

  const { points, ticks, max } = useMemo(() => {
    const maxVal = Math.max(...series.map((d) => d.revenue), 0)
    const top = niceMax(maxVal)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = series.length > 1 ? innerW / (series.length - 1) : 0
    const pts = series.map((d, i) => ({
      ...d,
      x: PAD.left + i * step,
      y: PAD.top + innerH - (top ? (d.revenue / top) * innerH : 0),
    }))
    return { points: pts, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * top), max: top }
  }, [series])

  const baseY = H - PAD.bottom
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  const area = points.length ? `${line}L${points.at(-1).x},${baseY}L${points[0].x},${baseY}Z` : ''
  const labelEvery = Math.ceil(series.length / 6)
  const empty = series.every((d) => d.revenue === 0)

  function onMove(e) {
    const rect = svg.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i
    }
    setHover(best)
  }

  const h = hover != null ? points[hover] : null

  return (
    <div className="chart">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label="Receita por dia no período"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity="0.22" />
            <stop offset="100%" stopColor={SERIES} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - (max ? t / max : 0))
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="chart__grid" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="chart__tick">
                {axisMoney(t)}
              </text>
            </g>
          )
        })}

        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.date} x={p.x} y={H - 8} textAnchor="middle" className="chart__tick">
              {shortDate(p.date)}
            </text>
          ) : null
        )}

        {!empty && <path d={area} fill="url(#rev-fill)" />}
        <path d={line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={empty ? 0.35 : 1} />

        {h && (
          <g pointerEvents="none">
            <line x1={h.x} x2={h.x} y1={PAD.top} y2={baseY} className="chart__cross" />
            <circle cx={h.x} cy={h.y} r="5" fill={SERIES} stroke="var(--app-card)" strokeWidth="2" />
          </g>
        )}
        {/* área de captura do mouse */}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={baseY - PAD.top} fill="transparent" />
      </svg>

      {h && (
        <div className="chart__tip" style={{ left: `${(h.x / W) * 100}%`, top: `${(h.y / H) * 100}%` }}>
          <span className="chart__tip-date">{longDate(h.date)}</span>
          <strong>{brl(h.revenue)}</strong>
          <span className="chart__tip-sub">
            {h.sales} {h.sales === 1 ? 'venda' : 'vendas'}
          </span>
        </div>
      )}

      {empty && <p className="chart__empty">Nenhuma venda paga neste período</p>}

      <table className="sr-only">
        <caption>Receita por dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Receita</th>
            <th>Vendas</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <td>{longDate(d.date)}</td>
              <td>{brl(d.revenue)}</td>
              <td>{d.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mini gráfico de linha para os cartões de métrica. */
export function Sparkline({ values, width = 96, height = 32 }) {
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <svg width={width} height={height} aria-hidden="true"><line x1="0" x2={width} y1={height - 2} y2={height - 2} className="spark__flat" /></svg>
  }
  const max = Math.max(...values)
  const step = width / (values.length - 1)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`).join('')
  return (
    <svg width={width} height={height} aria-hidden="true" className="spark">
      <path d={d} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function niceMax(v) {
  if (v <= 0) return 10000 // R$ 100 como escala mínima
  const raw = v * 1.15
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * mag
}

function axisMoney(cents) {
  const v = cents / 100
  if (v >= 10000) return `R$ ${Math.round(v / 1000)} mil`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

const shortDate = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const longDate = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
