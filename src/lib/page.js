// Personalização da página de venda do fotógrafo (photographers/{uid}.page).
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from './firebase.js'

export const THEMES = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
]

export const ACCENTS = ['#ff6a3d', '#e8b04b', '#4f9d69', '#3d7eff', '#8b5cf6', '#e0457b', '#111110']

export const FONTS = [
  { value: 'moderna', label: 'Moderna', sample: 'Aa', display: "'Bricolage Grotesque', system-ui, sans-serif" },
  { value: 'classica', label: 'Clássica', sample: 'Aa', display: "Georgia, 'Times New Roman', serif" },
  { value: 'minimal', label: 'Minimal', sample: 'Aa', display: "'Inter Tight', system-ui, sans-serif" },
]

export const GRIDS = [
  { value: 'sm', label: 'Pequenas', min: 150 },
  { value: 'md', label: 'Médias', min: 220 },
  { value: 'lg', label: 'Grandes', min: 320 },
]

export const LIMITS = { headline: 120, bio: 400, buyLabel: 30, albumNote: 280, whatsapp: 20, instagram: 30, email: 120 }

export const DEFAULT_PAGE = {
  theme: 'dark',
  accent: '#ff6a3d',
  font: 'moderna',
  grid: 'md',
  headline: '',
  avatarPath: '',
  coverPath: '',
  showPrices: true,
  whatsapp: '',
  instagram: '',
  email: '',
  buyLabel: 'Comprar com Pix',
  albumNote: '',
}

const HEX = /^#[0-9a-f]{6}$/i
const oneOf = (v, list, fallback) => (list.some((o) => (o.value ?? o) === v) ? v : fallback)
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Junta o que está salvo com os padrões e descarta valores inválidos. */
export function normalizePage(raw = {}) {
  const p = { ...DEFAULT_PAGE, ...(raw ?? {}) }
  return {
    theme: oneOf(p.theme, THEMES, DEFAULT_PAGE.theme),
    accent: HEX.test(p.accent) ? p.accent.toLowerCase() : DEFAULT_PAGE.accent,
    font: oneOf(p.font, FONTS, DEFAULT_PAGE.font),
    grid: oneOf(p.grid, GRIDS, DEFAULT_PAGE.grid),
    headline: str(p.headline, LIMITS.headline),
    avatarPath: str(p.avatarPath, 200),
    coverPath: str(p.coverPath, 200),
    showPrices: p.showPrices !== false,
    whatsapp: str(p.whatsapp, LIMITS.whatsapp).replace(/\D/g, ''),
    instagram: str(p.instagram, LIMITS.instagram).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
    email: str(p.email, LIMITS.email),
    buyLabel: str(p.buyLabel, LIMITS.buyLabel) || DEFAULT_PAGE.buyLabel,
    albumNote: str(p.albumNote, LIMITS.albumNote),
  }
}

/** Salva a personalização e a bio no perfil. */
export async function savePage({ page, bio }) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Faça login primeiro.')
  await updateDoc(doc(db, 'photographers', uid), {
    page: normalizePage(page),
    bio: str(bio, LIMITS.bio),
    updatedAt: serverTimestamp(),
  })
}

/** Variáveis CSS que pintam as páginas públicas com o tema escolhido. */
export function themeVars(rawPage) {
  const p = normalizePage(rawPage)
  const light = p.theme === 'light'
  const font = FONTS.find((f) => f.value === p.font)
  return {
    '--ink': light ? '#f7f5f0' : '#111110',
    '--surface': light ? '#ffffff' : '#1b1a18',
    '--line': light ? '#e4e0d6' : '#2a2926',
    '--line-strong': light ? '#cfcabd' : '#3a3934',
    '--paper': light ? '#171614' : '#f2f0ea',
    '--text': light ? '#171614' : '#f2f0ea',
    '--text-soft': light ? '#3d3a34' : '#c9c5bb',
    '--text-muted': light ? '#6b675e' : '#a8a49b',
    '--accent': p.accent,
    '--accent-hover': `color-mix(in srgb, ${p.accent} 82%, ${light ? '#000' : '#fff'})`,
    '--on-accent': isLight(p.accent) ? '#111110' : '#ffffff',
    '--font-display': font.display,
    '--grid-min': `${GRIDS.find((g) => g.value === p.grid).min}px`,
  }
}

function isLight(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4
}

/** Links de contato montados só a partir de valores limpos (nunca uma URL digitada). */
export function contactLinks(rawPage) {
  const p = normalizePage(rawPage)
  const links = []
  if (p.whatsapp.length >= 10) {
    const number = p.whatsapp.length <= 11 ? `55${p.whatsapp}` : p.whatsapp
    links.push({ kind: 'whatsapp', label: 'WhatsApp', icon: 'chat', href: `https://wa.me/${number}` })
  }
  if (p.instagram) links.push({ kind: 'instagram', label: `@${p.instagram}`, icon: 'camera', href: `https://instagram.com/${p.instagram}` })
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) links.push({ kind: 'email', label: 'E-mail', icon: 'link', href: `mailto:${p.email}` })
  return links
}

/**
 * Sobe a foto de perfil ou a capa (redimensionada, sem marca d'água) para branding/{uid}/.
 * @param {'avatar'|'cover'} kind
 * @returns {Promise<string>} caminho no Storage
 */
export async function uploadBrandingImage(file, kind) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Faça login primeiro.')
  if (!file.type.startsWith('image/')) throw new Error('Escolha uma imagem (JPG, PNG ou WEBP).')
  const blob = await resizeImage(file, kind === 'avatar' ? 512 : 2000)
  const path = `branding/${uid}/${kind}-${Date.now()}.jpg`
  await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg' })
  return path
}

/** Apaga uma imagem antiga de branding. Falhar aqui não atrapalha o fluxo. */
export async function removeBrandingImage(path) {
  const uid = auth.currentUser?.uid
  if (!path || !uid || !path.startsWith(`branding/${uid}/`)) return
  await deleteObject(ref(storage, path)).catch(() => {})
}

async function resizeImage(file, maxSize, quality = 0.86) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error('Não foi possível ler essa imagem. Use JPG, PNG ou WEBP.')
  })
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Não foi possível processar a imagem.')
  return blob
}
