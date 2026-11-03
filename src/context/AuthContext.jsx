import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'

const AuthContext = createContext(null)

/**
 * user:    undefined = carregando, null = deslogado, objeto = logado
 * profile: undefined = carregando, null = ainda não criou o perfil, objeto = perfil
 * O perfil é escutado em tempo real, então driveConnected atualiza sozinho.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        if (!u) setProfile(null)
      }),
    []
  )

  useEffect(() => {
    if (!user) return
    setProfile(undefined)
    return onSnapshot(
      doc(db, 'photographers', user.uid),
      (snap) => setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => {
        console.error(err)
        setProfile(null)
      }
    )
  }, [user])

  const loading = user === undefined || (user && profile === undefined)

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
