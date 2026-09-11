import type React from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { UndoProvider } from "@/hooks/use-undo"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import "./stickers.css"
import "./react-quill.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="bg-[#1a0b2e]">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <UndoProvider>
              {children}
              <Toaster />
            </UndoProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "MiniKanban Ops",
  description: "James ↔ Grok Bot (Orca) ops board",
}
