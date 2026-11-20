import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, clearTokens, getTokens, subscribeSession } from '../lib/api'
import type { PendingRegistrationResponse, RegisterPayload, SessionUser } from '../types'

interface AuthContextValue {
  /** Usuario autenticado o null si no hay sesión. */
  user: SessionUser | null
  /** true mientras se restaura la sesión al cargar la app. */
  ready: boolean
  login: (identifier: string, password: string) => Promise<SessionUser>
  register: (payload: RegisterPayload) => Promise<PendingRegistrationResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Proveedor de sesión: restaura tokens, renueva ante 401 y cierra sesión. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Si el refresh falla, el cliente limpia los tokens y avisa aquí.
    const unsubscribe = subscribeSession((tokens) => {
      if (!tokens && !cancelled) setUser(null)
    })

    if (getTokens()) {
      api
        .me()
        .then((current) => {
          if (!cancelled) setUser(current)
        })
        .catch(() => {
          if (!cancelled) setUser(null)
        })
        .finally(() => {
          if (!cancelled) setReady(true)
        })
    } else {
      setReady(true)
    }

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const auth = await api.login(identifier, password)
    setUser(auth.user)
    // /auth/login devuelve UserPublic; /users/me completa email y estado.
    void api.me().then(setUser).catch(() => undefined)
    return auth.user
  }, [])

  const register = useCallback((payload: RegisterPayload) => api.register(payload), [])

  const logout = useCallback(async () => {
    const refreshToken = getTokens()?.refresh_token
    clearTokens()
    setUser(null)
    if (refreshToken) {
      try {
        await api.logout(refreshToken)
      } catch {
        // El token local ya se borró; un fallo remoto no debe bloquear la salida.
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook de acceso a la sesión. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
