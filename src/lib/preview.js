// Gera, no navegador do fotógrafo, a prévia em JPEG com marca d'água.
// O original nunca sai do Drive; só esta prévia vai para o Firebase Storage.

/**
 * @param {File} file foto (jpg, png, webp) ou vídeo (mp4, mov, webm)
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function makePreview(file, { maxSize = 1600, watermark = 'FOTLY', quality = 0.82 } = {}) {
  const source = file.type.startsWith('video/')
    ? await videoFrame(file)
    : await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
        throw new Error(`Formato sem prévia no navegador: ${file.name}. Envie JPG, PNG ou WEBP.`)
      })

  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0, w, h)
  source.close?.()

  drawWatermark(ctx, w, h, watermark)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Não foi possível gerar a prévia.')
  return { blob, width: w, height: h }
}

/** Texto repetido em diagonal: difícil de recortar, sem esconder a foto. */
function drawWatermark(ctx, w, h, text) {
  const size = Math.max(18, Math.round(Math.min(w, h) / 14))
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 6)
  ctx.font = `800 ${size}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)'
  ctx.lineWidth = Math.max(1, size / 18)

  const stepX = ctx.measureText(text).width + size * 2
  const stepY = size * 3
  const span = Math.hypot(w, h)
  for (let y = -span; y < span; y += stepY) {
    const offset = (Math.round(y / stepY) % 2) * (stepX / 2)
    for (let x = -span; x < span; x += stepX) {
      ctx.strokeText(text, x + offset, y)
      ctx.fillText(text, x + offset, y)
    }
  }
  ctx.restore()
}

/** Captura um quadro do vídeo para servir de capa. */
async function videoFrame(file, at = 1) {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = () => reject(new Error(`Vídeo sem prévia no navegador: ${file.name}`))
    })
    video.currentTime = Math.min(at, (video.duration || at * 2) / 2)
    await new Promise((resolve) => (video.onseeked = resolve))
    return await createImageBitmap(video)
  } finally {
    URL.revokeObjectURL(url)
  }
}
