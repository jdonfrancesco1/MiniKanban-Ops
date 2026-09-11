"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

export function OpsLoginForm({ heading = "Open the ops board" }: { heading?: string }) {
  const [secret, setSecret] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { gateEnabled, refresh, loading, user } = useAuth()

  const nextPath = searchParams.get("next") || "/boards/ops"

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || "Could not sign in")
        return
      }
      await refresh()
      router.push(nextPath)
      router.refresh()
    } catch {
      setError("Could not sign in")
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return <p className="text-white/70">Checking session…</p>
  }

  if (user) {
    return (
      <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white" onClick={() => router.push("/boards/ops")}>
        Open ops board
      </Button>
    )
  }

  if (!gateEnabled) {
    return (
      <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white" onClick={() => router.push("/boards/ops")}>
        Open ops board
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ops-secret" className="text-white">
          {heading}
        </Label>
        <Input
          id="ops-secret"
          type="password"
          autoComplete="current-password"
          placeholder="OPS_BOARD_SECRET"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white" disabled={isLoading}>
        {isLoading ? "Opening…" : "Enter"}
      </Button>
    </form>
  )
}
