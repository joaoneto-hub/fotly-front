// Personalização da página de venda do fotógrafo (photographers/{uid}.page).
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from './firebase.js'

// Paletas dos temas. `light` indica fundo claro (muda sombras, placeholders etc.).
const PALETTES = {
  dark: { light: false, ink: '#111110', surface: '#1b1a18', line: '#2a2926', lineStrong: '#3a3934', text: '#f2f0ea', soft: '#c9c5bb', muted: '#a8a49b' },
  black: { light: false, ink: '#050505', surface: '#121212', line: '#1f1f1f', lineStrong: '#2e2e2e', text: '#f5f5f4', soft: '#c7c7c4', muted: '#9a9a96' },
  light: { light: true, ink: '#f7f5f0', surface: '#ffffff', line: '#e4e0d6', lineStrong: '#cfcabd', text: '#171614', soft: '#3d3a34', muted: '#6b675e' },
  cream: { light: true, ink: '#efe9dd', surface: '#f8f4ec', line: '#dcd3c2', lineStrong: '#c6bba6', text: '#221e17', soft: '#4a4336', muted: '#756c5c' },
}

export const THEMES = [
  { value: 'dark', label: 'Escuro', hint: 'Grafite quente' },
  { value: 'black', label: 'Galeria', hint: 'Preto puro, foto em destaque' },
  { value: 'light', label: 'Claro', hint: 'Branco limpo' },
  { value: 'cream', label: 'Papel', hint: 'Creme, ar de revista' },
].map((t) => ({ ...t, palette: PALETTES[t.value] }))

export const ACCENTS = ['#ff6a3d', '#e8b04b', '#b08968', '#4f9d69', '#3d7eff', '#8b5cf6', '#e0457b', '#111110', '#f2f0ea']

