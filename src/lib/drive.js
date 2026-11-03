// Conexão com o Google Drive do fotógrafo e upload direto do navegador para o Drive.
import { call } from './firebase.js'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

let gisPromise
function loadGoogleIdentity() {
  gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Não foi possível carregar o login do Google.'))
    document.head.appendChild(s)
  })
  return gisPromise
}

/**
 * Abre o popup do Google pedindo acesso ao Drive.
 * O código de autorização vai para a função connectDrive, que guarda o
 * refresh token no servidor e cria a pasta "Fotly".
 * Chame a partir de um clique (navegadores bloqueiam popups fora de cliques).
 */
export async function connectDrive() {
  await loadGoogleIdentity()
  const code = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      ux_mode: 'popup',
      callback: (r) => (r.error ? reject(new Error(r.error)) : resolve(r.code)),
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Janela fechada.' : 'Falha no login.')),
    })
    client.requestCode()
  })
  const { data } = await call('connectDrive')({ code })
  cached = null
  return data // { folderId }
}

export async function disconnectDrive() {
  await call('disconnectDrive')()
  cached = null
}

// Access token curto, renovado pelo servidor quando vence
let cached = null
export async function getDriveToken() {
  if (cached && cached.exp > Date.now()) return cached
  const { data } = await call('driveAccessToken')()
  cached = { ...data, exp: Date.now() + 50 * 60 * 1000 }
  return cached // { accessToken, folderId }
}

/** Cria uma subpasta dentro de "Fotly" para o álbum. Retorna o id da pasta. */
export async function createAlbumFolder(name) {
  const { accessToken, folderId } = await getDriveToken()
  if (!folderId) throw new Error('Conecte o Google Drive primeiro.')
  const res = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.slice(0, 200),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folderId],
    }),
  })
  if (!res.ok) throw new Error(`Não foi possível criar a pasta no Drive (${res.status}).`)
  return (await res.json()).id
}

/**
 * Envia um arquivo para o Drive em modo "resumable" (bom para arquivos grandes),
 * com progresso de 0 a 1 em onProgress.
 * Retorna { id, name, mimeType, size }.
 */
export async function uploadToDrive(file, parentId, onProgress) {
  const { accessToken } = await getDriveToken()
  const type = file.type || 'application/octet-stream'

  const init = await fetch(`${UPLOAD_API}/files?uploadType=resumable&fields=id,name,mimeType,size`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': type,
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify({ name: file.name, parents: [parentId] }),
  })
  if (!init.ok) throw new Error(`O Drive recusou o envio (${init.status}).`)
  const sessionUrl = init.headers.get('Location')
  if (!sessionUrl) throw new Error('Não foi possível iniciar o envio para o Drive.')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', sessionUrl)
    xhr.setRequestHeader('Content-Type', type)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(`Falha no envio para o Drive (${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Conexão perdida durante o envio.'))
    xhr.send(file)
  })
}
