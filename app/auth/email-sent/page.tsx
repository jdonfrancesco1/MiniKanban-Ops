import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function EmailSentPage() {
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
          <div>
            <h1 className="text-3xl font-bold">Check Your Email</h1>
            <p className="text-muted-foreground mt-2">
              We've sent a magic link to your email address. Click the link to sign in.
            </p>
          </div>
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <p className="mb-4">
              The link will expire in 15 minutes. If you don't see the email, check your spam folder.
            </p>
            <Button asChild>
              <Link href="/auth">Back to Sign In</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
