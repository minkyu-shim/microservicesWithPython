import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { authApi, type MeResponse } from '../api/auth'
import { setTokenGetter } from '../api/client'

const TOKEN_STORAGE_KEY = 'gamehub_token'

interface AuthContextValue {
  token: string | null
  me: MeResponse | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_STORAGE_KEY)
  )
  const [me, setMe] = useState<MeResponse | null>(null)

  // Wire the client's token getter once on mount so all API calls carry the
  // current token without a circular import between the client and this context.
  useEffect(() => {
    setTokenGetter(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  }, [])

  // On mount, validate any persisted token. Clear storage on 401.
  useEffect(() => {
    if (!token) return

    authApi.me()
      .then(setMe)
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken(null)
        setMe(null)
      })
  // Only run once — token from initial localStorage read
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { access_token } = await authApi.login(username, password)
    localStorage.setItem(TOKEN_STORAGE_KEY, access_token)
    setToken(access_token)
    const profile = await authApi.me()
    setMe(profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setMe(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ token, me, isAuthenticated: me !== null, login, logout }),
    [token, me, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
