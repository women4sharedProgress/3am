import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authValidate, authSignin, authSensitive, authSignout } from '../lib/authApi'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  username: string
  role:     string
  tier:     number
}

interface AuthContextValue {
  user:           AuthUser | null
  ready:          boolean
  signIn:         (username: string, credential: string, mode: 'passcode' | 'password', remember?: boolean) => Promise<{ ok: boolean; error?: string; locked?: boolean; attempts_remaining?: number }>
  signOut:        () => Promise<void>
  checkSensitive: (password: string) => Promise<boolean>
  refreshUser:    () => Promise<void>
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,  setUser]  = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  // Validate session on every page load.
  // No token to read — the browser sends the httpOnly cookie automatically.
  useEffect(() => {
    authValidate()
      .then(res => {
        if (res.ok) {
          localStorage.setItem('wsp-current-user', res.username)
          if (res.district_info) {
            localStorage.setItem(`wsp-profile-${res.username}`, JSON.stringify(res.district_info))
          }
          setUser({ username: res.username, role: res.role, tier: res.tier })
        }
        setReady(true)
      })
      .catch(() => {
        // Network failure — treat as logged out
        setReady(true)
      })
  }, [])

  const signIn = useCallback(async (
    username:   string,
    credential: string,
    mode:       'passcode' | 'password',
    remember    = true,
  ) => {
    const res = await authSignin(username, credential, mode, remember)
    if (!res.ok) return res
    localStorage.setItem('wsp-current-user', username)
    if (res.district_info) {
      localStorage.setItem(`wsp-profile-${username}`, JSON.stringify(res.district_info))
    }
    setUser({ username, role: res.role, tier: res.tier })
    return { ok: true as const }
  }, [])

  const signOut = useCallback(async () => {
    await authSignout().catch(() => {})
    localStorage.removeItem('wsp-current-user')
    setUser(null)
  }, [])

  const checkSensitive = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false
    // Cookie is sent automatically; only username + password go in the body
    const res = await authSensitive(user.username, password)
    return res.ok === true
  }, [user])

  const refreshUser = useCallback(async () => {
    const res = await authValidate()
    if (res.ok) {
      localStorage.setItem('wsp-current-user', res.username)
      if (res.district_info) {
        localStorage.setItem(`wsp-profile-${res.username}`, JSON.stringify(res.district_info))
      }
      setUser({ username: res.username, role: res.role, tier: res.tier })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, checkSensitive, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
