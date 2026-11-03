// Inicialização do Firebase no front. Copie a pasta web/ para src/lib/ do app React.
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!config.apiKey || !config.projectId) {
  const err = new Error('Firebase não configurado. Copie .env.example para .env e preencha os valores do seu projeto.')
  err.code = 'fotly/missing-config'
  throw err
}

export const app = initializeApp(config)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// Mesma região das Cloud Functions
export const functions = getFunctions(app, 'southamerica-east1')

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

/** Atalho para chamar uma Cloud Function do tipo onCall. */
export const call = (name) => httpsCallable(functions, name)
