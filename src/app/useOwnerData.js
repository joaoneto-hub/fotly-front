import { useCallback, useEffect, useState } from 'react'
import { myAlbums } from '../lib/albums.js'
import { albumSummaries, myOrders } from '../lib/stats.js'
import { errorMessage } from './ui.jsx'
import { useToast } from './toast.jsx'

/** Carrega uma lista do fotógrafo logado. null = carregando. */
function useOwnerList(load, what) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    load()
      .then((d) => alive && setData(d))
      .catch((e) => {
        console.error(e)
        if (!alive) return
        setData([])
        toast.error(`Não foi possível carregar ${what}`, { description: errorMessage(e) })
      })
    return () => {
      alive = false
    }
  }, [load, what, toast, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return [data, reload]
}

const loadAlbums = () => myAlbums().then(albumSummaries)

/** Álbuns com contagem de itens e capa. */
export const useAlbums = () => useOwnerList(loadAlbums, 'os álbuns')

/** Pedidos, mais recentes primeiro. */
export const useOrders = () => useOwnerList(myOrders, 'os pedidos')
