"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { isPreviewEnvironment } from "@/lib/environment"

type User = {
  uid: string
  phoneNumber: string | null
  displayName?: string | null
}

type AuthContextType = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In preview mode, always provide a mock user
    if (isPreviewEnvironment()) {
      setUser({
        uid: "mock-user-id",
        phoneNumber: "+1234567890",
        displayName: "Preview User",
      })
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
          displayName: firebaseUser.displayName,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}

// Keep the original useAuth as an alias for backward compatibility
export const useAuth = useAuthContext