// `google` é a família carregada sob demanda do Google Fonts (só quando escolhida).
export const FONTS = [
  { value: 'moderna', label: 'Moderna', display: "'Bricolage Grotesque', system-ui, sans-serif" },
  { value: 'minimal', label: 'Minimal', display: "'Inter Tight', system-ui, sans-serif" },
  { value: 'classica', label: 'Clássica', display: "Georgia, 'Times New Roman', serif" },
  { value: 'editorial', label: 'Editorial', display: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,600;0,700;1,600' },
  { value: 'elegante', label: 'Elegante', display: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:ital,wght@0,500;0,600;1,500' },
  { value: 'geometrica', label: 'Geométrica', display: "'Syne', system-ui, sans-serif", google: 'Syne:wght@600;700;800' },
]

export const GRIDS = [
  { value: 'sm', label: 'Pequenas', min: 150 },
  { value: 'md', label: 'Médias', min: 220 },
  { value: 'lg', label: 'Grandes', min: 320 },
]

export const HERO_LAYOUTS = [
  { value: 'classic', label: 'Clássico', hint: 'Foto de perfil ao lado do nome' },
  { value: 'cover', label: 'Capa cheia', hint: 'Nome sobre a capa, de ponta a ponta' },
  { value: 'centered', label: 'Centralizado', hint: 'Tudo no centro, minimalista' },
]

export const ALBUM_LAYOUTS = [
  { value: 'cards', label: 'Cartões' },
  { value: 'mosaic', label: 'Mosaico' },
  { value: 'list', label: 'Lista' },
]

export const MEDIA_LAYOUTS = [
  { value: 'grid', label: 'Grade', hint: 'Recorte quadrado, tudo alinhado' },
  { value: 'masonry', label: 'Mosaico', hint: 'Respeita o formato de cada foto' },
]

export const CORNERS = [
  { value: 'square', label: 'Retos', radius: 2, card: 4 },
  { value: 'soft', label: 'Suaves', radius: 10, card: 14 },
  { value: 'round', label: 'Redondos', radius: 18, card: 22 },
]

export const SPACINGS = [
  { value: 'tight', label: 'Junto', gap: 4 },
  { value: 'normal', label: 'Normal', gap: 12 },
  { value: 'airy', label: 'Arejado', gap: 24 },
]

export const LIMITS = { headline: 120, bio: 400, buyLabel: 30, albumNote: 280, whatsapp: 20, instagram: 30, email: 120, location: 60, albumsTitle: 40 }

export const DEFAULT_PAGE = {
  theme: 'dark',
  accent: '#ff6a3d',
  font: 'moderna',
  grid: 'md',
  heroLayout: 'classic',
  albumLayout: 'cards',
  mediaLayout: 'grid',
  corners: 'soft',
  spacing: 'normal',
  headline: '',
  location: '',
  albumsTitle: '',
  avatarPath: '',
  coverPath: '',
  showPrices: true,
  whatsapp: '',
  instagram: '',
  email: '',
  buyLabel: 'Comprar com Pix',
  albumNote: '',
}

/** Estilos prontos: aplicam várias opções de uma vez (textos e imagens não mudam). */
export const PRESETS = [
  {
    id: 'editorial',
    label: 'Editorial',
    hint: 'Revista: capa grande e serifa',
    values: { theme: 'cream', accent: '#111110', font: 'editorial', heroLayout: 'cover', albumLayout: 'mosaic', mediaLayout: 'masonry', corners: 'square', spacing: 'airy', grid: 'lg' },
  },
  {
    id: 'galeria',
    label: 'Galeria',
    hint: 'Fundo preto, foto em primeiro plano',
    values: { theme: 'black', accent: '#e8b04b', font: 'minimal', heroLayout: 'centered', albumLayout: 'mosaic', mediaLayout: 'masonry', corners: 'square', spacing: 'tight', grid: 'md' },
  },
  {
    id: 'casamento',
    label: 'Casamento',
    hint: 'Claro, delicado e elegante',
    values: { theme: 'light', accent: '#b08968', font: 'elegante', heroLayout: 'centered', albumLayout: 'cards', mediaLayout: 'masonry', corners: 'soft', spacing: 'normal', grid: 'md' },
  },
  {
    id: 'eventos',
    label: 'Eventos',
    hint: 'Direto ao ponto, muitas fotos',
    values: { theme: 'dark', accent: '#ff6a3d', font: 'moderna', heroLayout: 'classic', albumLayout: 'cards', mediaLayout: 'grid', corners: 'round', spacing: 'normal', grid: 'sm' },
  },
]

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
    heroLayout: oneOf(p.heroLayout, HERO_LAYOUTS, DEFAULT_PAGE.heroLayout),
    albumLayout: oneOf(p.albumLayout, ALBUM_LAYOUTS, DEFAULT_PAGE.albumLayout),
    mediaLayout: oneOf(p.mediaLayout, MEDIA_LAYOUTS, DEFAULT_PAGE.mediaLayout),
    corners: oneOf(p.corners, CORNERS, DEFAULT_PAGE.corners),
    spacing: oneOf(p.spacing, SPACINGS, DEFAULT_PAGE.spacing),
    headline: str(p.headline, LIMITS.headline),
    location: str(p.location, LIMITS.location),
    albumsTitle: str(p.albumsTitle, LIMITS.albumsTitle),
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

/** true para temas de fundo claro (Claro, Papel). */
export const isLightTheme = (rawPage) => PALETTES[normalizePage(rawPage).theme].light

/** Qual estilo pronto bate exatamente com a página (ou null). */
export function matchPreset(rawPage) {
  const p = normalizePage(rawPage)
  return PRESETS.find((pr) => Object.entries(pr.values).every(([k, v]) => p[k] === v))?.id ?? null
}

/** Carrega do Google Fonts a fonte escolhida, uma vez só. */
export function loadFont(value) {
  const font = FONTS.find((f) => f.value === value)
  if (!font?.google || typeof document === 'undefined') return
  const id = `font-${font.value}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
  document.head.appendChild(link)
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
  const c = PALETTES[p.theme]
  const font = FONTS.find((f) => f.value === p.font)
  const corners = CORNERS.find((x) => x.value === p.corners)
  // Acento igual ao fundo some: troca pelo texto
  const accent = contrast(p.accent, c.ink) < 1.4 ? c.text : p.accent
  return {
    '--ink': c.ink,
    '--surface': c.surface,
    '--line': c.line,
    '--line-strong': c.lineStrong,
    '--paper': c.text,
    '--text': c.text,
    '--text-soft': c.soft,
    '--text-muted': c.muted,
    '--accent': accent,
    '--accent-hover': `color-mix(in srgb, ${accent} 82%, ${c.light ? '#000' : '#fff'})`,
    '--on-accent': isLight(accent) ? '#111110' : '#ffffff',
    '--font-display': font.display,
    '--grid-min': `${GRIDS.find((g) => g.value === p.grid).min}px`,
    '--tile-radius': `${corners.radius}px`,
    '--card-radius': `${corners.card}px`,
    '--gap': `${SPACINGS.find((x) => x.value === p.spacing).gap}px`,
  }
}

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

function isLight(hex) {
  return luminance(hex) > 0.4
}

/** Links de contato montados só a partir de valores limpos (nunca uma URL digitada). */
export function contactLinks(rawPage) {
  const p = normalizePage(rawPage)
  const links = []
  if (p.whatsapp.length >= 10) {
    const number = p.whatsapp.length <= 11 ? `55${p.whatsapp}` : p.whatsapp
    links.push({ kind: 'whatsapp', label: 'WhatsApp', icon: 'chat', href: `https://wa.me/${number}` })
  }
  if (p.instagram) links.push({ kind: 'instagram', label: `@${p.instagram}`, icon: 'instagram', href: `https://instagram.com/${p.instagram}` })
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) links.push({ kind: 'email', label: 'E-mail', icon: 'mail', href: `mailto:${p.email}` })
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
