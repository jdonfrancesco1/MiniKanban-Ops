import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PhoneAuthForm } from "@/components/phone-auth-form"
import { HeroImage } from "@/components/hero-image"
import { PhoneAuthImage } from "@/components/phone-auth-image"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    Fast, Easy Kanban Boards
                  </h1>
                  <p className="max-w-[600px] text-white/70 md:text-xl">
                    Create, manage, and share boards instantly—no sign-up required. Organize tasks with our intuitive
                    drag-and-drop interface.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
                    <Link href="/auth">Get Started</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                    <Link href="/demo">Try Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <HeroImage />
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Key Features
                </h2>
                <p className="max-w-[900px] text-white/70 md:text-xl">
                  Everything you need to organize tasks and collaborate with your team
                </p>
              </div>
              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-3xl text-white">
                    ✨
                  </div>
                  <h3 className="text-xl font-bold text-white">Drag-and-Drop</h3>
                  <p className="text-white/70">Intuitive interface for moving tasks between columns</p>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-3xl text-white">
                    🔗
                  </div>
                  <h3 className="text-xl font-bold text-white">Instant Sharing</h3>
                  <p className="text-white/70">Share boards with a unique link via text message</p>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-3xl text-white">
                    🎨
                  </div>
                  <h3 className="text-xl font-bold text-white">Customizable</h3>
                  <p className="text-white/70">Personalize with themes, stickers, and emojis</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    Get Started in Seconds
                  </h2>
                  <p className="max-w-[600px] text-white/70 md:text-xl">
                    Enter your phone number, receive a magic link, and start organizing your tasks right away.
                  </p>
                </div>
                <PhoneAuthForm />
              </div>
              <div className="flex items-center justify-center">
                <PhoneAuthImage />
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
