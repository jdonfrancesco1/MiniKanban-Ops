"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a0b2e]/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              MiniKanban
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <nav className="hidden md:flex items-center space-x-2">
            <Button
              variant="ghost"
              className={`text-white/70 hover:text-white hover:bg-white/10 ${pathname === "/about" ? "text-white bg-white/10" : ""}`}
              asChild
            >
              <Link href="/about">About</Link>
            </Button>
            <Button
              variant="ghost"
              className={`text-white/70 hover:text-white hover:bg-white/10 ${pathname === "/features" ? "text-white bg-white/10" : ""}`}
              asChild
            >
              <Link href="/features">Features</Link>
            </Button>
            <Button
              variant="ghost"
              className={`text-white/70 hover:text-white hover:bg-white/10 ${pathname === "/pricing" ? "text-white bg-white/10" : ""}`}
              asChild
            >
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button
              variant="ghost"
              className={`text-white/70 hover:text-white hover:bg-white/10 ${pathname === "/stickers" ? "text-white bg-white/10" : ""}`}
              asChild
            >
              <Link href="/stickers">Stickers</Link>
            </Button>
          </nav>
          <Button className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
            <Link href="/auth">Get Started</Link>
          </Button>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#2a1b3e] border-white/10 text-white">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/about"
                    className={`px-4 py-2 rounded-md ${pathname === "/about" ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    About
                  </Link>
                  <Link
                    href="/features"
                    className={`px-4 py-2 rounded-md ${pathname === "/features" ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    Features
                  </Link>
                  <Link
                    href="/pricing"
                    className={`px-4 py-2 rounded-md ${pathname === "/pricing" ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/stickers"
                    className={`px-4 py-2 rounded-md ${pathname === "/stickers" ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    Stickers
                  </Link>
                  <Link href="/auth" className="px-4 py-2 rounded-md bg-pink-500 hover:bg-pink-600 text-center">
                    Get Started
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
