import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from './firebase.js'

/** Login do fotógrafo com a conta Google. */
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
  return user
}

export const logout = () => signOut(auth)

export async function getProfile(uid = auth.currentUser?.uid) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'photographers', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Normaliza o endereço: "Studio Ana Lima" -> "studio-ana-lima" */
export function toSlug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

/**
 * Cria o perfil do fotógrafo e reserva o endereço (fotly.com.br/{slug}).
 * As regras do Firestore garantem que o slug é único.
 */
export async function createProfile({ displayName, slug }) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Faça login primeiro.')
  const clean = toSlug(slug)
  if (clean.length < 3) throw new Error('O endereço precisa ter pelo menos 3 caracteres.')

  const batch = writeBatch(db)
  batch.set(doc(db, 'slugs', clean), { uid })
  batch.set(doc(db, 'photographers', uid), {
    displayName: displayName.trim().slice(0, 80),
    slug: clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  try {
    await batch.commit()
  } catch (e) {
    if (e.code === 'permission-denied') throw new Error('Esse endereço já está em uso. Escolha outro.')
    throw e
  }
  return clean
}
