"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { sendSignInLinkToEmail } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export function EmailAuthForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Basic validation
    if (!email.trim()) {
      setError("Please enter an email address")
      setIsLoading(false)
      return
    }

    try {
      // Configure ActionCodeSettings
      const actionCodeSettings = {
        // URL you want to redirect to after email verification
        url: `${window.location.origin}/auth/email-verify`,
        // This must be true
        handleCodeInApp: true,
      }

      // Send sign-in link to email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)

      // Save the email locally to remember the user when they open the link
      window.localStorage.setItem("emailForSignIn", email)

      toast({
        title: "Magic link sent",
        description: "Please check your email for the magic link",
      })

      // Navigate to a confirmation page
      router.push("/auth/email-sent")
    } catch (err: any) {
      console.error("Error sending email link:", err)
      setError(err.message || "Failed to send magic link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Get Magic Link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">We'll send a magic link to your email</p>
    </form>
  )
}
