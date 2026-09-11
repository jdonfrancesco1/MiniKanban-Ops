import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FeatureCard } from "@/components/feature-card"
import { FeatureShowcase } from "@/components/feature-showcase"
import { SiteHeader } from "@/components/site-header"

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Powerful Features, Simple Interface
              </h1>
              <p className="text-xl text-white/70 mb-8">
                MiniKanban combines powerful project management capabilities with an intuitive interface that anyone can
                use.
              </p>
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="w-full py-12 md:py-16 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Core Features
              </h2>
              <p className="text-white/70 mt-2">The essential tools that make MiniKanban powerful</p>
            </div>

            <FeatureShowcase
              title="Drag-and-Drop Interface"
              description="Organize tasks effortlessly by dragging and dropping cards between columns. Our intuitive interface makes project management feel natural and efficient."
              imagePosition="right"
              featureType="drag-and-drop"
            />

            <FeatureShowcase
              title="Instant Sharing"
              description="Share your board with anyone using a unique link. No complicated permissions or setup required—just share and start collaborating immediately."
              imagePosition="left"
              featureType="instant-sharing"
            />

            <FeatureShowcase
              title="Real-time Collaboration"
              description="See changes as they happen. When collaborators move tasks or add content, updates appear instantly for everyone viewing the board."
              imagePosition="right"
              featureType="real-time"
            />
          </div>
        </section>

        {/* Easy Access Section */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Easy Access
              </h2>
              <p className="text-white/70 mt-2">Start using MiniKanban in seconds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard
                icon="phone"
                title="No Login Required"
                description="Skip the traditional sign-up process. No usernames or passwords to remember—just enter your phone number and get started."
              />
              <FeatureCard
                icon="link"
                title="Magic Link Authentication"
                description="Receive a secure magic link via SMS that gives you instant access to your boards. Simple, secure, and hassle-free."
              />
            </div>
          </div>
        </section>

        {/* Collaboration Tools Section */}
        <section className="w-full py-12 md:py-16 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Collaboration Tools
              </h2>
              <p className="text-white/70 mt-2">Work together seamlessly with your team</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon="users"
                title="User Presence"
                description="See who's currently viewing the board with real-time presence indicators. Know when teammates are actively collaborating."
              />
              <FeatureCard
                icon="message-square"
                title="Chat Feature"
                description="Communicate in real-time with board-specific chat. Discuss tasks, share updates, and coordinate without leaving the app."
              />
              <FeatureCard
                icon="shield"
                title="Permissions Control"
                description="Set access levels for collaborators. Choose between edit access or view-only permissions for each shared board."
              />
            </div>
          </div>
        </section>

        {/* Customization Section */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Personalization & Customization
              </h2>
              <p className="text-white/70 mt-2">Make your boards uniquely yours</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon="tag"
                title="Task Status Stickers"
                description="Add visual markers to indicate task progress, priority, or status. Make important information instantly recognizable."
              />
              <FeatureCard
                icon="smile"
                title="Motivational Stickers"
                description="Celebrate achievements with fun stickers. Add visual encouragement to boost team morale and mark milestones."
              />
              <FeatureCard
                icon="image"
                title="Custom Stickers"
                description="Upload your own stickers or choose from our library. Personalize your board with images that reflect your team's personality."
              />
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="w-full py-12 md:py-16 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Stay Updated
              </h2>
              <p className="text-white/70 mt-2">Never miss important changes</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <FeatureCard
                icon="bell"
                title="Smart Notifications"
                description="Receive alerts when collaborators make changes to your boards. Get SMS notifications for important updates, ensuring you're always in the loop even when you're away from your device."
                large={true}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Ready to Experience MiniKanban?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Start organizing your projects with our powerful yet simple kanban board.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
                  <Link href="/auth">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link href="/demo">Try Demo</Link>
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
