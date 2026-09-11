"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, gateEnabled } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && gateEnabled && !user) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, gateEnabled, router, pathname])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>
  }

  if (gateEnabled && !user) {
    return null
  }

  return <>{children}</>
}
