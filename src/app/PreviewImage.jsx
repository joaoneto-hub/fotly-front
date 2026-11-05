import { useState } from 'react'
import { usePreviewUrl } from './usePreviewUrl.js'

/**
 * Prévia com marca d'água vinda do Storage.
 * Mostra um brilho animado enquanto carrega e entra com fade.
 * ratio: número (1 = quadrado) ou 'auto' para usar o formato real da foto.
 */
export default function PreviewImage({ path, alt, ratio = 1, width, height, className = '' }) {
  const url = usePreviewUrl(path)
  const [loaded, setLoaded] = useState(false)
  const aspect = ratio === 'auto' ? (width && height ? width / height : 4 / 3) : ratio
  return (
    <div className={`preview ${loaded ? '' : 'is-loading'} ${className}`} style={{ aspectRatio: aspect }}>
      {url && (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={loaded ? 'is-loaded' : ''}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}
    </div>
  )
}
