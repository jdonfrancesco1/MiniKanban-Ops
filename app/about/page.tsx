import { SiteHeader } from "@/components/site-header"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e]">
      <SiteHeader />

      <main className="flex-1">
        <div className="container flex flex-col lg:flex-row lg:items-center lg:gap-12 py-8 md:py-12">
          {/* Left panel with image */}
          <div className="lg:w-1/2">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-EXlGgb6zM0QnG3iR2VllSlZdyg6wlp.png"
              alt="Team illustration"
              className="rounded-lg shadow-2xl"
              width={600}
              height={600}
            />
          </div>

          {/* Right panel with content */}
          <div className="lg:w-1/2 mt-8 lg:mt-0 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              About MiniKanban
            </h1>

            <p className="text-xl mb-12 text-white/80">
              MiniKanban was created with a simple mission: to make task organization and team collaboration effortless
              and accessible to everyone.
            </p>

            <div className="grid gap-12">
              <div>
                <h2 className="text-2xl font-semibold mb-3 text-pink-400">Our Story</h2>
                <p className="text-white/70">
                  Born from the frustration of complex project management tools, MiniKanban strips away the unnecessary
                  to deliver what teams actually need - a simple, visual way to organize tasks and collaborate without
                  barriers.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3 text-pink-400">Our Approach</h2>
                <p className="text-white/70">
                  We believe great tools should get out of your way. That's why MiniKanban requires no account creation,
                  no downloads, and no complicated setup. Just create, share, and start organizing instantly.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3 text-pink-400">Our Promise</h2>
                <p className="text-white/70">
                  MiniKanban will always prioritize simplicity, speed, and accessibility. We're committed to making
                  continuous improvements based on user feedback.
                </p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10">
              <p className="text-white/60">
                Have questions or suggestions? We'd love to hear from you at{" "}
                <a href="mailto:hello@minikanban.com" className="text-pink-400 hover:text-pink-300 transition-colors">
                  hello@minikanban.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
