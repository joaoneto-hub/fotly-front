import { useEffect, useState } from 'react'
import { previewUrl } from '../lib/checkout.js'

const cache = new Map()

/** Resolve o caminho da prévia no Storage para uma URL (com cache em memória). */
export function usePreviewUrl(path) {
  const [url, setUrl] = useState(() => (path ? cache.get(path) ?? null : null))

  useEffect(() => {
    if (!path) return
    if (cache.has(path)) {
      setUrl(cache.get(path))
      return
    }
    let alive = true
    previewUrl(path)
      .then((u) => {
        cache.set(path, u)
        if (alive) setUrl(u)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [path])

  return url
}
