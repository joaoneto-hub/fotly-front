// Compra (lado do comprador).
import { getDownloadURL, ref } from 'firebase/storage'
import { call, storage } from './firebase.js'

/** URL pública da prévia com marca d'água. */
export const previewUrl = (previewPath) => getDownloadURL(ref(storage, previewPath))

/**
 * Cria o pedido e o Pix.
 * Retorna { orderId, token, total, pix: { qrCode, qrCodeBase64, ticketUrl } }
 * Guarde orderId e token (ex.: na URL da página do pedido): eles dão acesso aos downloads.
 */
export async function startCheckout({ albumId, mediaIds, buyerEmail }) {
  const { data } = await call('createCheckout')({ albumId, mediaIds, buyerEmail })
  return data
}

export async function getOrder(orderId, token) {
  const { data } = await call('orderStatus')({ orderId, token })
  return data // { status, total, items: [{ mediaId, name, price, downloadUrl? }], expiresAt? }
}

const FINAL = ['paid', 'expired', 'cancelled', 'refunded', 'failed', 'review']

/**
 * Consulta o pedido a cada poucos segundos até o Pix ser pago (ou cancelado).
 * Retorna uma função para parar.
 */
export function watchOrder(orderId, token, onUpdate, intervalMs = 4000) {
  let stopped = false
  let timer
  const tick = async () => {
    if (stopped) return
    try {
      const order = await getOrder(orderId, token)
      onUpdate(order)
      if (FINAL.includes(order.status)) return
    } catch (e) {
      console.error(e)
    }
    timer = setTimeout(tick, intervalMs)
  }
  tick()
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}

/** Formata centavos em reais: 1500 -> "R$ 15,00" */
export const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
