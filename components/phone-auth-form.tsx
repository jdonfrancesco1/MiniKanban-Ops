"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info, Loader2 } from "lucide-react"

export function PhoneAuthForm() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isTestNumber, setIsTestNumber] = useState(false)
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  // Cleanup function for timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Clean up reCAPTCHA on unmount
      if ((window as any).recaptchaVerifier) {
        try {
          ;(window as any).recaptchaVerifier.clear()
          delete (window as any).recaptchaVerifier
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e)
        }
      }
    }
  }, [])

  // Check if the number is a test number
  const checkIfTestNumber = (number: string) => {
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, "")

    // Check if it matches the test number
    return cleanNumber === "16124176360"
  }

  // Initialize reCAPTCHA verifier with better error handling
  const setupRecaptcha = () => {
    try {
      // Clear existing reCAPTCHA if it exists
      if ((window as any).recaptchaVerifier) {
        try {
          ;(window as any).recaptchaVerifier.clear()
        } catch (e) {
          console.error("Error clearing existing reCAPTCHA:", e)
        }
      }

      setRecaptchaReady(false)

      // Create new reCAPTCHA verifier with explicit container reference
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container not found")
      }
      ;(window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA verified")
          setRecaptchaReady(true)
        },
        "expired-callback": () => {
          console.log("reCAPTCHA expired")
          setError("reCAPTCHA verification expired. Please try again.")
          setIsLoading(false)
        },
        "error-callback": (error: any) => {
          console.error("reCAPTCHA error:", error)
          setError(`reCAPTCHA error: ${error.message || "Unknown error"}`)
          setIsLoading(false)
        },
      })

      // Force reCAPTCHA to render
      ;(window as any).recaptchaVerifier
        .render()
        .then(() => {
          console.log("reCAPTCHA rendered successfully")
        })
        .catch((error: any) => {
          console.error("Error rendering reCAPTCHA:", error)
          setError(`Error rendering reCAPTCHA: ${error.message || "Unknown error"}`)
          setIsLoading(false)
        })

      return (window as any).recaptchaVerifier
    } catch (err: any) {
      console.error("Error setting up reCAPTCHA:", err)
      setError(`Error setting up verification: ${err.message}`)
      setIsLoading(false)
      return null
    }
  }

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

        // Clean up reCAPTCHA
        if ((window as any).recaptchaVerifier) {
          try {
            ;(window as any).recaptchaVerifier.clear()
            delete (window as any).recaptchaVerifier
          } catch (e) {
            console.error("Error clearing reCAPTCHA after timeout:", e)
          }
        }
      }
    }, 30000) // 30 second timeout

    // Basic validation
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      setIsLoading(false)
      clearTimeout(timeoutRef.current)
      return
    }

    // Format phone number to E.164 format if not already
    let formattedPhone = phoneNumber
    if (!phoneNumber.startsWith("+")) {
      formattedPhone = `+${phoneNumber}`
    }

    // Check if this is a test number
    const isTestNum = checkIfTestNumber(formattedPhone)
    setIsTestNumber(isTestNum)

    if (isTestNum) {
      toast({
        title: "Test Number Detected",
        description: "Using Firebase test verification flow",
      })
    }

    try {
      // Set up reCAPTCHA with better error handling
      const appVerifier = setupRecaptcha()
      if (!appVerifier) {
        throw new Error("Failed to set up verification. Please refresh and try again.")
      }

      // Send verification code via Firebase with timeout handling
      const confirmationResult = await Promise.race([
        signInWithPhoneNumber(auth, formattedPhone, appVerifier),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Phone verification timed out")), 25000)
        }),
      ])

      // Store the confirmation result in session storage to use it on the verification page
      sessionStorage.setItem(
        "confirmationResult",
        JSON.stringify({
          verificationId: confirmationResult.verificationId,
        }),
      )

      // Clear timeout since operation succeeded
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Navigate to verification page
      router.push(`/auth/verify?phone=${encodeURIComponent(formattedPhone)}&test=${isTestNum}`)

      toast({
        title: "Verification code sent",
        description: isTestNum
          ? "Using test verification code from Firebase console"
          : "Please check your phone for the verification code",
      })
    } catch (err: any) {
      console.error("Error sending verification code:", err)

      // Clear timeout since we caught the error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Handle specific timeout errors
      if (err.message === "Phone verification timed out") {
        setError("The verification process timed out. Please check your internet connection and try again.")
      }
      // Handle other Firebase errors
      else if (err.code === "auth/operation-not-allowed") {
        setError("Phone authentication is not enabled in Firebase. Please contact the administrator.")
      } else if (err.code === "auth/invalid-phone-number") {
        setError("The phone number is invalid. Please enter a valid phone number.")
      } else if (err.code === "auth/captcha-check-failed") {
        setError("reCAPTCHA verification failed. Please try again.")
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.")
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please try again later.")
      } else {
        setError(err.message || "Failed to send verification code. Please try again.")
      }

      // Reset reCAPTCHA
      if ((window as any).recaptchaVerifier) {
        try {
          ;(window as any).recaptchaVerifier.clear()
          delete (window as any).recaptchaVerifier
        } catch (e) {
          console.error("Error clearing reCAPTCHA after error:", e)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phoneNumber}
          onChange={(e) => {
            setPhoneNumber(e.target.value)
            setIsTestNumber(checkIfTestNumber(e.target.value))
          }}
          required
        />

        {isTestNumber && (
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle>Test Number Detected</AlertTitle>
            <AlertDescription>
              This number is configured as a test number in Firebase. You'll need to use the test verification code you
              set in the Firebase console.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Get Verification Code"
        )}
      </Button>
      <p className="text-center text-sm text-white/60">We'll send a verification code to your phone</p>
      {/* Invisible reCAPTCHA container with ref */}
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
    </form>
  )
}
