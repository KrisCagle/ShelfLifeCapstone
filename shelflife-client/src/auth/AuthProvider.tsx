import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, request } from '@/lib/api'
import { keys } from '@/hooks/queries'
import type { Me, RegisterInput } from '@/lib/types'

interface AuthContextValue {
  user: Me | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// 401 and 404 both mean "not signed in" (404: signed in but the profile is gone).
async function fetchMe(): Promise<Me | null> {
  try {
    return await api.get<Me>('/auth/me')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null
    throw error
  }
}

// Shared data (lookups, news) survives a sign-in change; per-user data doesn't.
const isUserData = (key: readonly unknown[]) => key[0] !== 'lookup' && key[0] !== 'news'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: keys.me, queryFn: fetchMe, staleTime: 5 * 60_000 })

  // Drop the previous user's cached data, but update "me" in place: removing a query
  // that a component is still observing would leave that component on stale data.
  const startSession = async () => {
    queryClient.removeQueries({ predicate: (q) => isUserData(q.queryKey) && q.queryKey[0] !== 'me' })
    queryClient.setQueryData(keys.me, await fetchMe())
  }

  const login = async (email: string, password: string) => {
    try {
      await request('/auth/login', {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${email}:${password}`)}` },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        throw new ApiError(401, 'That email and password don’t match.')
      throw error
    }
    await startSession()
  }

  const register = async (input: RegisterInput) => {
    await api.post('/auth/register', { ...input, password: btoa(input.password) })
    await startSession()
  }

  const logout = async () => {
    await api.post('/auth/logout')
    queryClient.removeQueries({ predicate: (q) => isUserData(q.queryKey) && q.queryKey[0] !== 'me' })
    queryClient.setQueryData(keys.me, null)
  }

  return (
    <AuthContext.Provider value={{ user: data ?? null, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
