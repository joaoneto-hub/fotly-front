// Dados do painel: pedidos, métricas e resumo dos álbuns (lado do fotógrafo).
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { auth, db } from './firebase.js'

const DAY = 24 * 60 * 60 * 1000

/** Pedidos do fotógrafo logado, mais recentes primeiro. */
export async function myOrders(max = 500) {
  const uid = auth.currentUser?.uid
  const q = query(collection(db, 'orders'), where('ownerId', '==', uid), orderBy('createdAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const o = d.data()
    return { id: d.id, ...o, createdAt: toMillis(o.createdAt), paidAt: toMillis(o.paidAt) }
  })
}

/** Para cada álbum: quantidade de itens e a primeira prévia (capa). */
export async function albumSummaries(albums) {
  return Promise.all(
    albums.map(async (a) => {
      const media = collection(db, 'albums', a.id, 'media')
      const [count, first] = await Promise.all([
        getCountFromServer(media).then((s) => s.data().count).catch(() => 0),
        getDocs(query(media, orderBy('createdAt', 'asc'), limit(1))).catch(() => null),
      ])
      return { ...a, mediaCount: count, coverPath: first?.docs[0]?.data().previewPath ?? null }
    })
  )
}

export const toMillis = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : null)

const paidAtOf = (o) => o.paidAt ?? o.createdAt

/**
 * Métricas de um período de `days` dias terminando hoje, comparadas ao período anterior.
 * Valores em centavos.
 */
export function computeKpis(orders, days, now = Date.now()) {
  const start = startOfDay(now) - (days - 1) * DAY
  const prevStart = start - days * DAY

  const inRange = (o, a, b) => {
    const t = o.status === 'paid' ? paidAtOf(o) : o.createdAt
    return t != null && t >= a && t < b
  }
  const cur = orders.filter((o) => inRange(o, start, now + 1))
  const prev = orders.filter((o) => inRange(o, prevStart, start))

  const sum = (list) => {
    const paid = list.filter((o) => o.status === 'paid')
    const revenue = paid.reduce((s, o) => s + (o.total ?? 0), 0)
    const items = paid.reduce((s, o) => s + (o.items?.length ?? 0), 0)
    const created = list.filter((o) => o.status !== 'failed').length
    return {
      revenue,
      sales: paid.length,
      items,
      avgTicket: paid.length ? Math.round(revenue / paid.length) : 0,
      conversion: created ? paid.length / created : null,
    }
  }

  const a = sum(cur)
  const b = sum(prev)
  return {
    current: a,
    previous: b,
    delta: {
      revenue: pct(a.revenue, b.revenue),
      sales: pct(a.sales, b.sales),
      avgTicket: pct(a.avgTicket, b.avgTicket),
      conversion: a.conversion != null && b.conversion != null ? a.conversion - b.conversion : null,
    },
    series: dailySeries(orders, start, days),
    prevSeries: dailySeries(orders, prevStart, days),
    pending: pendingSum(orders),
  }
}

/** Pix gerados e ainda não pagos (todos, não só do período). */
function pendingSum(orders) {
  const list = orders.filter((o) => o.status === 'pending')
  return { count: list.length, total: list.reduce((s, o) => s + (o.total ?? 0), 0) }
}

/** Álbuns que mais faturaram no período (receita paga), do maior para o menor. */
export function topAlbums(orders, days, now = Date.now()) {
  const start = startOfDay(now) - (days - 1) * DAY
  const map = {}
  for (const o of orders) {
    if (o.status !== 'paid') continue
    const t = paidAtOf(o)
    if (t == null || t < start) continue
    const m = (map[o.albumId] ??= { albumId: o.albumId, revenue: 0, sales: 0, items: 0 })
    m.revenue += o.total ?? 0
    m.sales += 1
    m.items += o.items?.length ?? 0
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue)
}

/** Receita e vendas pagas por dia, do dia `start` em diante. */
export function dailySeries(orders, start, days) {
  const buckets = Array.from({ length: days }, (_, i) => ({ date: start + i * DAY, revenue: 0, sales: 0 }))
  for (const o of orders) {
    if (o.status !== 'paid') continue
    const t = paidAtOf(o)
    if (t == null) continue
    const i = Math.floor((startOfDay(t) - start) / DAY)
    if (i >= 0 && i < days) {
      buckets[i].revenue += o.total ?? 0
      buckets[i].sales += 1
    }
  }
  return buckets
}

/** Receita paga e vendas agrupadas por álbum. */
export function salesByAlbum(orders) {
  const map = {}
  for (const o of orders) {
    if (o.status !== 'paid') continue
    const m = (map[o.albumId] ??= { revenue: 0, sales: 0 })
    m.revenue += o.total ?? 0
    m.sales += 1
  }
  return map
}

function pct(a, b) {
  if (!b) return a ? null : 0 // sem base de comparação
  return (a - b) / b
}

function startOfDay(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12 de out." */
export function timeAgo(t, now = Date.now()) {
  if (t == null) return '—'
  const s = Math.max(0, (now - t) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  if (s < 2 * 86400) return 'ontem'
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} dias`
  return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export const ORDER_STATUS = {
  paid: { label: 'Pago', tone: 'good' },
  pending: { label: 'Aguardando Pix', tone: 'warn' },
  review: { label: 'Em análise', tone: 'warn' },
  expired: { label: 'Expirado', tone: 'muted' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
  failed: { label: 'Falhou', tone: 'bad' },
  refunded: { label: 'Estornado', tone: 'bad' },
}
