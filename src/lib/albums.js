// Álbuns e upload de mídia (lado do fotógrafo).
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from './firebase.js'
import { createAlbumFolder, uploadToDrive } from './drive.js'
import { makePreview } from './preview.js'

/**
 * Cria um álbum e a pasta dele no Drive.
 * @param {{ title: string, mode: 'public'|'private'|'store', defaultPrice: number }} p
 *        defaultPrice em centavos (R$ 15,00 = 1500)
 */
export async function createAlbum({ title, mode = 'public', defaultPrice = 0 }) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Faça login primeiro.')
  const driveFolderId = await createAlbumFolder(title)
  const docRef = await addDoc(collection(db, 'albums'), {
    ownerId: uid,
    title: title.trim().slice(0, 120),
    mode,
    status: 'draft',
    defaultPrice: Math.round(defaultPrice),
    driveFolderId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function publishAlbum(albumId, published = true) {
  await updateDoc(doc(db, 'albums', albumId), {
    status: published ? 'published' : 'draft',
    updatedAt: serverTimestamp(),
  })
}

/** Álbuns do fotógrafo logado (inclui rascunhos). */
export async function myAlbums() {
  const uid = auth.currentUser?.uid
  const q = query(collection(db, 'albums'), where('ownerId', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Álbuns publicados de um fotógrafo (página pública). */
export async function publicAlbums(ownerId) {
  const q = query(
    collection(db, 'albums'),
    where('ownerId', '==', ownerId),
    where('status', '==', 'published'),
    // As regras do Firestore só liberam álbuns não privados; a consulta precisa dizer isso
    where('mode', 'in', ['public', 'store']),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Escuta um álbum em tempo real. Retorna a função para parar. */
export function watchAlbum(albumId, onChange, onError) {
  return onSnapshot(
    doc(db, 'albums', albumId),
    (s) => onChange(s.exists() ? { id: s.id, ...s.data() } : null),
    onError
  )
}

/** Escuta os itens de um álbum em tempo real. */
export function watchMedia(albumId, onChange, onError) {
  return onSnapshot(
    query(collection(db, 'albums', albumId, 'media'), orderBy('createdAt', 'asc')),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

export async function getAlbum(albumId) {
  const s = await getDoc(doc(db, 'albums', albumId))
  return s.exists() ? { id: s.id, ...s.data() } : null
}

/** Atualiza campos editáveis do álbum (título, preço padrão, modo). */
export async function updateAlbum(albumId, fields) {
  await updateDoc(doc(db, 'albums', albumId), { ...fields, updatedAt: serverTimestamp() })
}

/**
 * Envia um arquivo: original para o Drive, prévia com marca d'água para o Storage,
 * e registra o item no Firestore.
 * @param {{ album: { id: string, driveFolderId: string, defaultPrice: number }, file: File, price?: number, onProgress?: (p:number)=>void }} p
 */
export async function uploadMedia({ album, file, price, onProgress }) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Faça login primeiro.')

  const mediaRef = doc(collection(db, 'albums', album.id, 'media'))

  // A prévia vem primeiro: se o formato não for suportado, falha antes de subir o arquivo grande
  const preview = await makePreview(file)
  onProgress?.(0.05)

  const driveFile = await uploadToDrive(file, album.driveFolderId, (p) => onProgress?.(0.05 + p * 0.85))

  const previewPath = `previews/${uid}/${album.id}/${mediaRef.id}.jpg`
  await uploadBytes(ref(storage, previewPath), preview.blob, { contentType: 'image/jpeg' })

  await setDoc(mediaRef, {
    ownerId: uid,
    driveFileId: driveFile.id,
    name: file.name,
    mimeType: driveFile.mimeType ?? file.type,
    size: Number(driveFile.size ?? file.size),
    kind: file.type.startsWith('video/') ? 'video' : 'photo',
    price: Math.round(price ?? album.defaultPrice ?? 0),
    previewPath,
    width: preview.width,
    height: preview.height,
    createdAt: serverTimestamp(),
  })

  onProgress?.(1)
  return mediaRef.id
}

/** Lista os itens de um álbum (para a galeria). */
export async function albumMedia(albumId) {
  const snap = await getDocs(query(collection(db, 'albums', albumId, 'media'), orderBy('createdAt', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
