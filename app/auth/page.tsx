import { Suspense } from "react"
import Link from "next/link"
import { OpsLoginForm } from "@/components/ops-login-form"

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/95">
        <div className="container flex h-14 items-center">
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            MiniKanban Ops
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Private board
            </h1>
            <p className="text-white/70 mt-2">Enter the shared ops secret to continue.</p>
          </div>
          <div className="bg-[#2a1b3e] rounded-lg border border-white/10 p-6 shadow-sm">
            <Suspense fallback={<p className="text-white/70">Loading…</p>}>
              <OpsLoginForm heading="Board secret" />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
