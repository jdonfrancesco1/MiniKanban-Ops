"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type OpsUser = {
  uid: string
  phoneNumber: string | null
  displayName?: string | null
  tenantId?: string
}

type AuthContextType = {
  user: OpsUser | null
  loading: boolean
  gateEnabled: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  gateEnabled: false,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OpsUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [gateEnabled, setGateEnabled] = useState(false)

  const refresh = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      const data = await response.json()
      setGateEnabled(Boolean(data.gateEnabled))
      setUser(data.authenticated ? data.user : null)
    } catch (error) {
      console.error("Failed to load auth state", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    window.location.href = "/auth"
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, gateEnabled, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
export const useAuth = useAuthContext
