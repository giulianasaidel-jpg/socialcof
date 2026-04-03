import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, clearTokens, getAccessToken, setTokens } from '../lib/api'

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'user'
  allowedInstagramAccountIds: string[]
}

type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Gerencia autenticação: carrega usuário do token salvo, expõe login/logout.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('socialcof-refresh-token')
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {}
    clearTokens()
    setUser(null)
  }, [])

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false)
      return
    }
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const handle = () => setUser(null)
    window.addEventListener('auth:logout', handle)
    return () => window.removeEventListener('auth:logout', handle)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', { email, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await api.post<LoginResponse>('/auth/google', { idToken })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Acessa o contexto de autenticação.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
