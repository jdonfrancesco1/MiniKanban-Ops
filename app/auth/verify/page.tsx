"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, Loader2 } from "lucide-react"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const isTestNumber = searchParams.get("test") === "true"
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  // Cleanup function for timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a timeout to handle cases where Firebase operations hang
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false)
        setError("The operation timed out. Please check your internet connection and try again.")
      }
    }, 30000) // 30 second timeout

    try {
      // Get the verification ID from session storage
      const storedData = sessionStorage.getItem("confirmationResult")
      if (!storedData) {
        throw new Error("Verification session expired. Please try again.")
      }

      const { verificationId } = JSON.parse(storedData)

      // Create credential with the verification ID and code
      const credential = PhoneAuthProvider.credential(verificationId, code)

      // Sign in with the credential with timeout handling
      await Promise.race([
        signInWithCredential(auth, credential),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Verification timed out")), 25000)
        }),
      ])

      // Clear timeout since operation succeeded
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Clear session storage
      sessionStorage.removeItem("confirmationResult")

      // Navigate to boards page
      router.push("/boards")

      toast({
        title: "Verification successful",
        description: "You have been successfully signed in",
      })
    } catch (err: any) {
      console.error("Error verifying code:", err)

      // Clear timeout since we caught the error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Handle specific timeout errors
      if (err.message === "Verification timed out") {
        setError("The verification process timed out. Please check your internet connection and try again.")
      }
      // Handle other Firebase errors
      else if (err.code === "auth/invalid-verification-code") {
        setError("The verification code is invalid. Please check and try again.")
      } else if (err.code === "auth/code-expired") {
        setError("The verification code has expired. Please request a new code.")
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.")
      } else {
        setError(err.message || "Invalid verification code. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    // Navigate back to the phone input page to restart the process
    router.push("/auth")

    toast({
      title: "Resend code",
      description: "Please enter your phone number again to receive a new code",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl">MiniKanban</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Verify Your Phone</h1>
            <p className="text-muted-foreground mt-2">
              {isTestNumber
                ? "Enter the test verification code from Firebase console"
                : `We sent a verification code to ${phone}`}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            {isTestNumber && (
              <Alert className="bg-blue-50 text-blue-800 border-blue-200 mb-4">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle>Test Number</AlertTitle>
                <AlertDescription>
                  This is a Firebase test phone number. Use the verification code you configured in the Firebase
                  console.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg"
                />
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Didn't receive a code?{" "}
                {timeLeft > 0 ? (
                  <span>Resend in {timeLeft}s</span>
                ) : (
                  <Button variant="link" className="p-0 h-auto" onClick={resendCode}>
                    Resend Code
                  </Button>
                )}
              </p>
            </div>
          </div>
          <div className="text-center">
            <Button variant="ghost" asChild>
              <Link href="/auth">Use a different phone number</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
