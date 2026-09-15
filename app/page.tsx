import { Suspense } from "react"
import Link from "next/link"
import { OpsLoginForm } from "@/components/ops-login-form"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6 max-w-3xl">
            <div className="space-y-4 mb-10">
              <p className="text-sm uppercase tracking-[0.2em] text-pink-300">James ↔ Grok Bot (Orca)</p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                MiniKanban Ops
              </h1>
              <p className="text-white/70 text-lg max-w-xl">
                Private work board. Columns: Need you, I&apos;m on, Waiting, Done. Neon + Drizzle — no Firebase.
              </p>
            </div>
            <div className="max-w-md rounded-lg border border-white/10 bg-[#2a1b3e] p-6">
              <Suspense fallback={<p className="text-white/70">Loading…</p>}>
                <OpsLoginForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-white/10 py-6">
        <div className="container text-sm text-white/50">
          Ops board for chat work.{" "}
          <Link href="/boards/ops" className="text-pink-400 hover:text-pink-300">
            Deep link
          </Link>
          {" · "}
          <Link href="/connect" className="text-pink-400 hover:text-pink-300">
            MCP
          </Link>
        </div>
      </footer>
    </div>
  )
}
