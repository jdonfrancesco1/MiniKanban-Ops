import { PhoneAuthForm } from "@/components/phone-auth-form"
import Link from "next/link"

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a0b2e]/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                MiniKanban
              </span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Get Started
            </h1>
            <p className="text-white/70 mt-2">Enter your phone number to receive a magic link</p>
          </div>
          <div className="bg-[#2a1b3e] rounded-lg border border-white/10 p-6 shadow-sm">
            <PhoneAuthForm />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/60">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-pink-400 underline underline-offset-4 hover:text-pink-300">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-pink-400 underline underline-offset-4 hover:text-pink-300">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
