import { useState } from 'react'
import { usePreviewUrl } from './usePreviewUrl.js'

/** Prévia com marca d'água vinda do Storage, com fade ao carregar. */
export default function PreviewImage({ path, alt, ratio = 1 }) {
  const url = usePreviewUrl(path)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="preview" style={{ aspectRatio: ratio }}>
      {url && (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className={loaded ? 'is-loaded' : ''}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}
    </div>
  )
}
