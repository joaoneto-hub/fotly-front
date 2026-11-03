import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase.js'

// Endereços que não podem virar página de fotógrafo (são rotas do app)
export const RESERVED_SLUGS = [
  'entrar', 'painel', 'pedido', 'api', 'admin', 'login', 'app', 'fotly',
  'ajuda', 'suporte', 'termos', 'privacidade', 'planos', 'contato', 'blog',
]

/** Busca o fotógrafo pelo endereço público (fotly.com.br/{slug}). */
export async function photographerBySlug(slug) {
  const s = await getDoc(doc(db, 'slugs', slug.toLowerCase()))
  if (!s.exists()) return null
  const p = await getDoc(doc(db, 'photographers', s.data().uid))
  return p.exists() ? { id: p.id, ...p.data() } : null
}
