import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PremiumStickers } from "@/components/premium-stickers"
import { SiteHeader } from "@/components/site-header"

export default function StickersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Premium Stickers Collection
              </h1>
              <p className="text-xl text-white/70 mb-8">
                Enhance your boards with our collection of colorful and fun stickers. 10 free stickers available for all
                users, with the full collection exclusive to Premium accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Stickers Gallery */}
        <section className="w-full py-12 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <PremiumStickers />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Upgrade to Premium Today
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Get access to our full collection of premium stickers and many more features to enhance your
                productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
                  <Link href="/auth?plan=premium">Upgrade Now</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/10 py-6 bg-[#1a0b2e]">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm text-white/60 md:text-left">© 2024 MiniKanban. All rights reserved.</p>
          <div className="flex gap-4">
            <Link
              href="/terms"
              className="text-sm text-white/60 underline-offset-4 hover:text-pink-400 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-white/60 underline-offset-4 hover:text-pink-400 transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
