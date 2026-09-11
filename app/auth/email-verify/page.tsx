"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function EmailVerifyPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function handleEmailLink() {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem("emailForSignIn")

        if (!email) {
          // User opened the link on a different device
          email = window.prompt("Please provide your email for confirmation")
        }

        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href)

            // Clear email from storage
            window.localStorage.removeItem("emailForSignIn")

            toast({
              title: "Sign in successful",
              description: "You have been successfully signed in",
            })

            // Redirect to boards page
            router.push("/boards")
          } catch (err: any) {
            console.error("Error signing in with email link:", err)
            setError(err.message || "Failed to sign in. The link may have expired.")
            setIsLoading(false)
          }
        } else {
          setError("No email provided for verification")
          setIsLoading(false)
        }
      } else {
        setError("Invalid magic link")
        setIsLoading(false)
      }
    }

    handleEmailLink()
  }, [router, toast])

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
        <div className="w-full max-w-md space-y-8 text-center">
          {isLoading ? (
            <div>
              <h1 className="text-3xl font-bold">Verifying...</h1>
              <p className="text-muted-foreground mt-2">Please wait while we verify your email.</p>
            </div>
          ) : error ? (
            <div>
              <h1 className="text-3xl font-bold">Verification Failed</h1>
              <p className="text-destructive mt-2">{error}</p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/auth">Try Again</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
